import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import type { PermissionKey, Prisma, UserRole } from "@prisma/client";
import {
  authenticate,
  clearSessionCookie,
  getPermissionsForUser,
  requireAuth,
  requireCoach,
  requirePermission,
  requireRole,
  setSessionCookie
} from "./lib/auth.js";
import { sportsNewsSeed } from "./lib/news.js";
import { defaultRolePermissions } from "./lib/permissions.js";
import { prisma } from "./lib/prisma.js";
import {
  academyRegistrationSchema,
  attendanceSchema,
  changePasswordSchema,
  coachInvitationSchema,
  coachProfileSchema,
  coachRegistrationSchema,
  coachRoleSchema,
  forgotPasswordSchema,
  googleFormPlayerSchema,
  jerseySchema,
  loginSchema,
  playerRegistrationSchema,
  playerPhotoSchema,
  playerSchema,
  resetPasswordSchema,
  rolePermissionSchema,
  tournamentSchema,
  whatsappReminderSchema
} from "./lib/validations.js";
import { hashPassword, verifyPassword } from "./lib/password.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
const today = new Date("2026-06-27T00:00:00.000Z");
const frontendDistPath = resolveFrontendDistPath();

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
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (_request, response) => response.json({ ok: true }));

app.get("/api/academies/search", async (request, response) => {
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  const academies = await prisma.academy.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { academyCode: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } }
          ]
        }
      : undefined,
    orderBy: [{ name: "asc" }],
    take: 8,
    select: {
      id: true,
      name: true,
      academyCode: true,
      city: true,
      state: true,
      country: true,
      logoUrl: true,
      subscriptionPlan: true,
      themeColor: true
    }
  });

  response.json({ academies });
});

app.get("/api/academies/:academyCode/public", async (request, response) => {
  const academy = await prisma.academy.findUnique({
    where: { academyCode: String(request.params.academyCode).toUpperCase() },
    select: {
      id: true,
      name: true,
      academyCode: true,
      city: true,
      state: true,
      country: true,
      logoUrl: true,
      themeColor: true,
      subscriptionPlan: true
    }
  });
  if (!academy) return response.status(404).json({ error: "Academy not found" });
  response.json({ academy });
});

app.post("/api/academies/register", async (request, response) => {
  const parsed = academyRegistrationSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const academyCode = await generateAcademyCode(parsed.data.academyName);
  const registration = await prisma.$transaction(async (tx) => {
    const academy = await tx.academy.create({
      data: {
        name: parsed.data.academyName,
        logoUrl: parsed.data.logoUrl || undefined,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        country: parsed.data.country,
        mobileNumber: parsed.data.mobileNumber,
        email: parsed.data.email.toLowerCase(),
        website: parsed.data.website || undefined,
        ownerName: parsed.data.ownerName,
        subscriptionPlan: parsed.data.subscriptionPlan,
        academyCode,
        subdomain: parsed.data.subdomain || undefined,
        timeZone: parsed.data.timeZone,
        currency: parsed.data.currency.toUpperCase(),
        themeColor: parsed.data.themeColor
      }
    });

    await tx.academySettings.create({
      data: {
        academyId: academy.id,
        dashboardTitle: `${academy.name} Command Center`,
        dashboardDescription: "Academy operations, coach workflows, and parent communication all in one place.",
        registrationOpen: true,
        allowParentSelfSignup: true
      }
    });

    await seedRolePermissions(tx, academy.id);
    await seedAcademyExperience(tx, academy.id, academy.name);

    const superAdmin = await tx.user.create({
      data: {
        academyId: academy.id,
        name: parsed.data.superAdminName,
        email: parsed.data.superAdminEmail.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.superAdminPassword),
        phone: parsed.data.superAdminPhone,
        role: "SUPER_ADMIN",
        title: "Super Admin"
      }
    });

    await tx.user.create({
      data: {
        academyId: academy.id,
        name: parsed.data.firstCoachName,
        email: parsed.data.firstCoachEmail.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.firstCoachPassword),
        phone: parsed.data.firstCoachPhone,
        role: "HEAD_COACH",
        title: "Head Coach"
      }
    });

    return { academy, superAdmin };
  });

  const sessionUser = {
    id: registration.superAdmin.id,
    academyId: registration.academy.id,
    academyName: registration.academy.name,
    academyCode: registration.academy.academyCode,
    name: registration.superAdmin.name,
    email: registration.superAdmin.email,
    role: registration.superAdmin.role,
    playerId: registration.superAdmin.playerId
  } as const;

  setSessionCookie(response, sessionUser);
  response.status(201).json({
    academy: registration.academy,
    user: sessionUser
  });
});

