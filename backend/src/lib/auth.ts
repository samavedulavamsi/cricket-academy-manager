import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";
import { verifyPassword } from "./password.js";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "COACH" | "PARENT" | "STUDENT";
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

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, playerId: user.playerId };
}

export function signSession(user: SessionUser) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return jwt.sign(user, secret, { expiresIn: "7d" });
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies?.[cookieName];
  if (!token) return response.status(401).json({ error: "Unauthorized" });
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is required");
    request.user = jwt.verify(token, secret) as SessionUser;
    next();
  } catch {
    return response.status(401).json({ error: "Unauthorized" });
  }
}

export function requireCoach(request: Request, response: Response, next: NextFunction) {
  if (request.user?.role === "PARENT" || request.user?.role === "STUDENT") {
    return response.status(403).json({ error: "Forbidden" });
  }
  next();
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
