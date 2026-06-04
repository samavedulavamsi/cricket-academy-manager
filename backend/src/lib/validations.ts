import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
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
