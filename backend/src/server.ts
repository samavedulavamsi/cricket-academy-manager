import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { authenticate, clearSessionCookie, requireAuth, requireCoach, setSessionCookie } from "./lib/auth.js";
import { prisma } from "./lib/prisma.js";
import {
  attendanceSchema,
  googleFormPlayerSchema,
  jerseySchema,
  loginSchema,
  playerRegistrationSchema,
  playerPhotoSchema,
  playerSchema,
  tournamentSchema,
  whatsappReminderSchema
} from "./lib/validations.js";
import { hashPassword } from "./lib/password.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
const frontendDistPath = path.resolve(process.cwd(), "../frontend/dist");

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

app.post("/api/auth/player-register", async (request, response) => {
  const parsed = playerRegistrationSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const player = await prisma.player.findUnique({ where: { playerCode: parsed.data.playerCode }, include: { user: true } });
  if (!player) return response.status(404).json({ error: "Player record not found" });
  if (player.user) return response.status(409).json({ error: "Portal account already exists for this player" });

  const submittedContact = normalizePhone(parsed.data.parentContactNumber);
  const savedContact = normalizePhone(player.parentContactNumber);
  if (submittedContact !== savedContact) return response.status(403).json({ error: "Player code and parent contact do not match" });

  const user = await prisma.user.create({
    data: {
      name: player.fullName,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "PARENT",
      playerId: player.id
    }
  });
  const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role, playerId: user.playerId };
  setSessionCookie(response, sessionUser);
  response.status(201).json({ user: sessionUser });
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

app.get("/api/players/:id", requireAuth, async (request, response) => {
  const id = String(request.params.id);
  if (request.user?.playerId && request.user.playerId !== id) {
    return response.status(403).json({ error: "Forbidden" });
  }
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      attendance: { orderBy: { date: "desc" }, take: 30 },
      feePayments: { orderBy: { dueDate: "desc" }, take: 12 },
      performanceStats: { orderBy: { recordedAt: "desc" }, take: 10 },
      assessments: { orderBy: { assessmentMonth: "desc" }, take: 6 },
      matchPerformances: {
        include: { match: true },
        orderBy: { match: { date: "desc" } },
        take: 10
      },
      user: { select: { id: true, email: true, role: true } }
    }
  });
  if (!player) return response.status(404).json({ error: "Player not found" });
  response.json({ player });
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

app.patch("/api/players/:id/photo", requireAuth, requireCoach, async (request, response) => {
  const parsed = playerPhotoSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  const player = await prisma.player.update({
    where: { id: String(request.params.id) },
    data: { photoUrl: parsed.data.photoUrl }
  });
  response.json({ player });
});

app.patch("/api/players/:id/jersey", requireAuth, requireCoach, async (request, response) => {
  const parsed = jerseySchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  const existing = await prisma.player.findFirst({
    where: {
      jerseyNumber: parsed.data.jerseyNumber,
      id: { not: String(request.params.id) }
    }
  });
  if (existing) return response.status(409).json({ error: "Jersey number already assigned" });
  const player = await prisma.player.update({
    where: { id: String(request.params.id) },
    data: { jerseyNumber: parsed.data.jerseyNumber }
  });
  response.json({ player });
});

app.post("/api/import/google-forms/player", async (request, response) => {
  const expectedToken = process.env.GOOGLE_FORMS_IMPORT_TOKEN;
  const token = request.header("x-import-token") ?? request.query.token;
  if (!expectedToken || token !== expectedToken) {
    return response.status(401).json({ error: "Invalid import token" });
  }

  const parsed = googleFormPlayerSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const { portalEmail, portalPassword, ...playerData } = parsed.data;
  const registration = await prisma.pendingRegistration.create({
    data: {
      ...playerData,
      notes: portalEmail || portalPassword ? "Portal credentials were submitted but ignored. Player should self-register after approval." : undefined
    }
  });

  response.status(201).json({ registration });
});

