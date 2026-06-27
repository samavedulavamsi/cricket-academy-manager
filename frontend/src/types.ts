export type SessionUser = {
  id: string;
  academyId: string;
  academyName: string;
  academyCode: string;
  name: string;
  email: string;
  role: string;
  playerId?: string | null;
};

export type Permission =
  | "MANAGE_ACADEMY"
  | "MANAGE_COACHES"
  | "MANAGE_ROLE_PERMISSIONS"
  | "MANAGE_PLAYERS"
  | "MANAGE_ATTENDANCE"
  | "MANAGE_FEES"
  | "VIEW_FINANCIALS"
  | "VIEW_REPORTS"
  | "MANAGE_MATCHES"
  | "MANAGE_TOURNAMENTS"
  | "VIEW_PARENT_PORTAL"
  | "VIEW_SPORTS_NEWS";

export type AcademySummary = {
  id: string;
  name: string;
  academyCode: string;
  city: string;
  state: string;
  country: string;
  logoUrl?: string | null;
  subscriptionPlan: string;
  themeColor: string;
};

export type AcademyProfile = AcademySummary & {
  currency: string;
  timeZone: string;
  ownerName: string;
};

export type Player = {
  id: string;
  academyId: string;
  playerCode: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
  parentName: string;
  parentContactNumber: string;
  address?: string;
  emergencyContact: string;
  playingRole: string;
  battingStyle: string;
  bowlingStyle: string;
  jerseyNumber: number;
  skillLevel: string;
  photoUrl?: string;
  monthlyFeeAmount: number;
  active: boolean;
  feePayments?: FeePayment[];
  attendance?: Attendance[];
  performanceStats?: PerformanceStat[];
  assessments?: Assessment[];
  coachFeedback?: CoachFeedback[];
  matchPerformances?: Array<{
    id: string;
    runs: number;
    balls: number;
    wickets: number;
    catches: number;
    match: Match;
  }>;
  user?: {
    id: string;
    email: string;
    role: string;
  };
};

export type Attendance = {
  id: string;
  playerId: string;
  date: string;
  morningStatus: string;
  eveningStatus: string;
  player?: Player;
};

export type FeePayment = {
  id: string;
  dueDate: string;
  amountPaid: number;
  paymentMethod: string;
  status: string;
  player: Player;
};

export type PerformanceStat = {
  id: string;
  recordedAt: string;
  runsScored: number;
  wickets: number;
  battingAverage: number;
  strikeRate: number;
  economy: number;
  bestBowlingFigures: string;
  catches: number;
  runOuts: number;
  stumpings: number;
  fifties: number;
  hundreds: number;
  player: Player;
};

export type Assessment = {
  id: string;
  assessmentMonth: string;
  footwork: number;
  shotSelection: number;
  timing: number;
  powerHitting: number;
  line: number;
  length: number;
  paceSpin: number;
  swingSpin: number;
  speed: number;
  agility: number;
  endurance: number;
  strength: number;
  catching: number;
  throwing: number;
  reflexes: number;
  player: Player;
};

export type Match = {
  id: string;
  matchName: string;
  opponentTeam: string;
  date: string;
  venue: string;
  result: string;
  performances: Array<{
    id: string;
    runs: number;
    balls: number;
    wickets: number;
    catches: number;
    player: Player;
  }>;
};

export type FeeAlert = {
  feeId: string;
  playerId: string;
  playerName: string;
  parentContactNumber: string;
  dueDate: string;
  pendingAmount: number;
  alertType: string;
};

export type AttendanceSummary = {
  playerId: string;
  name: string;
  present: number;
  absent: number;
  leave: number;
  total: number;
  attendancePercent: number;
};

export type Tournament = {
  id: string;
  name: string;
  season: string;
  startDate: string;
  endDate?: string;
  venue: string;
  status: string;
  notes?: string;
  matches: Match[];
};

export type SportsNewsItem = {
  id: string;
  category: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  imageUrl: string;
  accentColor: string;
  href: string;
};

export type Coach = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  role: string;
  profilePhotoUrl?: string | null;
  createdAt: string;
};

export type CoachInvitation = {
  id: string;
  academyId: string;
  email: string;
  phone?: string | null;
  role: string;
  token: string;
  message?: string | null;
  status: string;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
};

export type RoleConfig = {
  role: string;
  permissions: Permission[];
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  audience: string;
  createdAt: string;
};

export type MediaAsset = {
  id: string;
  title: string;
  type: string;
  previewUrl: string;
  createdAt: string;
};

export type DownloadResource = {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  audience: string;
  createdAt: string;
};

export type CoachFeedback = {
  id: string;
  title: string;
  notes: string;
  createdAt: string;
  coach: {
    name: string;
    title?: string | null;
  };
};
