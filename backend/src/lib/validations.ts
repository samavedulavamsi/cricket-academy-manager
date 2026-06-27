import { z } from "zod";

const roleSchema = z.enum([
  "SUPER_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "ASSISTANT_COACH",
  "MANAGER",
  "ACCOUNTANT",
  "PARENT",
  "PLAYER"
]);

const permissionSchema = z.enum([
  "MANAGE_ACADEMY",
  "MANAGE_COACHES",
  "MANAGE_ROLE_PERMISSIONS",
  "MANAGE_PLAYERS",
  "MANAGE_ATTENDANCE",
  "MANAGE_FEES",
  "VIEW_FINANCIALS",
  "VIEW_REPORTS",
  "MANAGE_MATCHES",
  "MANAGE_TOURNAMENTS",
  "VIEW_PARENT_PORTAL",
  "VIEW_SPORTS_NEWS"
]);

export const academyRegistrationSchema = z.object({
  academyName: z.string().min(2),
  logoUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2),
  mobileNumber: z.string().min(8),
  email: z.string().email(),
  website: z.string().url().optional().or(z.literal("")),
  ownerName: z.string().min(2),
  subscriptionPlan: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).default("FREE"),
  timeZone: z.string().min(2).default("Asia/Kolkata"),
  currency: z.string().min(3).default("INR"),
  themeColor: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  subdomain: z.string().regex(/^[a-z0-9-]+$/).min(3).max(32).optional().or(z.literal("")),
  superAdminName: z.string().min(2),
  superAdminEmail: z.string().email(),
  superAdminPassword: z.string().min(8),
  superAdminPhone: z.string().min(8),
  firstCoachName: z.string().min(2),
  firstCoachEmail: z.string().email(),
  firstCoachPassword: z.string().min(8),
  firstCoachPhone: z.string().min(8)
});

export const loginSchema = z.object({
  academyCode: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8)
});

export const forgotPasswordSchema = z.object({
  academyCode: z.string().min(3),
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8)
});

export const playerRegistrationSchema = z.object({
  academyCode: z.string().min(3),
  playerCode: z.string().min(3),
  parentContactNumber: z.string().min(8),
  email: z.string().email(),
  password: z.string().min(8)
});

export const coachInvitationSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(8).optional(),
  role: roleSchema.refine((value) => !["PARENT", "PLAYER"].includes(value), "Coach invitation role is invalid"),
  message: z.string().max(400).optional()
});

export const coachRegistrationSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2),
  password: z.string().min(8),
  phone: z.string().min(8),
  title: z.string().min(2).optional().or(z.literal("")),
  profilePhotoUrl: z.string().url().optional().or(z.literal(""))
});

export const coachProfileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8).optional().or(z.literal("")),
  title: z.string().min(2).optional().or(z.literal("")),
  profilePhotoUrl: z.string().url().optional().or(z.literal(""))
});

export const rolePermissionSchema = z.object({
  permissions: z.array(permissionSchema).min(1)
});

export const coachRoleSchema = z.object({
  role: roleSchema.refine((value) => !["PARENT", "PLAYER"].includes(value), "Coach role is invalid")
});

export const playerSchema = z.object({
  fullName: z.string().min(2),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  mobileNumber: z.string().min(8),
  parentName: z.string().min(2),
  parentContactNumber: z.string().min(8),
  address: z.string().min(2),
  bloodGroup: z.string().optional(),
  emergencyContact: z.string().min(8),
  playingRole: z.enum(["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"]),
  battingStyle: z.string().min(2),
  bowlingStyle: z.string().min(2),
  jerseyNumber: z.coerce.number().int().positive(),
  joiningDate: z.coerce.date(),
  skillLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  monthlyFeeAmount: z.coerce.number().int().nonnegative(),
  admissionFee: z.coerce.number().int().nonnegative().default(0),
  discount: z.coerce.number().int().nonnegative().default(0),
  portalEmail: z.string().email().optional().or(z.literal("")),
  portalPassword: z.string().min(8).optional().or(z.literal(""))
});

export const attendanceSchema = z.object({
  playerId: z.string(),
  date: z.coerce.date(),
  morningStatus: z.enum(["PRESENT", "ABSENT", "LEAVE"]),
  eveningStatus: z.enum(["PRESENT", "ABSENT", "LEAVE"])
});

export const googleFormPlayerSchema = z.object({
  academyCode: z.string().min(3),
  fullName: z.string().min(2),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).default("MALE"),
  mobileNumber: z.string().min(8),
  parentName: z.string().min(2),
  parentContactNumber: z.string().min(8),
  address: z.string().min(2),
  bloodGroup: z.string().optional(),
  emergencyContact: z.string().min(8),
  playingRole: z.enum(["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"]).default("BATSMAN"),
  battingStyle: z.string().min(2).default("Right Hand Bat"),
  bowlingStyle: z.string().min(2).default("None"),
  jerseyNumber: z.coerce.number().int().positive().optional(),
  joiningDate: z.coerce.date().default(() => new Date()),
  skillLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("BEGINNER"),
  monthlyFeeAmount: z.coerce.number().int().nonnegative().default(0),
  admissionFee: z.coerce.number().int().nonnegative().default(0),
  discount: z.coerce.number().int().nonnegative().default(0),
  portalEmail: z.string().email().optional().or(z.literal("")),
  portalPassword: z.string().min(8).optional().or(z.literal(""))
});

export const playerPhotoSchema = z.object({
  photoUrl: z.string().min(10)
});

export const jerseySchema = z.object({
  jerseyNumber: z.coerce.number().int().positive()
});

export const tournamentSchema = z.object({
  name: z.string().min(2),
  season: z.string().min(2),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().or(z.literal("")),
  venue: z.string().min(2),
  status: z.string().min(2).default("UPCOMING"),
  notes: z.string().optional()
});

export const whatsappReminderSchema = z.object({
  feeIds: z.array(z.string()).optional()
});