app.get("/api/registrations", requireAuth, requireCoach, async (_request, response) => {
  const registrations = await prisma.pendingRegistration.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
  response.json({ registrations });
});

app.post("/api/registrations/:id/approve", requireAuth, requireCoach, async (request, response) => {
  const id = String(request.params.id);
  const registration = await prisma.pendingRegistration.findUnique({ where: { id } });
  if (!registration) return response.status(404).json({ error: "Registration not found" });
  if (registration.status !== "PENDING") return response.status(409).json({ error: "Registration already reviewed" });

  const count = await prisma.player.count();
  const player = await prisma.$transaction(async (tx) => {
    const createdPlayer = await tx.player.create({
      data: {
        playerCode: `CA-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`,
        fullName: registration.fullName,
        dateOfBirth: registration.dateOfBirth,
        gender: registration.gender,
        mobileNumber: registration.mobileNumber,
        parentName: registration.parentName,
        parentContactNumber: registration.parentContactNumber,
        address: registration.address,
        bloodGroup: registration.bloodGroup,
        emergencyContact: registration.emergencyContact,
        playingRole: registration.playingRole,
        battingStyle: registration.battingStyle,
        bowlingStyle: registration.bowlingStyle,
        jerseyNumber: registration.jerseyNumber ?? count + 1,
        joiningDate: registration.joiningDate,
        skillLevel: registration.skillLevel,
        monthlyFeeAmount: registration.monthlyFeeAmount,
        admissionFee: registration.admissionFee,
        discount: registration.discount
      }
    });
    await tx.pendingRegistration.update({ where: { id }, data: { status: "APPROVED" } });
    return createdPlayer;
  });

  response.json({ player });
});

