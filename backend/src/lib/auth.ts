import type { PermissionKey } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";
import { defaultRolePermissions } from "./permissions.js";
import { verifyPassword } from "./password.js";

export type SessionUser = {
  id: string;
  academyId: string;
  academyName: string;
  academyCode: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ACADEMY_ADMIN" | "HEAD_COACH" | "ASSISTANT_COACH" | "MANAGER" | "ACCOUNTANT" | "PARENT" | "PLAYER";
  playerId?: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

const cookieName = "academy_session";

export async function authenticate(academyCode: string, email: string, password: string) {
  const academy = await prisma.academy.findUnique({ where: { academyCode } });
  if (!academy) return null;

  const user = await prisma.user.findUnique({
    where: {
      academyId_email: {
        academyId: academy.id,
        email: email.toLowerCase()
      }
    }
  });
  if (!user || !user.isActive) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;

  return {
    id: user.id,
    academyId: academy.id,
    academyName: academy.name,
    academyCode: academy.academyCode,
    name: user.name,
    email: user.email,
    role: user.role,
    playerId: user.playerId
  } satisfies SessionUser;
}

export async function resolveSessionUser(session: Pick<SessionUser, "id" | "academyId">) {
  const user = await prisma.user.findFirst({
    where: {
      id: session.id,
      academyId: session.academyId,
      isActive: true
    },
    include: {
      academy: {
        select: {
          id: true,
          name: true,
          academyCode: true
        }
      }
    }
  });

  if (!user) return null;

  return {
    id: user.id,
    academyId: user.academy.id,
    academyName: user.academy.name,
    academyCode: user.academy.academyCode,
    name: user.name,
    email: user.email,
    role: user.role,
    playerId: user.playerId
  } satisfies SessionUser;
}

export async function getPermissionsForUser(user: SessionUser) {
  const configured = await prisma.rolePermission.findMany({
    where: {
      academyId: user.academyId,
      role: user.role,
      allowed: true
    },
    select: { permission: true }
  });

  if (configured.length > 0) {
    return configured.map((entry) => entry.permission);
  }

  return defaultRolePermissions[user.role];
}

function signSession(user: SessionUser) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return jwt.sign(user, secret, { expiresIn: "7d" });
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies?.[cookieName];
  if (!token) return response.status(401).json({ error: "Unauthorized" });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is required");
    const decoded = jwt.verify(token, secret) as SessionUser;
    const user = await resolveSessionUser({ id: decoded.id, academyId: decoded.academyId });
    if (!user) {
      clearSessionCookie(response);
      return response.status(401).json({ error: "Unauthorized" });
    }
    request.user = user;
    next();
  } catch {
    return response.status(401).json({ error: "Unauthorized" });
  }
}

export function requireCoach(request: Request, response: Response, next: NextFunction) {
  if (!request.user) return response.status(401).json({ error: "Unauthorized" });
  if (request.user.role === "PARENT" || request.user.role === "PLAYER") {
    return response.status(403).json({ error: "Forbidden" });
  }
  next();
}

export function requireRole(role: SessionUser["role"]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user) return response.status(401).json({ error: "Unauthorized" });
    if (request.user.role !== role) return response.status(403).json({ error: "Forbidden" });
    next();
  };
}

export function requirePermission(permission: PermissionKey) {
  return async (request: Request, response: Response, next: NextFunction) => {
    if (!request.user) return response.status(401).json({ error: "Unauthorized" });
    const permissions = await getPermissionsForUser(request.user);
    if (!permissions.includes(permission)) {
      return response.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export function setSessionCookie(response: Response, user: SessionUser) {
  response.cookie(cookieName, signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(cookieName);
}
