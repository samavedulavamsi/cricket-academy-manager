DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriptionplan') THEN
    CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permissionkey') THEN
    CREATE TYPE "PermissionKey" AS ENUM (
      'MANAGE_ACADEMY',
      'MANAGE_COACHES',
      'MANAGE_ROLE_PERMISSIONS',
      'MANAGE_PLAYERS',
      'MANAGE_ATTENDANCE',
      'MANAGE_FEES',
      'VIEW_FINANCIALS',
      'VIEW_REPORTS',
      'MANAGE_MATCHES',
      'MANAGE_TOURNAMENTS',
      'VIEW_PARENT_PORTAL',
      'VIEW_SPORTS_NEWS'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitestatus') THEN
    CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audiencetype') THEN
    CREATE TYPE "AudienceType" AS ENUM ('ALL', 'COACHES', 'PARENTS', 'PLAYERS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mediaassettype') THEN
    CREATE TYPE "MediaAssetType" AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Academy" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "Academy_academyCode_key" ON "Academy"("academyCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Academy_subdomain_key" ON "Academy"("subdomain");

INSERT INTO "Academy" (
  "id",
  "name",
  "address",
  "city",
  "state",
  "country",
  "mobileNumber",
  "email",
  "ownerName",
  "subscriptionPlan",
  "academyCode",
  "timeZone",
  "currency",
  "themeColor",
  "createdAt",
  "updatedAt"
)
VALUES (
  'academy_bootstrap_default',
  'DBR Cricket Academy',
  'Main Academy Road',
  'Hyderabad',
  'Telangana',
  'India',
  '9000000000',
  'dbr@gmail.com',
  'Academy Admin',
  'PROFESSIONAL',
  'DBR2026',
  'Asia/Kolkata',
  'INR',
  '#17834b',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole_new') THEN
    DROP TYPE "UserRole_new";
  END IF;
  CREATE TYPE "UserRole_new" AS ENUM (
    'SUPER_ADMIN',
    'ACADEMY_ADMIN',
    'HEAD_COACH',
    'ASSISTANT_COACH',
    'MANAGER',
    'ACCOUNTANT',
    'PARENT',
    'PLAYER'
  );
END $$;

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;

UPDATE "User"
SET "role" = CASE
  WHEN "role" = 'ADMIN' THEN 'SUPER_ADMIN'
  WHEN "role" = 'COACH' THEN 'HEAD_COACH'
  WHEN "role" = 'PARENT' THEN 'PARENT'
  ELSE 'PLAYER'
END;

ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING "role"::"UserRole_new";
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "academyId" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Player"
  ADD COLUMN IF NOT EXISTS "academyId" TEXT,
  ALTER COLUMN "monthlyFeeAmount" SET DEFAULT 0;

ALTER TABLE "PendingRegistration" ADD COLUMN IF NOT EXISTS "academyId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "academyId" TEXT;
ALTER TABLE "ExtraPractice" ADD COLUMN IF NOT EXISTS "academyId" TEXT;
ALTER TABLE "FeePayment" ADD COLUMN IF NOT EXISTS "academyId" TEXT;
ALTER TABLE "PerformanceStat" ADD COLUMN IF NOT EXISTS "academyId" TEXT;
ALTER TABLE "SkillAssessment" ADD COLUMN IF NOT EXISTS "academyId" TEXT;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "academyId" TEXT;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "academyId" TEXT;
ALTER TABLE "PlayerMatchPerformance" ADD COLUMN IF NOT EXISTS "academyId" TEXT;

CREATE TABLE IF NOT EXISTS "AcademySettings" (
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

CREATE TABLE IF NOT EXISTS "RolePermission" (
  "id" TEXT NOT NULL,
  "academyId" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "permission" "PermissionKey" NOT NULL,
  "allowed" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CoachInvitation" (
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

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "academyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CoachFeedback" (
  "id" TEXT NOT NULL,
  "academyId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "coachId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoachFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "academyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "audience" "AudienceType" NOT NULL DEFAULT 'ALL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id" TEXT NOT NULL,
  "academyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "MediaAssetType" NOT NULL DEFAULT 'PHOTO',
  "previewUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DownloadResource" (
  "id" TEXT NOT NULL,
  "academyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "audience" "AudienceType" NOT NULL DEFAULT 'PARENTS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DownloadResource_pkey" PRIMARY KEY ("id")
);

UPDATE "User" SET "academyId" = 'academy_bootstrap_default' WHERE "academyId" IS NULL;
UPDATE "Player" SET "academyId" = 'academy_bootstrap_default' WHERE "academyId" IS NULL;
UPDATE "PendingRegistration" SET "academyId" = 'academy_bootstrap_default' WHERE "academyId" IS NULL;
UPDATE "Attendance" SET "academyId" = 'academy_bootstrap_default' WHERE "academyId" IS NULL;
UPDATE "ExtraPractice" SET "academyId" = 'academy_bootstrap_default' WHERE "academyId" IS NULL;
UPDATE "FeePayment" SET "academyId" = 'academy_bootstrap_default' WHERE "academyId" IS NULL;
UPDATE "PerformanceStat" SET "academyId" = 'academy_bootstrap_default' WHERE "academyId" IS NULL;
UPDATE "SkillAssessment" SET "academyId" = 'academy_bootstrap_default' WHERE "academyId" IS NULL;
UPDATE "Match" SET "academyId" = 'academy_bootstrap_default' WHERE "academyId" IS NULL;
UPDATE "Tournament" SET "academyId" = 'academy_bootstrap_default' WHERE "academyId" IS NULL;
UPDATE "PlayerMatchPerformance" SET "academyId" = 'academy_bootstrap_default' WHERE "academyId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "academyId" SET NOT NULL;
ALTER TABLE "Player" ALTER COLUMN "academyId" SET NOT NULL;
ALTER TABLE "PendingRegistration" ALTER COLUMN "academyId" SET NOT NULL;
ALTER TABLE "Attendance" ALTER COLUMN "academyId" SET NOT NULL;
ALTER TABLE "ExtraPractice" ALTER COLUMN "academyId" SET NOT NULL;
ALTER TABLE "FeePayment" ALTER COLUMN "academyId" SET NOT NULL;
ALTER TABLE "PerformanceStat" ALTER COLUMN "academyId" SET NOT NULL;
ALTER TABLE "SkillAssessment" ALTER COLUMN "academyId" SET NOT NULL;
ALTER TABLE "Match" ALTER COLUMN "academyId" SET NOT NULL;
ALTER TABLE "Tournament" ALTER COLUMN "academyId" SET NOT NULL;
ALTER TABLE "PlayerMatchPerformance" ALTER COLUMN "academyId" SET NOT NULL;

DROP INDEX IF EXISTS "Attendance_date_idx";
DROP INDEX IF EXISTS "Attendance_playerId_date_key";
DROP INDEX IF EXISTS "FeePayment_dueDate_idx";
DROP INDEX IF EXISTS "FeePayment_receiptNumber_key";
DROP INDEX IF EXISTS "FeePayment_status_idx";
DROP INDEX IF EXISTS "Player_playerCode_key";
DROP INDEX IF EXISTS "PlayerMatchPerformance_playerId_matchId_key";
DROP INDEX IF EXISTS "SkillAssessment_playerId_assessmentMonth_key";
DROP INDEX IF EXISTS "User_email_key";

CREATE UNIQUE INDEX IF NOT EXISTS "AcademySettings_academyId_key" ON "AcademySettings"("academyId");
CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_academyId_role_permission_key" ON "RolePermission"("academyId", "role", "permission");
CREATE INDEX IF NOT EXISTS "RolePermission_academyId_role_idx" ON "RolePermission"("academyId", "role");
CREATE UNIQUE INDEX IF NOT EXISTS "CoachInvitation_academyId_email_key" ON "CoachInvitation"("academyId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "CoachInvitation_token_key" ON "CoachInvitation"("token");
CREATE INDEX IF NOT EXISTS "CoachInvitation_academyId_status_idx" ON "CoachInvitation"("academyId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_academyId_userId_idx" ON "PasswordResetToken"("academyId", "userId");
CREATE INDEX IF NOT EXISTS "CoachFeedback_academyId_playerId_createdAt_idx" ON "CoachFeedback"("academyId", "playerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_academyId_audience_createdAt_idx" ON "Notification"("academyId", "audience", "createdAt");
CREATE INDEX IF NOT EXISTS "MediaAsset_academyId_createdAt_idx" ON "MediaAsset"("academyId", "createdAt");
CREATE INDEX IF NOT EXISTS "DownloadResource_academyId_audience_createdAt_idx" ON "DownloadResource"("academyId", "audience", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "User_academyId_email_key" ON "User"("academyId", "email");
CREATE INDEX IF NOT EXISTS "User_academyId_role_idx" ON "User"("academyId", "role");
CREATE UNIQUE INDEX IF NOT EXISTS "Player_academyId_playerCode_key" ON "Player"("academyId", "playerCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Player_academyId_jerseyNumber_key" ON "Player"("academyId", "jerseyNumber");
CREATE INDEX IF NOT EXISTS "Player_academyId_fullName_idx" ON "Player"("academyId", "fullName");
CREATE INDEX IF NOT EXISTS "PendingRegistration_academyId_status_idx" ON "PendingRegistration"("academyId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_academyId_playerId_date_key" ON "Attendance"("academyId", "playerId", "date");
CREATE INDEX IF NOT EXISTS "Attendance_academyId_date_idx" ON "Attendance"("academyId", "date");
CREATE INDEX IF NOT EXISTS "ExtraPractice_academyId_date_idx" ON "ExtraPractice"("academyId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "FeePayment_academyId_receiptNumber_key" ON "FeePayment"("academyId", "receiptNumber");
CREATE INDEX IF NOT EXISTS "FeePayment_academyId_dueDate_idx" ON "FeePayment"("academyId", "dueDate");
CREATE INDEX IF NOT EXISTS "FeePayment_academyId_status_idx" ON "FeePayment"("academyId", "status");
CREATE INDEX IF NOT EXISTS "PerformanceStat_academyId_recordedAt_idx" ON "PerformanceStat"("academyId", "recordedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "SkillAssessment_academyId_playerId_assessmentMonth_key" ON "SkillAssessment"("academyId", "playerId", "assessmentMonth");
CREATE INDEX IF NOT EXISTS "Match_academyId_date_idx" ON "Match"("academyId", "date");
CREATE INDEX IF NOT EXISTS "Tournament_academyId_startDate_idx" ON "Tournament"("academyId", "startDate");
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerMatchPerformance_academyId_playerId_matchId_key" ON "PlayerMatchPerformance"("academyId", "playerId", "matchId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_academyId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Player_academyId_fkey') THEN
    ALTER TABLE "Player" ADD CONSTRAINT "Player_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PendingRegistration_academyId_fkey') THEN
    ALTER TABLE "PendingRegistration" ADD CONSTRAINT "PendingRegistration_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_academyId_fkey') THEN
    ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExtraPractice_academyId_fkey') THEN
    ALTER TABLE "ExtraPractice" ADD CONSTRAINT "ExtraPractice_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeePayment_academyId_fkey') THEN
    ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PerformanceStat_academyId_fkey') THEN
    ALTER TABLE "PerformanceStat" ADD CONSTRAINT "PerformanceStat_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SkillAssessment_academyId_fkey') THEN
    ALTER TABLE "SkillAssessment" ADD CONSTRAINT "SkillAssessment_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Match_academyId_fkey') THEN
    ALTER TABLE "Match" ADD CONSTRAINT "Match_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Tournament_academyId_fkey') THEN
    ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlayerMatchPerformance_academyId_fkey') THEN
    ALTER TABLE "PlayerMatchPerformance" ADD CONSTRAINT "PlayerMatchPerformance_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AcademySettings_academyId_fkey') THEN
    ALTER TABLE "AcademySettings" ADD CONSTRAINT "AcademySettings_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RolePermission_academyId_fkey') THEN
    ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoachInvitation_academyId_fkey') THEN
    ALTER TABLE "CoachInvitation" ADD CONSTRAINT "CoachInvitation_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoachInvitation_invitedById_fkey') THEN
    ALTER TABLE "CoachInvitation" ADD CONSTRAINT "CoachInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_academyId_fkey') THEN
    ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey') THEN
    ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoachFeedback_academyId_fkey') THEN
    ALTER TABLE "CoachFeedback" ADD CONSTRAINT "CoachFeedback_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoachFeedback_playerId_fkey') THEN
    ALTER TABLE "CoachFeedback" ADD CONSTRAINT "CoachFeedback_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoachFeedback_coachId_fkey') THEN
    ALTER TABLE "CoachFeedback" ADD CONSTRAINT "CoachFeedback_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_academyId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MediaAsset_academyId_fkey') THEN
    ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DownloadResource_academyId_fkey') THEN
    ALTER TABLE "DownloadResource" ADD CONSTRAINT "DownloadResource_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