app.post("/api/auth/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "Invalid payload" });

  const user = await authenticate(parsed.data.academyCode.toUpperCase(), parsed.data.email, parsed.data.password);
  if (!user) return response.status(401).json({ error: "Invalid academy, email, or password" });

  setSessionCookie(response, user);
  response.json({ user });
});

app.post("/api/auth/player-register", async (request, response) => {
  const parsed = playerRegistrationSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const academy = await prisma.academy.findUnique({ where: { academyCode: parsed.data.academyCode.toUpperCase() } });
  if (!academy) return response.status(404).json({ error: "Academy not found" });

  const player = await prisma.player.findUnique({
    where: {
      academyId_playerCode: {
        academyId: academy.id,
        playerCode: parsed.data.playerCode
      }
    },
    include: { user: true }
  });

  if (!player) return response.status(404).json({ error: "Player record not found" });
  if (player.user) return response.status(409).json({ error: "Portal account already exists for this player" });

  const submittedContact = normalizePhone(parsed.data.parentContactNumber);
  const savedContact = normalizePhone(player.parentContactNumber);
  if (submittedContact !== savedContact) {
    return response.status(403).json({ error: "Player code and parent contact do not match" });
  }

  const user = await prisma.user.create({
    data: {
      academyId: academy.id,
      name: player.parentName,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await hashPassword(parsed.data.password),
      role: "PARENT",
      playerId: player.id,
      phone: player.parentContactNumber,
      title: "Parent Portal"
    }
  });

  const sessionUser = {
    id: user.id,
    academyId: academy.id,
    academyName: academy.name,
    academyCode: academy.academyCode,
    name: user.name,
    email: user.email,
    role: user.role,
    playerId: user.playerId
  } as const;

  setSessionCookie(response, sessionUser);
  response.status(201).json({ user: sessionUser });
});

app.post("/api/auth/forgot-password", async (request, response) => {
  const parsed = forgotPasswordSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const academy = await prisma.academy.findUnique({ where: { academyCode: parsed.data.academyCode.toUpperCase() } });
  if (!academy) return response.status(404).json({ error: "Academy not found" });

  const user = await prisma.user.findUnique({
    where: {
      academyId_email: {
        academyId: academy.id,
        email: parsed.data.email.toLowerCase()
      }
    }
  });

  if (!user) {
    return response.json({ ok: true });
  }

  const token = randomToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await prisma.passwordResetToken.create({
    data: {
      academyId: academy.id,
      userId: user.id,
      token,
      expiresAt
    }
  });

  response.json({
    ok: true,
    resetToken: token,
    resetPath: `/reset-password?token=${token}`
  });
});

app.post("/api/auth/reset-password", async (request, response) => {
  const parsed = resetPasswordSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const token = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
    include: { user: true, academy: true }
  });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    return response.status(400).json({ error: "Reset token is invalid or expired" });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) }
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() }
    })
  ]);

  response.json({ ok: true });
});

app.post("/api/auth/change-password", requireAuth, async (request, response) => {
  const parsed = changePasswordSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const current = await prisma.user.findUnique({ where: { id: request.user!.id } });
  if (!current) return response.status(404).json({ error: "User not found" });
  if (!(await verifyPassword(parsed.data.currentPassword, current.passwordHash))) {
    return response.status(403).json({ error: "Current password is incorrect" });
  }

  await prisma.user.update({
    where: { id: current.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) }
  });

  response.json({ ok: true });
});

