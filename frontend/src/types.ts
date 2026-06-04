export type Player = {
  id: string;
  playerCode: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
  parentName: string;
  parentContactNumber: string;
  playingRole: string;
  battingStyle: string;
  bowlingStyle: string;
  jerseyNumber: number;
  skillLevel: string;
  monthlyFeeAmount: number;
  active: boolean;
  feePayments?: FeePayment[];
  attendance?: Attendance[];
  performanceStats?: PerformanceStat[];
};

export type Attendance = {
  id: string;
  playerId: string;
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
