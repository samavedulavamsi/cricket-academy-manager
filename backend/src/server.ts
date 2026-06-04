import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { authenticate, clearSessionCookie, requireAuth, requireCoach, setSessionCookie } from "./lib/auth.js";
import { prisma } from "./lib/prisma.js";
import { attendanceSchema, googleFormPlayerSchema, loginSchema, playerSchema } from "./lib/validations.js";
import { hashPassword } from "./lib/password.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";

type ReportPlayer = {
  playerCode: string;
  fullName: string;
  playingRole: string;
  skillLevel: string;
  feePayments: Array<{ status: string }>;
  performanceStats: Array<{ runsScored: number; wickets: number }>;
};

app.use(helmet());
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (_request, response) => response.json({ ok: true }));

app.post("/api/auth/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "Invalid payload" });
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return response.status(401).json({ error: "Invalid email or password" });
  setSessionCookie(response, user);
  response.json({ user });
});

app.post("/api/auth/logout", (_request, response) => {
  clearSessionCookie(response);
  response.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (request, response) => response.json({ user: request.user }));

app.get("/api/dashboard", requireAuth, async (_request, response) => {
  const today = new Date("2026-06-03");
  const playerId = _request.user?.playerId ?? undefined;
  const playerWhere = playerId ? { id: playerId } : undefined;
  const attendanceWhere = playerId ? { date: today, playerId } : { date: today };
  const linkedWhere = playerId ? { playerId } : undefined;
  const [players, attendance, fees, stats] = await Promise.all([
    prisma.player.findMany({ where: playerWhere, orderBy: { fullName: "asc" } }),
    prisma.attendance.findMany({ where: attendanceWhere, include: { player: true } }),
    prisma.feePayment.findMany({ where: linkedWhere, include: { player: true } }),
    prisma.performanceStat.findMany({ where: linkedWhere, include: { player: true }, orderBy: { recordedAt: "desc" } })
  ]);
  response.json({ players, attendance, fees, stats });
});

app.get("/api/players", requireAuth, async (_request, response) => {
  if (_request.user?.playerId) {
    const players = await prisma.player.findMany({
      where: { id: _request.user.playerId },
      include: {
        attendance: { orderBy: { date: "desc" }, take: 1 },
        feePayments: { orderBy: { dueDate: "desc" }, take: 1 },
        performanceStats: { orderBy: { recordedAt: "desc" }, take: 1 }
      }
    });
    return response.json({ players });
  }
  const players = await prisma.player.findMany({
    orderBy: { fullName: "asc" },
    include: {
      attendance: { orderBy: { date: "desc" }, take: 1 },
      feePayments: { orderBy: { dueDate: "desc" }, take: 1 },
      performanceStats: { orderBy: { recordedAt: "desc" }, take: 1 }
    }
  });
  response.json({ players });
});

app.post("/api/players", requireAuth, requireCoach, async (request, response) => {
  const parsed = playerSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  const count = await prisma.player.count();
  const { portalEmail, portalPassword, ...playerData } = parsed.data;
  const player = await prisma.$transaction(async (tx) => {
    const createdPlayer = await tx.player.create({
      data: { ...playerData, playerCode: `CA-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}` }
    });
    if (portalEmail && portalPassword) {
      await tx.user.create({
        data: {
          name: createdPlayer.fullName,
          email: portalEmail,
          passwordHash: await hashPassword(portalPassword),
          role: "PARENT",
          playerId: createdPlayer.id
        }
      });
    }
    return createdPlayer;
  });
  response.status(201).json({ player });
});

app.delete("/api/players/:id", requireAuth, requireCoach, async (request, response) => {
  const id = String(request.params.id);
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) return response.status(404).json({ error: "Player not found" });
  await prisma.player.delete({ where: { id } });
  response.json({ ok: true });
});

app.post("/api/import/google-forms/player", async (request, response) => {
  const expectedToken = process.env.GOOGLE_FORMS_IMPORT_TOKEN;
  const token = request.header("x-import-token") ?? request.query.token;
  if (!expectedToken || token !== expectedToken) {
    return response.status(401).json({ error: "Invalid import token" });
  }

  const parsed = googleFormPlayerSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const count = await prisma.player.count();
  const { portalEmail, portalPassword, ...playerData } = parsed.data;
  const player = await prisma.$transaction(async (tx) => {
    const createdPlayer = await tx.player.create({
      data: {
        ...playerData,
        jerseyNumber: playerData.jerseyNumber ?? count + 1,
        playerCode: `CA-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`
      }
    });
    if (portalEmail && portalPassword) {
      await tx.user.create({
        data: {
          name: createdPlayer.fullName,
          email: portalEmail,
          passwordHash: await hashPassword(portalPassword),
          role: "PARENT",
          playerId: createdPlayer.id
        }
      });
    }
    return createdPlayer;
  });

  response.status(201).json({ player });
});

app.get("/api/attendance", requireAuth, async (request, response) => {
  const date = typeof request.query.date === "string" ? new Date(request.query.date) : undefined;
  const attendance = await prisma.attendance.findMany({
    where: date ? { date } : undefined,
    include: { player: true },
    orderBy: [{ date: "desc" }, { player: { fullName: "asc" } }]
  });
  response.json({ attendance });
});

app.post("/api/attendance", requireAuth, requireCoach, async (request, response) => {
  const parsed = attendanceSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  const attendance = await prisma.attendance.upsert({
    where: { playerId_date: { playerId: parsed.data.playerId, date: parsed.data.date } },
    update: parsed.data,
    create: parsed.data
  });
  response.json({ attendance });
});

app.get("/api/fees", requireAuth, async (_request, response) => {
  const fees = await prisma.feePayment.findMany({ include: { player: true }, orderBy: { dueDate: "asc" } });
  response.json({ fees });
});

app.get("/api/performance", requireAuth, async (_request, response) => {
  const stats = await prisma.performanceStat.findMany({ include: { player: true }, orderBy: { recordedAt: "desc" } });
  response.json({ stats });
});

app.get("/api/improvement", requireAuth, async (_request, response) => {
  const assessments = await prisma.skillAssessment.findMany({ include: { player: true }, orderBy: { assessmentMonth: "desc" } });
  response.json({ assessments });
});

app.get("/api/matches", requireAuth, async (_request, response) => {
  const matches = await prisma.match.findMany({
    include: { performances: { include: { player: true } } },
    orderBy: { date: "desc" }
  });
  response.json({ matches });
});

app.get("/api/reports/:type", requireAuth, async (request, response) => {
  const players = await prisma.player.findMany({
    include: {
      feePayments: { orderBy: { dueDate: "desc" }, take: 1 },
      performanceStats: { orderBy: { recordedAt: "desc" }, take: 1 }
    },
    orderBy: { fullName: "asc" }
  }) as ReportPlayer[];
  const csv = [
    ["Player ID", "Name", "Role", "Skill", "Fee Status", "Runs", "Wickets"],
    ...players.map((player) => [
      player.playerCode,
      player.fullName,
      player.playingRole,
      player.skillLevel,
      player.feePayments[0]?.status ?? "PENDING",
      player.performanceStats[0]?.runsScored ?? 0,
      player.performanceStats[0]?.wickets ?? 0
    ])
  ].map((row) => row.map(csvEscape).join(",")).join("\n");
  response.header("Content-Type", "text/csv");
  response.attachment(`${request.params.type}.csv`);
  response.send(csv);
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
