-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ACADEMY_ADMIN', 'HEAD_COACH', 'ASSISTANT_COACH', 'MANAGER', 'ACCOUNTANT', 'PARENT', 'PLAYER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "PermissionKey" AS ENUM ('MANAGE_ACADEMY', 'MANAGE_COACHES', 'MANAGE_ROLE_PERMISSIONS', 'MANAGE_PLAYERS', 'MANAGE_ATTENDANCE', 'MANAGE_FEES', 'VIEW_FINANCIALS', 'VIEW_REPORTS', 'MANAGE_MATCHES', 'MANAGE_TOURNAMENTS', 'VIEW_PARENT_PORTAL', 'VIEW_SPORTS_NEWS');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "PlayingRole" AS ENUM ('BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('PAID', 'PENDING', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('WON', 'LOST', 'DRAW');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('ALL', 'COACHES', 'PARENTS', 'PLAYERS');

-- CreateEnum
CREATE TYPE "MediaAssetType" AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT');

-- CreateTable
CREATE TABLE "Academy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "ownerName" TEXT NOT NULL,
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "academyCode" TEXT NOT NULL,
    "subdomain" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "themeColor" TEXT NOT NULL DEFAULT '#17834b',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Academy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademySettings" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "dashboardTitle" TEXT NOT NULL,
    "dashboardDescription" TEXT NOT NULL,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "allowParentSelfSignup" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "permission" "PermissionKey" NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "playerId" TEXT,
    "phone" TEXT,
    "profilePhotoUrl" TEXT,
    "title" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachInvitation" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "message" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "playerCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentContactNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bloodGroup" TEXT,
    "emergencyContact" TEXT NOT NULL,
    "playingRole" "PlayingRole" NOT NULL,
    "battingStyle" TEXT NOT NULL,
    "bowlingStyle" TEXT NOT NULL,
    "jerseyNumber" INTEGER NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "skillLevel" "SkillLevel" NOT NULL,
    "photoUrl" TEXT,
    "idProofUrl" TEXT,
    "monthlyFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "admissionFee" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingRegistration" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentContactNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bloodGroup" TEXT,
    "emergencyContact" TEXT NOT NULL,
    "playingRole" "PlayingRole" NOT NULL,
    "battingStyle" TEXT NOT NULL,
    "bowlingStyle" TEXT NOT NULL,
    "jerseyNumber" INTEGER,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "skillLevel" "SkillLevel" NOT NULL,
    "monthlyFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "admissionFee" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'GOOGLE_FORMS',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "morningStatus" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "eveningStatus" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtraPractice" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "practiceType" TEXT NOT NULL,
    "durationMins" INTEGER NOT NULL,
    "coachRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtraPractice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "status" "FeeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceStat" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "innings" INTEGER NOT NULL DEFAULT 0,
    "runsScored" INTEGER NOT NULL DEFAULT 0,
    "highestScore" INTEGER NOT NULL DEFAULT 0,
    "battingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strikeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boundaries" INTEGER NOT NULL DEFAULT 0,
    "fifties" INTEGER NOT NULL DEFAULT 0,
    "hundreds" INTEGER NOT NULL DEFAULT 0,
    "oversBowled" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "economy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestBowlingFigures" TEXT,
    "maidens" INTEGER NOT NULL DEFAULT 0,
    "catches" INTEGER NOT NULL DEFAULT 0,
    "runOuts" INTEGER NOT NULL DEFAULT 0,
    "stumpings" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PerformanceStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillAssessment" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "assessmentMonth" TIMESTAMP(3) NOT NULL,
    "footwork" INTEGER NOT NULL,
    "shotSelection" INTEGER NOT NULL,
    "timing" INTEGER NOT NULL,
    "powerHitting" INTEGER NOT NULL,
    "line" INTEGER NOT NULL,
    "length" INTEGER NOT NULL,
    "paceSpin" INTEGER NOT NULL,
    "swingSpin" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "agility" INTEGER NOT NULL,
    "endurance" INTEGER NOT NULL,
    "strength" INTEGER NOT NULL,
    "catching" INTEGER NOT NULL,
    "throwing" INTEGER NOT NULL,
    "reflexes" INTEGER NOT NULL,
    "coachNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "tournamentId" TEXT,
    "matchName" TEXT NOT NULL,
    "opponentTeam" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "result" "MatchResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "venue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerMatchPerformance" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "balls" INTEGER NOT NULL DEFAULT 0,
    "fours" INTEGER NOT NULL DEFAULT 0,
    "sixes" INTEGER NOT NULL DEFAULT 0,
    "overs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runsConceded" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "catches" INTEGER NOT NULL DEFAULT 0,
    "runOuts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachFeedback" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "audience" "AudienceType" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "MediaAssetType" NOT NULL DEFAULT 'PHOTO',
    "previewUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadResource" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "audience" "AudienceType" NOT NULL DEFAULT 'PARENTS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Academy_academyCode_key" ON "Academy"("academyCode");

-- CreateIndex
CREATE UNIQUE INDEX "Academy_subdomain_key" ON "Academy"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "AcademySettings_academyId_key" ON "AcademySettings"("academyId");

-- CreateIndex
CREATE INDEX "RolePermission_academyId_role_idx" ON "RolePermission"("academyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_academyId_role_permission_key" ON "RolePermission"("academyId", "role", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");

-- CreateIndex
CREATE INDEX "User_academyId_role_idx" ON "User"("academyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "User_academyId_email_key" ON "User"("academyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "CoachInvitation_token_key" ON "CoachInvitation"("token");

-- CreateIndex
CREATE INDEX "CoachInvitation_academyId_status_idx" ON "CoachInvitation"("academyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CoachInvitation_academyId_email_key" ON "CoachInvitation"("academyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_academyId_userId_idx" ON "PasswordResetToken"("academyId", "userId");

-- CreateIndex
CREATE INDEX "Player_academyId_fullName_idx" ON "Player"("academyId", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Player_academyId_playerCode_key" ON "Player"("academyId", "playerCode");

-- CreateIndex
CREATE UNIQUE INDEX "Player_academyId_jerseyNumber_key" ON "Player"("academyId", "jerseyNumber");

-- CreateIndex
CREATE INDEX "PendingRegistration_academyId_status_idx" ON "PendingRegistration"("academyId", "status");

-- CreateIndex
CREATE INDEX "Attendance_academyId_date_idx" ON "Attendance"("academyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_academyId_playerId_date_key" ON "Attendance"("academyId", "playerId", "date");

-- CreateIndex
CREATE INDEX "ExtraPractice_academyId_date_idx" ON "ExtraPractice"("academyId", "date");

-- CreateIndex
CREATE INDEX "FeePayment_academyId_dueDate_idx" ON "FeePayment"("academyId", "dueDate");

-- CreateIndex
CREATE INDEX "FeePayment_academyId_status_idx" ON "FeePayment"("academyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FeePayment_academyId_receiptNumber_key" ON "FeePayment"("academyId", "receiptNumber");

-- CreateIndex
CREATE INDEX "PerformanceStat_academyId_recordedAt_idx" ON "PerformanceStat"("academyId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SkillAssessment_academyId_playerId_assessmentMonth_key" ON "SkillAssessment"("academyId", "playerId", "assessmentMonth");

-- CreateIndex
CREATE INDEX "Match_academyId_date_idx" ON "Match"("academyId", "date");

-- CreateIndex
CREATE INDEX "Tournament_academyId_startDate_idx" ON "Tournament"("academyId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchPerformance_academyId_playerId_matchId_key" ON "PlayerMatchPerformance"("academyId", "playerId", "matchId");

-- CreateIndex
CREATE INDEX "CoachFeedback_academyId_playerId_createdAt_idx" ON "CoachFeedback"("academyId", "playerId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_academyId_audience_createdAt_idx" ON "Notification"("academyId", "audience", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_academyId_createdAt_idx" ON "MediaAsset"("academyId", "createdAt");

-- CreateIndex
CREATE INDEX "DownloadResource_academyId_audience_createdAt_idx" ON "DownloadResource"("academyId", "audience", "createdAt");

-- AddForeignKey
ALTER TABLE "AcademySettings" ADD CONSTRAINT "AcademySettings_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachInvitation" ADD CONSTRAINT "CoachInvitation_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachInvitation" ADD CONSTRAINT "CoachInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingRegistration" ADD CONSTRAINT "PendingRegistration_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraPractice" ADD CONSTRAINT "ExtraPractice_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraPractice" ADD CONSTRAINT "ExtraPractice_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceStat" ADD CONSTRAINT "PerformanceStat_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceStat" ADD CONSTRAINT "PerformanceStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillAssessment" ADD CONSTRAINT "SkillAssessment_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillAssessment" ADD CONSTRAINT "SkillAssessment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchPerformance" ADD CONSTRAINT "PlayerMatchPerformance_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchPerformance" ADD CONSTRAINT "PlayerMatchPerformance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMatchPerformance" ADD CONSTRAINT "PlayerMatchPerformance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachFeedback" ADD CONSTRAINT "CoachFeedback_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachFeedback" ADD CONSTRAINT "CoachFeedback_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachFeedback" ADD CONSTRAINT "CoachFeedback_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadResource" ADD CONSTRAINT "DownloadResource_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