app.post("/api/auth/logout", (_request, response) => {
  clearSessionCookie(response);
  response.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, async (request, response) => {
  const permissions = await getPermissionsForUser(request.user!);
  const academy = await prisma.academy.findUnique({
    where: { id: request.user!.academyId },
    select: {
      id: true,
      name: true,
      academyCode: true,
      city: true,
      state: true,
      country: true,
      logoUrl: true,
      subscriptionPlan: true,
      themeColor: true,
      currency: true,
      timeZone: true,
      ownerName: true
    }
  });

  response.json({ user: request.user, permissions, academy });
});

app.get("/api/news/sports", async (_request, response) => {
  response.json({
    source: "static-seed",
    items: sportsNewsSeed
  });
});

app.get("/api/dashboard", requireAuth, async (request, response) => {
  const playerFilter = request.user?.playerId ? { id: request.user.playerId } : undefined;
  const academyId = request.user!.academyId;
  const attendanceWhere: Prisma.AttendanceWhereInput = request.user?.playerId
    ? { academyId, date: today, playerId: request.user.playerId }
    : { academyId, date: today };

  const linkedWhere = request.user?.playerId
    ? { academyId, playerId: request.user.playerId }
    : { academyId };

  const [players, attendance, fees, stats] = await Promise.all([
    prisma.player.findMany({
      where: {
        academyId,
        ...playerFilter
      },
      orderBy: { fullName: "asc" }
    }),
    prisma.attendance.findMany({ where: attendanceWhere, include: { player: true } }),
    prisma.feePayment.findMany({ where: linkedWhere, include: { player: true } }),
    prisma.performanceStat.findMany({ where: linkedWhere, include: { player: true }, orderBy: { recordedAt: "desc" } })
  ]);

  response.json({ players, attendance, fees, stats });
});

app.get("/api/parent/portal", requireAuth, async (request, response) => {
  if (request.user?.role !== "PARENT" || !request.user.playerId) {
    return response.status(403).json({ error: "Forbidden" });
  }

  const academyId = request.user.academyId;
  const playerId = request.user.playerId;

  const [player, attendance, fees, stats, feedback, notifications, gallery, downloads, matches] = await Promise.all([
    prisma.player.findFirst({ where: { academyId, id: playerId } }),
    prisma.attendance.findMany({ where: { academyId, playerId }, orderBy: { date: "desc" }, take: 12 }),
    prisma.feePayment.findMany({ where: { academyId, playerId }, orderBy: { dueDate: "desc" }, take: 12 }),
    prisma.performanceStat.findMany({ where: { academyId, playerId }, orderBy: { recordedAt: "desc" }, take: 8 }),
    prisma.coachFeedback.findMany({
      where: { academyId, playerId },
      include: { coach: { select: { name: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.notification.findMany({
      where: { academyId, audience: { in: ["ALL", "PARENTS"] } },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.mediaAsset.findMany({ where: { academyId }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.downloadResource.findMany({
      where: { academyId, audience: { in: ["ALL", "PARENTS"] } },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.match.findMany({
      where: {
        academyId,
        date: { gte: today }
      },
      orderBy: { date: "asc" },
      take: 8
    })
  ]);

  if (!player) return response.status(404).json({ error: "Player not found" });

  response.json({ player, attendance, fees, stats, feedback, notifications, gallery, downloads, matches });
});

app.get("/api/coaches", requireAuth, requirePermission("MANAGE_COACHES"), async (request, response) => {
  const academyId = request.user!.academyId;
  const coaches = await prisma.user.findMany({
    where: {
      academyId,
      role: {
        in: ["SUPER_ADMIN", "ACADEMY_ADMIN", "HEAD_COACH", "ASSISTANT_COACH", "MANAGER", "ACCOUNTANT"]
      }
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      title: true,
      role: true,
      profilePhotoUrl: true,
      createdAt: true
    }
  });

  response.json({ coaches });
});

app.get("/api/coaches/invitations", requireAuth, requirePermission("MANAGE_COACHES"), async (request, response) => {
  const invitations = await prisma.coachInvitation.findMany({
    where: { academyId: request.user!.academyId },
    orderBy: { createdAt: "desc" }
  });
  response.json({ invitations });
});

app.post("/api/coaches/invitations", requireAuth, requireRole("SUPER_ADMIN"), async (request, response) => {
  const parsed = coachInvitationSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const academy = await prisma.academy.findUnique({ where: { id: request.user!.academyId } });
  if (!academy) return response.status(404).json({ error: "Academy not found" });

  const token = randomToken();
  const invitation = await prisma.coachInvitation.upsert({
    where: {
      academyId_email: {
        academyId: academy.id,
        email: parsed.data.email.toLowerCase()
      }
    },
    update: {
      phone: parsed.data.phone,
      role: parsed.data.role,
      message: parsed.data.message,
      status: "PENDING",
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      invitedById: request.user!.id,
      acceptedAt: null
    },
    create: {
      academyId: academy.id,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      role: parsed.data.role,
      message: parsed.data.message,
      token,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      invitedById: request.user!.id
    }
  });

  response.status(201).json({
    invitation,
    registrationPath: `/coach-register?token=${token}`,
    academy: {
      name: academy.name,
      academyCode: academy.academyCode
    }
  });
});

app.post("/api/coaches/register", async (request, response) => {
  const parsed = coachRegistrationSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const invitation = await prisma.coachInvitation.findUnique({
    where: { token: parsed.data.token },
    include: { academy: true }
  });

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return response.status(400).json({ error: "Invitation is invalid or expired" });
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        academyId: invitation.academyId,
        name: parsed.data.name,
        email: invitation.email,
        passwordHash: await hashPassword(parsed.data.password),
        phone: parsed.data.phone,
        role: invitation.role,
        title: parsed.data.title || roleTitle(invitation.role),
        profilePhotoUrl: parsed.data.profilePhotoUrl || undefined
      }
    });

    await tx.coachInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date()
      }
    });

    return created;
  });

  const sessionUser = {
    id: user.id,
    academyId: invitation.academy.id,
    academyName: invitation.academy.name,
    academyCode: invitation.academy.academyCode,
    name: user.name,
    email: user.email,
    role: user.role,
    playerId: user.playerId
  } as const;

  setSessionCookie(response, sessionUser);
  response.status(201).json({ user: sessionUser });
});

app.patch("/api/coaches/profile", requireAuth, requireCoach, async (request, response) => {
  const parsed = coachProfileSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.update({
    where: { id: request.user!.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || undefined,
      title: parsed.data.title || undefined,
      profilePhotoUrl: parsed.data.profilePhotoUrl || undefined
    }
  });

  const academy = await prisma.academy.findUniqueOrThrow({ where: { id: user.academyId } });
  const sessionUser = {
    id: user.id,
    academyId: academy.id,
    academyName: academy.name,
    academyCode: academy.academyCode,
    name: user.name,
    email: user.email,
    role: user.role,
    playerId: user.playerId
  } as const;
  setSessionCookie(response, sessionUser);

  response.json({ user: sessionUser });
});

app.patch("/api/coaches/:id/role", requireAuth, requireRole("SUPER_ADMIN"), async (request, response) => {
  const parsed = coachRoleSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.updateMany({
    where: {
      id: String(request.params.id),
      academyId: request.user!.academyId
    },
    data: { role: parsed.data.role }
  });

  if (user.count === 0) return response.status(404).json({ error: "Coach not found" });
  response.json({ ok: true });
});

app.get("/api/roles", requireAuth, requirePermission("MANAGE_ROLE_PERMISSIONS"), async (request, response) => {
  const configured = await prisma.rolePermission.findMany({
    where: { academyId: request.user!.academyId },
    orderBy: [{ role: "asc" }, { permission: "asc" }]
  });

  const roles = Object.entries(defaultRolePermissions).map(([role, defaults]) => {
    const permissions = configured
      .filter((entry) => entry.role === role)
      .map((entry) => entry.permission)
      .sort();

    return {
      role,
      permissions: permissions.length ? permissions : defaults
    };
  });

  response.json({ roles });
});

app.patch("/api/roles/:role/permissions", requireAuth, requireRole("SUPER_ADMIN"), async (request, response) => {
  const role = String(request.params.role) as UserRole;
  const parsed = rolePermissionSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: {
        academyId: request.user!.academyId,
        role
      }
    });

    await tx.rolePermission.createMany({
      data: parsed.data.permissions.map((permission) => ({
        academyId: request.user!.academyId,
        role,
        permission,
        allowed: true
      }))
    });
  });

  response.json({ ok: true });
});