app.post("/api/registrations/:id/reject", requireAuth, requireCoach, async (request, response) => {
  const id = String(request.params.id);
  const registration = await prisma.pendingRegistration.update({
    where: { id },
    data: { status: "REJECTED" }
  });
  response.json({ registration });
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

app.get("/api/attendance/reports", requireAuth, async (_request, response) => {
  const playerId = _request.user?.playerId ?? undefined;
  const rows = await prisma.attendance.findMany({
    where: playerId ? { playerId } : undefined,
    include: { player: true },
    orderBy: [{ date: "desc" }, { player: { fullName: "asc" } }]
  });
  const byPlayer = new Map<string, { playerId: string; name: string; present: number; absent: number; leave: number; total: number }>();
  for (const row of rows) {
    const current = byPlayer.get(row.playerId) ?? { playerId: row.playerId, name: row.player.fullName, present: 0, absent: 0, leave: 0, total: 0 };
    for (const status of [row.morningStatus, row.eveningStatus]) {
      current.total += 1;
      if (status === "PRESENT") current.present += 1;
      if (status === "ABSENT") current.absent += 1;
      if (status === "LEAVE") current.leave += 1;
    }
    byPlayer.set(row.playerId, current);
  }
  response.json({
    summary: Array.from(byPlayer.values()).map((row) => ({
      ...row,
      attendancePercent: row.total ? Math.round((row.present / row.total) * 100) : 0
    })),
    rows
  });
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

app.get("/api/fee-alerts", requireAuth, async (_request, response) => {
  const now = new Date();
  const sevenDays = new Date(now);
  sevenDays.setDate(sevenDays.getDate() + 7);
  const fees = await prisma.feePayment.findMany({
    where: _request.user?.playerId ? { playerId: _request.user.playerId } : undefined,
    include: { player: true },
    orderBy: { dueDate: "asc" }
  });
  const alerts = fees
    .filter((fee) => fee.status !== "PAID")
    .map((fee) => {
      const dueDate = new Date(fee.dueDate);
      const pendingAmount = Math.max(fee.player.monthlyFeeAmount - fee.amountPaid, 0);
      const alertType = dueDate < now ? "OVERDUE" : dueDate <= sevenDays ? "DUE_SOON" : "UPCOMING";
      return {
        feeId: fee.id,
        playerId: fee.playerId,
        playerName: fee.player.fullName,
        parentContactNumber: fee.player.parentContactNumber,
        dueDate,
        pendingAmount,
        alertType
      };
    });
  response.json({ alerts });
});

app.post("/api/whatsapp/fee-reminders", requireAuth, requireCoach, async (request, response) => {
  const parsed = whatsappReminderSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  const fees = await prisma.feePayment.findMany({
    where: parsed.data.feeIds?.length ? { id: { in: parsed.data.feeIds } } : { status: { not: "PAID" } },
    include: { player: true },
    orderBy: { dueDate: "asc" }
  });
  const reminders = fees.map((fee) => {
    const pendingAmount = Math.max(fee.player.monthlyFeeAmount - fee.amountPaid, 0);
    const phone = normalizePhone(fee.player.parentContactNumber);
    const text = `Hello ${fee.player.parentName}, fee reminder for ${fee.player.fullName}: pending amount Rs ${pendingAmount}, due date ${fee.dueDate.toLocaleDateString("en-IN")}. - DBR Academy`;
    return {
      feeId: fee.id,
      playerName: fee.player.fullName,
      parentName: fee.player.parentName,
      phone,
      pendingAmount,
      whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    };
  });
  response.json({ reminders });
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

app.get("/api/match-dashboard", requireAuth, async (_request, response) => {
  const matches = await prisma.match.findMany({
    include: { performances: { include: { player: true } }, tournament: true },
    orderBy: { date: "desc" }
  });
  const totals = matches.reduce((acc, match) => {
    acc.matches += 1;
    if (match.result === "WON") acc.won += 1;
    if (match.result === "LOST") acc.lost += 1;
    if (match.result === "DRAW") acc.draw += 1;
    for (const performance of match.performances) {
      acc.runs += performance.runs;
      acc.wickets += performance.wickets;
      acc.catches += performance.catches;
    }
    return acc;
  }, { matches: 0, won: 0, lost: 0, draw: 0, runs: 0, wickets: 0, catches: 0 });
  const topBatters = matches.flatMap((match) => match.performances)
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 5)
    .map((performance) => ({ playerName: performance.player.fullName, runs: performance.runs, wickets: performance.wickets, catches: performance.catches }));
  response.json({ totals, matches, topBatters });
});

app.get("/api/tournaments", requireAuth, async (_request, response) => {
  const tournaments = await prisma.tournament.findMany({
    include: { matches: true },
    orderBy: { startDate: "desc" }
  });
  response.json({ tournaments });
});

app.post("/api/tournaments", requireAuth, requireCoach, async (request, response) => {
  const parsed = tournamentSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });
  const { endDate, ...data } = parsed.data;
  const tournament = await prisma.tournament.create({
    data: {
      ...data,
      endDate: endDate || undefined
    }
  });
  response.status(201).json({ tournament });
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

app.use(express.static(frontendDistPath));

app.get("*", (request, response, next) => {
  if (request.path.startsWith("/api")) return next();
  response.sendFile(path.join(frontendDistPath, "index.html"));
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
});

initializeAdminAccount()
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Failed to initialize admin account", error);
    process.exit(1);
  });

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("91")) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function initializeAdminAccount() {
  const email = process.env.ADMIN_EMAIL ?? process.env.COACH_EMAIL;
  const password = process.env.ADMIN_PASSWORD ?? process.env.COACH_PASSWORD;
  const name = process.env.ADMIN_NAME ?? process.env.COACH_NAME ?? "Academy Admin";

  if (!email || !password) {
    console.warn("ADMIN_EMAIL and ADMIN_PASSWORD are not set; skipping admin account sync.");
    return;
  }

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash: await hashPassword(password),
      role: "ADMIN"
    },
    create: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "ADMIN"
    }
  });

  console.log(`Admin account ready: ${email}`);
}