app.get("/api/players", requireAuth, async (request, response) => {
  const academyId = request.user!.academyId;
  const where = request.user?.playerId
    ? { academyId, id: request.user.playerId }
    : { academyId };

  const players = await prisma.player.findMany({
    where,
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
  const academyId = request.user!.academyId;
  const id = String(request.params.id);

  if (request.user?.playerId && request.user.playerId !== id) {
    return response.status(403).json({ error: "Forbidden" });
  }

  const player = await prisma.player.findFirst({
    where: { academyId, id },
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
      coachFeedback: {
        include: { coach: { select: { name: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 6
      },
      user: { select: { id: true, email: true, role: true } }
    }
  });

  if (!player) return response.status(404).json({ error: "Player not found" });
  response.json({ player });
});

app.post("/api/players", requireAuth, requirePermission("MANAGE_PLAYERS"), async (request, response) => {
  const parsed = playerSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const academyId = request.user!.academyId;
  const count = await prisma.player.count({ where: { academyId } });
  const { portalEmail, portalPassword, ...playerData } = parsed.data;

  const player = await prisma.$transaction(async (tx) => {
    const createdPlayer = await tx.player.create({
      data: {
        academyId,
        ...playerData,
        playerCode: `${request.user!.academyCode}-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`
      }
    });

    if (portalEmail && portalPassword) {
      await tx.user.create({
        data: {
          academyId,
          name: createdPlayer.parentName,
          email: portalEmail.toLowerCase(),
          passwordHash: await hashPassword(portalPassword),
          role: "PARENT",
          playerId: createdPlayer.id,
          phone: createdPlayer.parentContactNumber,
          title: "Parent Portal"
        }
      });
    }

    return createdPlayer;
  });

  response.status(201).json({ player });
});

app.delete("/api/players/:id", requireAuth, requirePermission("MANAGE_PLAYERS"), async (request, response) => {
  const player = await prisma.player.findFirst({
    where: {
      academyId: request.user!.academyId,
      id: String(request.params.id)
    }
  });
  if (!player) return response.status(404).json({ error: "Player not found" });

  await prisma.player.delete({ where: { id: player.id } });
  response.json({ ok: true });
});

app.patch("/api/players/:id/photo", requireAuth, requirePermission("MANAGE_PLAYERS"), async (request, response) => {
  const parsed = playerPhotoSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const player = await prisma.player.updateMany({
    where: {
      academyId: request.user!.academyId,
      id: String(request.params.id)
    },
    data: { photoUrl: parsed.data.photoUrl }
  });

  if (player.count === 0) return response.status(404).json({ error: "Player not found" });
  response.json({ ok: true });
});

app.patch("/api/players/:id/jersey", requireAuth, requirePermission("MANAGE_PLAYERS"), async (request, response) => {
  const parsed = jerseySchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const academyId = request.user!.academyId;
  const existing = await prisma.player.findFirst({
    where: {
      academyId,
      jerseyNumber: parsed.data.jerseyNumber,
      id: { not: String(request.params.id) }
    }
  });
  if (existing) return response.status(409).json({ error: "Jersey number already assigned" });

  const player = await prisma.player.updateMany({
    where: { academyId, id: String(request.params.id) },
    data: { jerseyNumber: parsed.data.jerseyNumber }
  });

  if (player.count === 0) return response.status(404).json({ error: "Player not found" });
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

  const academy = await prisma.academy.findUnique({ where: { academyCode: parsed.data.academyCode.toUpperCase() } });
  if (!academy) return response.status(404).json({ error: "Academy not found" });

  const { academyCode: _academyCode, portalEmail, portalPassword, ...playerData } = parsed.data;
  const registration = await prisma.pendingRegistration.create({
    data: {
      academyId: academy.id,
      ...playerData,
      notes: portalEmail || portalPassword ? "Portal credentials were submitted but ignored. Parent should self-register after approval." : undefined
    }
  });

  response.status(201).json({ registration });
});

app.get("/api/registrations", requireAuth, requirePermission("MANAGE_PLAYERS"), async (request, response) => {
  const registrations = await prisma.pendingRegistration.findMany({
    where: { academyId: request.user!.academyId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
  response.json({ registrations });
});

app.post("/api/registrations/:id/approve", requireAuth, requirePermission("MANAGE_PLAYERS"), async (request, response) => {
  const academyId = request.user!.academyId;
  const id = String(request.params.id);
  const registration = await prisma.pendingRegistration.findFirst({ where: { academyId, id } });
  if (!registration) return response.status(404).json({ error: "Registration not found" });
  if (registration.status !== "PENDING") return response.status(409).json({ error: "Registration already reviewed" });

  const count = await prisma.player.count({ where: { academyId } });
  const player = await prisma.$transaction(async (tx) => {
    const createdPlayer = await tx.player.create({
      data: {
        academyId,
        playerCode: `${request.user!.academyCode}-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`,
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

app.post("/api/registrations/:id/reject", requireAuth, requirePermission("MANAGE_PLAYERS"), async (request, response) => {
  const academyId = request.user!.academyId;
  const id = String(request.params.id);
  const existing = await prisma.pendingRegistration.findFirst({ where: { academyId, id } });
  if (!existing) return response.status(404).json({ error: "Registration not found" });

  const registration = await prisma.pendingRegistration.update({
    where: { id },
    data: { status: "REJECTED" }
  });
  response.json({ registration });
});

app.get("/api/attendance", requireAuth, async (request, response) => {
  const date = typeof request.query.date === "string" ? new Date(request.query.date) : undefined;
  const academyId = request.user!.academyId;
  const attendance = await prisma.attendance.findMany({
    where: {
      academyId,
      ...(date ? { date } : {}),
      ...(request.user?.playerId ? { playerId: request.user.playerId } : {})
    },
    include: { player: true },
    orderBy: [{ date: "desc" }, { player: { fullName: "asc" } }]
  });
  response.json({ attendance });
});

app.get("/api/attendance/reports", requireAuth, async (request, response) => {
  const academyId = request.user!.academyId;
  const rows = await prisma.attendance.findMany({
    where: {
      academyId,
      ...(request.user?.playerId ? { playerId: request.user.playerId } : {})
    },
    include: { player: true },
    orderBy: [{ date: "desc" }, { player: { fullName: "asc" } }]
  });

  const byPlayer = new Map<string, { playerId: string; name: string; present: number; absent: number; leave: number; total: number }>();
  for (const row of rows) {
    const current = byPlayer.get(row.playerId) ?? {
      playerId: row.playerId,
      name: row.player.fullName,
      present: 0,
      absent: 0,
      leave: 0,
      total: 0
    };

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

app.post("/api/attendance", requireAuth, requirePermission("MANAGE_ATTENDANCE"), async (request, response) => {
  const parsed = attendanceSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const attendance = await prisma.attendance.upsert({
    where: {
      academyId_playerId_date: {
        academyId: request.user!.academyId,
        playerId: parsed.data.playerId,
        date: parsed.data.date
      }
    },
    update: {
      morningStatus: parsed.data.morningStatus,
      eveningStatus: parsed.data.eveningStatus
    },
    create: {
      academyId: request.user!.academyId,
      playerId: parsed.data.playerId,
      date: parsed.data.date,
      morningStatus: parsed.data.morningStatus,
      eveningStatus: parsed.data.eveningStatus
    }
  });
  response.json({ attendance });
});

app.get("/api/fees", requireAuth, async (request, response) => {
  const fees = await prisma.feePayment.findMany({
    where: {
      academyId: request.user!.academyId,
      ...(request.user?.playerId ? { playerId: request.user.playerId } : {})
    },
    include: { player: true },
    orderBy: { dueDate: "asc" }
  });
  response.json({ fees });
});

app.get("/api/fee-alerts", requireAuth, async (request, response) => {
  const now = new Date();
  const sevenDays = new Date(now);
  sevenDays.setDate(sevenDays.getDate() + 7);

  const fees = await prisma.feePayment.findMany({
    where: {
      academyId: request.user!.academyId,
      ...(request.user?.playerId ? { playerId: request.user.playerId } : {})
    },
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

app.post("/api/whatsapp/fee-reminders", requireAuth, requirePermission("MANAGE_FEES"), async (request, response) => {
  const parsed = whatsappReminderSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const fees = await prisma.feePayment.findMany({
    where: {
      academyId: request.user!.academyId,
      ...(parsed.data.feeIds?.length ? { id: { in: parsed.data.feeIds } } : { status: { not: "PAID" } })
    },
    include: { player: true },
    orderBy: { dueDate: "asc" }
  });

  const reminders = fees.map((fee) => {
    const pendingAmount = Math.max(fee.player.monthlyFeeAmount - fee.amountPaid, 0);
    const phone = normalizePhone(fee.player.parentContactNumber);
    const text = `Hello ${fee.player.parentName}, fee reminder for ${fee.player.fullName}: pending amount ${pendingAmount} ${request.user?.academyCode}, due date ${fee.dueDate.toLocaleDateString("en-IN")}.`;
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

app.get("/api/performance", requireAuth, async (request, response) => {
  const stats = await prisma.performanceStat.findMany({
    where: {
      academyId: request.user!.academyId,
      ...(request.user?.playerId ? { playerId: request.user.playerId } : {})
    },
    include: { player: true },
    orderBy: { recordedAt: "desc" }
  });
  response.json({ stats });
});

app.get("/api/improvement", requireAuth, async (request, response) => {
  const assessments = await prisma.skillAssessment.findMany({
    where: {
      academyId: request.user!.academyId,
      ...(request.user?.playerId ? { playerId: request.user.playerId } : {})
    },
    include: { player: true },
    orderBy: { assessmentMonth: "desc" }
  });
  response.json({ assessments });
});

app.get("/api/matches", requireAuth, async (request, response) => {
  const matches = await prisma.match.findMany({
    where: { academyId: request.user!.academyId },
    include: { performances: { include: { player: true } } },
    orderBy: { date: "desc" }
  });
  response.json({ matches });
});

app.get("/api/match-dashboard", requireAuth, async (request, response) => {
  const matches = await prisma.match.findMany({
    where: { academyId: request.user!.academyId },
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

  const topBatters = matches
    .flatMap((match) => match.performances)
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 5)
    .map((performance) => ({
      playerName: performance.player.fullName,
      runs: performance.runs,
      wickets: performance.wickets,
      catches: performance.catches
    }));

  response.json({ totals, matches, topBatters });
});

app.get("/api/tournaments", requireAuth, async (request, response) => {
  const tournaments = await prisma.tournament.findMany({
    where: { academyId: request.user!.academyId },
    include: { matches: true },
    orderBy: { startDate: "desc" }
  });
  response.json({ tournaments });
});

app.post("/api/tournaments", requireAuth, requirePermission("MANAGE_TOURNAMENTS"), async (request, response) => {
  const parsed = tournamentSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.flatten() });

  const { endDate, ...data } = parsed.data;
  const tournament = await prisma.tournament.create({
    data: {
      academyId: request.user!.academyId,
      ...data,
      endDate: endDate || undefined
    }
  });
  response.status(201).json({ tournament });
});

app.get("/api/reports/:type", requireAuth, async (request, response) => {
  const players = await prisma.player.findMany({
    where: {
      academyId: request.user!.academyId,
      ...(request.user?.playerId ? { id: request.user.playerId } : {})
    },
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

initializeSystemAcademy()
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Failed to initialize academy account", error);
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

function randomToken() {
  return randomBytes(24).toString("hex");
}

function resolveFrontendDistPath() {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const candidates = [
    path.resolve(currentDir, "../../frontend/dist"),
    path.resolve(currentDir, "../../../frontend/dist"),
    path.resolve(process.cwd(), "frontend/dist"),
    path.resolve(process.cwd(), "../frontend/dist")
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return candidates[0];
}

function roleTitle(role: UserRole) {
  return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

async function seedRolePermissions(
  tx: Prisma.TransactionClient | Pick<typeof prisma, "rolePermission">,
  academyId: string
) {
  const data = Object.entries(defaultRolePermissions).flatMap(([role, permissions]) =>
    permissions.map((permission) => ({
      academyId,
      role: role as UserRole,
      permission: permission as PermissionKey,
      allowed: true
    }))
  );

  await tx.rolePermission.createMany({ data });
}

async function seedAcademyExperience(
  tx: Prisma.TransactionClient | Pick<typeof prisma, "notification" | "mediaAsset" | "downloadResource">,
  academyId: string,
  academyName: string
) {
  await tx.notification.createMany({
    data: [
      {
        academyId,
        title: "Welcome to your academy workspace",
        message: `${academyName} is ready for coach operations, player management, and parent communication.`,
        audience: "ALL"
      },
      {
        academyId,
        title: "Parent updates enabled",
        message: "Parents can now access attendance, fees, performance, gallery items, and downloads for their child.",
        audience: "PARENTS"
      }
    ]
  });

  await tx.mediaAsset.createMany({
    data: [
      {
        academyId,
        title: "Training Gallery",
        type: "PHOTO",
        previewUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80"
      },
      {
        academyId,
        title: "Weekend Nets",
        type: "PHOTO",
        previewUrl: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=900&q=80"
      }
    ]
  });

  await tx.downloadResource.createMany({
    data: [
      {
        academyId,
        title: "Season Calendar",
        description: "Practice windows, match weekends, and academy events.",
        fileUrl: "/downloads/season-calendar.pdf",
        audience: "PARENTS"
      },
      {
        academyId,
        title: "Nutrition Notes",
        description: "Coach-approved weekly nutrition guidance.",
        fileUrl: "/downloads/nutrition-notes.pdf",
        audience: "PARENTS"
      }
    ]
  });
}

async function generateAcademyCode(name: string) {
  const prefix = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "ACAD";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await prisma.academy.findUnique({ where: { academyCode: code } });
    if (!exists) return code;
  }

  return `ACAD${Date.now().toString().slice(-6)}`;
}

async function initializeSystemAcademy() {
  const email = process.env.ADMIN_EMAIL ?? process.env.COACH_EMAIL;
  const password = process.env.ADMIN_PASSWORD ?? process.env.COACH_PASSWORD;
  const name = process.env.ADMIN_NAME ?? process.env.COACH_NAME ?? "Academy Super Admin";
  const academyName = process.env.ACADEMY_NAME ?? "DBR Cricket Academy";

  if (!email || !password) {
    console.warn("ADMIN_EMAIL and ADMIN_PASSWORD are not set; skipping academy bootstrap.");
    return;
  }

  const academyCode = process.env.ACADEMY_CODE?.toUpperCase() ?? "DBR2026";
  const academy = await prisma.academy.upsert({
    where: { academyCode },
    update: {
      name: academyName,
      email: process.env.ACADEMY_EMAIL ?? email.toLowerCase(),
      ownerName: process.env.ACADEMY_OWNER ?? name
    },
    create: {
      name: academyName,
      address: process.env.ACADEMY_ADDRESS ?? "Main Academy Road",
      city: process.env.ACADEMY_CITY ?? "Hyderabad",
      state: process.env.ACADEMY_STATE ?? "Telangana",
      country: process.env.ACADEMY_COUNTRY ?? "India",
      mobileNumber: process.env.ACADEMY_PHONE ?? "9000000000",
      email: process.env.ACADEMY_EMAIL ?? email.toLowerCase(),
      website: process.env.ACADEMY_WEBSITE ?? undefined,
      ownerName: process.env.ACADEMY_OWNER ?? name,
      subscriptionPlan: "PROFESSIONAL",
      academyCode,
      timeZone: process.env.ACADEMY_TIMEZONE ?? "Asia/Kolkata",
      currency: process.env.ACADEMY_CURRENCY ?? "INR",
      themeColor: process.env.ACADEMY_THEME_COLOR ?? "#17834b"
    }
  });

  const settings = await prisma.academySettings.findUnique({ where: { academyId: academy.id } });
  if (!settings) {
    await prisma.academySettings.create({
      data: {
        academyId: academy.id,
        dashboardTitle: `${academy.name} Command Center`,
        dashboardDescription: "Academy operations, coach workflows, and parent communication all in one place."
      }
    });
  }

  const permissionCount = await prisma.rolePermission.count({ where: { academyId: academy.id } });
  if (permissionCount === 0) {
    await seedRolePermissions(prisma, academy.id);
  }

  const notifications = await prisma.notification.count({ where: { academyId: academy.id } });
  if (notifications === 0) {
    await seedAcademyExperience(prisma, academy.id, academy.name);
  }

  await prisma.user.upsert({
    where: {
      academyId_email: {
        academyId: academy.id,
        email: email.toLowerCase()
      }
    },
    update: {
      name,
      passwordHash: await hashPassword(password),
      role: "SUPER_ADMIN",
      title: "Super Admin",
      phone: process.env.ADMIN_PHONE ?? "9000000000"
    },
    create: {
      academyId: academy.id,
      name,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "SUPER_ADMIN",
      title: "Super Admin",
      phone: process.env.ADMIN_PHONE ?? "9000000000"
    }
  });

  console.log(`Academy ready: ${academy.name} (${academy.academyCode})`);
  console.log(`Super admin ready: ${email}`);
}
