import { useEffect, useMemo, useState } from "react";
import { BarChart3, Bell, CalendarCheck, CreditCard, FileDown, Gauge, Medal, MessageCircle, Shirt, Trophy, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ageFromDob, api, inr } from "./api";
import type { Assessment, Attendance, AttendanceSummary, FeeAlert, FeePayment, Match, PerformanceStat, Player, Tournament } from "./types";

type User = { id: string; name: string; email: string; role: string; playerId?: string | null };
type Section = "Dashboard" | "Players" | "Attendance" | "Attendance Reports" | "Fees" | "Fee Alerts" | "WhatsApp" | "Jerseys" | "Performance" | "Improvement" | "Match Dashboard" | "Matches" | "Tournaments" | "Reports";

const nav: Array<{ label: Section; icon: typeof Gauge }> = [
  { label: "Dashboard", icon: Gauge },
  { label: "Players", icon: Users },
  { label: "Attendance", icon: CalendarCheck },
  { label: "Attendance Reports", icon: FileDown },
  { label: "Fees", icon: CreditCard },
  { label: "Fee Alerts", icon: Bell },
  { label: "WhatsApp", icon: MessageCircle },
  { label: "Jerseys", icon: Shirt },
  { label: "Performance", icon: BarChart3 },
  { label: "Improvement", icon: Medal },
  { label: "Match Dashboard", icon: BarChart3 },
  { label: "Matches", icon: Trophy },
  { label: "Tournaments", icon: Trophy },
  { label: "Reports", icon: FileDown }
];

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [section, setSection] = useState<Section>("Dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User }>("/api/auth/me").then((data) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading academy console...</div>;
  if (!user) return <Login onLogin={setUser} />;
  if (user.role === "PARENT" || user.role === "STUDENT") return <StudentPortal user={user} onLogout={() => api("/api/auth/logout", { method: "POST" }).then(() => setUser(null))} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-field" aria-hidden="true" />
        <div className="brand"><div className="brand-mark">CA</div><div><strong>Cricket Academy</strong><span>Elite Player Hub</span></div></div>
        <nav>
          {nav.map((item) => <button className={section === item.label ? "active" : ""} key={item.label} onClick={() => setSection(item.label)}><item.icon size={18} />{item.label}</button>)}
        </nav>
      </aside>
      <main>
        <header className="topbar">
          <div><h1>{section}</h1><p>{subtitle(section)}</p></div>
          <button className="ghost" onClick={() => api("/api/auth/logout", { method: "POST" }).then(() => setUser(null))}>Logout</button>
        </header>
        <Module section={section} />
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"coach" | "player" | "register">("coach");
  const credentials = mode === "coach"
    ? { title: "Coach Login", helper: "Access player management, attendance, fees, reports, and academy operations." }
    : mode === "player"
      ? { title: "Player Login", helper: "Access your attendance, fee status, performance, and progress reports." }
      : { title: "Create Player Account", helper: "Use the player code from your coach and parent contact number to create your password." };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "register") {
        const data = await api<{ user: User }>("/api/auth/player-register", {
          method: "POST",
          body: JSON.stringify({
            playerCode: form.get("playerCode"),
            parentContactNumber: form.get("parentContactNumber"),
            email: form.get("email"),
            password: form.get("password")
          })
        });
        onLogin(data.user);
        return;
      }
      const data = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") })
      });
      onLogin(data.user);
    } catch {
      setError("Invalid email or password.");
    }
  }
  return (
    <main className="login-page">
      <div className="login-orbit" aria-hidden="true">
        <span className="cricket-ball ball-one" />
        <span className="cricket-ball ball-two" />
        <span className="pitch-lines" />
      </div>
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">CA</div>
        <div className="login-tabs">
          <button className={mode === "coach" ? "active" : ""} type="button" onClick={() => setMode("coach")}>Coach</button>
          <button className={mode === "player" ? "active" : ""} type="button" onClick={() => setMode("player")}>Player</button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>Create</button>
        </div>
        <h1>{credentials.title}</h1>
        <p>{credentials.helper}</p>
        {mode === "register" && <label>Player Code<input name="playerCode" placeholder="Example: CA-2026-001" /></label>}
        {mode === "register" && <label>Parent Contact<input name="parentContactNumber" placeholder="Parent mobile number" /></label>}
        <label>Email<input key={`${mode}-email`} name="email" type="email" placeholder={mode === "coach" ? "coach@youracademy.com" : "player@youracademy.com"} autoComplete="email" /></label>
        <label>Password<input key={`${mode}-password`} name="password" type="password" placeholder={mode === "register" ? "Create password" : "Enter password"} autoComplete={mode === "register" ? "new-password" : "current-password"} /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary">Sign in</button>
      </form>
    </main>
  );
}

function StudentPortal({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [data, setData] = useState<{ players: Player[]; attendance: Attendance[]; fees: FeePayment[]; stats: PerformanceStat[] } | null>(null);
  useEffect(() => {
    api<{ players: Player[]; attendance: Attendance[]; fees: FeePayment[]; stats: PerformanceStat[] }>("/api/dashboard").then(setData);
  }, []);
  const player = data?.players[0];
  const attendance = data?.attendance.find((row) => row.playerId === player?.id);
  const fee = data?.fees.find((row) => row.player.id === player?.id);
  const stats = data?.stats.find((row) => row.player.id === player?.id);

  return (
    <div className="student-shell">
      <header className="student-top">
        <span className="student-ball" aria-hidden="true" />
        <span className="student-pitch" aria-hidden="true" />
        <div>
          <span className="eyebrow">Player Portal</span>
          <h1>Welcome, {player?.fullName ?? user.name}</h1>
          <p>View attendance, fee status, performance, and progress shared by your academy.</p>
        </div>
        <button className="ghost" onClick={onLogout}>Logout</button>
      </header>
      {!data ? <div className="content"><div className="panel">Loading student profile...</div></div> : (
        <main className="content">
          <div className="stats">
            <Stat label="Player ID" value={player?.playerCode ?? "-"} />
            <Stat label="Skill Level" value={player?.skillLevel ?? "-"} />
            <Stat label="Morning" value={attendance?.morningStatus ?? "-"} />
            <Stat label="Evening" value={attendance?.eveningStatus ?? "-"} />
          </div>
          <div className="grid two">
            <Panel title="My Cricket Profile">
              <ListItem title={player?.playingRole.replaceAll("_", " ") ?? "Role"} meta={`${player?.battingStyle ?? "-"} · ${player?.bowlingStyle ?? "-"}`} badge={`Jersey #${player?.jerseyNumber ?? "-"}`} />
              <ListItem title="Parent Contact" meta={`${player?.parentName ?? "-"} · ${player?.parentContactNumber ?? "-"}`} />
            </Panel>
            <Panel title="My Fee Status">
              <ListItem title={fee?.status ?? "PENDING"} meta={`${inr(Math.max((player?.monthlyFeeAmount ?? 0) - (fee?.amountPaid ?? 0), 0))} pending`} badge={fee?.paymentMethod ?? "UPI"} />
            </Panel>
          </div>
          <Panel title="My Performance">
            <div className="stats">
              <Stat label="Runs" value={stats?.runsScored ?? 0} />
              <Stat label="Wickets" value={stats?.wickets ?? 0} />
              <Stat label="Average" value={stats?.battingAverage ?? 0} />
              <Stat label="Catches" value={stats?.catches ?? 0} />
            </div>
          </Panel>
        </main>
      )}
    </div>
  );
}

function Module({ section }: { section: Section }) {
  const [data, setData] = useState<any>(null);
  const endpoint = useMemo(() => endpointFor(section), [section]);
  useEffect(() => {
    setData(null);
    api(endpoint).then(setData).catch((error) => setData({ error: String(error) }));
  }, [endpoint]);
  if (!data) return <div className="content"><div className="panel">Loading {section.toLowerCase()}...</div></div>;
  if (data.error) return <div className="content"><div className="panel error">{data.error}</div></div>;

  if (section === "Dashboard") return <Dashboard data={data} />;
  if (section === "Players") return <Players data={data} reload={() => api(endpoint).then(setData)} />;
  if (section === "Attendance") return <AttendancePage data={data} reload={() => api(endpoint).then(setData)} />;
  if (section === "Attendance Reports") return <AttendanceReports data={data} />;
  if (section === "Fees") return <Fees data={data} />;
  if (section === "Fee Alerts") return <FeeAlerts data={data} />;
  if (section === "WhatsApp") return <WhatsAppReminders />;
  if (section === "Jerseys") return <Jerseys data={data} reload={() => api(endpoint).then(setData)} />;
  if (section === "Performance") return <Performance data={data} />;
  if (section === "Improvement") return <Improvement data={data} />;
  if (section === "Match Dashboard") return <MatchDashboard data={data} />;
  if (section === "Matches") return <Matches data={data} />;
  if (section === "Tournaments") return <Tournaments data={data} reload={() => api(endpoint).then(setData)} />;
  return <Reports />;
}

function endpointFor(section: Section) {
  const endpoints: Record<Section, string> = {
    Dashboard: "/api/dashboard",
    Players: "/api/players",
    Attendance: "/api/attendance",
    "Attendance Reports": "/api/attendance/reports",
    Fees: "/api/fees",
    "Fee Alerts": "/api/fee-alerts",
    WhatsApp: "/api/fee-alerts",
    Jerseys: "/api/players",
    Performance: "/api/performance",
    Improvement: "/api/improvement",
    "Match Dashboard": "/api/match-dashboard",
    Matches: "/api/matches",
    Tournaments: "/api/tournaments",
    Reports: "/api/dashboard"
  };
  return endpoints[section];
}

function Dashboard({ data }: { data: { players: Player[]; attendance: Attendance[]; fees: FeePayment[]; stats: PerformanceStat[] } }) {
  const presentToday = data.attendance.filter((row) => row.morningStatus === "PRESENT" || row.eveningStatus === "PRESENT").length;
  const collection = data.fees.reduce((sum, fee) => sum + fee.amountPaid, 0);
  const pending = data.fees.reduce((sum, fee) => sum + (fee.status === "PAID" ? 0 : fee.player.monthlyFeeAmount - fee.amountPaid), 0);
  return (
    <div className="content">
      {data.players.length === 0 && <EmptyState title="No players yet" body="Add your first player from the Players form, or connect Google Forms to import registrations automatically." />}
      <div className="stats">
        <Stat label="Total Players" value={data.players.length} />
        <Stat label="Present Today" value={presentToday} />
        <Stat label="Monthly Collection" value={inr(collection)} />
        <Stat label="Pending Fees" value={inr(pending)} />
      </div>
      <div className="grid two">
        <Panel title="Attendance Trend"><ChartLine data={data.players.map((p, i) => ({ name: p.fullName.split(" ")[0], value: 72 + i * 4 }))} /></Panel>
        <Panel title="Fee Notifications">{data.fees.filter((f) => f.status !== "PAID").map((fee) => <ListItem key={fee.id} title={fee.player.fullName} meta={`${inr(fee.player.monthlyFeeAmount - fee.amountPaid)} due`} badge={fee.status} />)}</Panel>
      </div>
      <Panel title="Performance Trends"><ChartBars data={data.stats.map((s) => ({ name: s.player.fullName.split(" ")[0], runs: s.runsScored, wickets: s.wickets }))} /></Panel>
    </div>
  );
}

function Players({ data, reload }: { data: { players: Player[] }; reload: () => void }) {
  const [profile, setProfile] = useState<Player | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/players", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
    event.currentTarget.reset();
    reload();
  }
  async function openProfile(player: Player) {
    const data = await api<{ player: Player }>(`/api/players/${player.id}`);
    setProfile(data.player);
  }
  if (profile) return <PlayerProfile player={profile} onBack={() => setProfile(null)} />;
  return (
    <div className="content grid form-grid">
      <Panel title="Player Records">{data.players.length ? <PlayerTable players={data.players} reload={reload} onView={openProfile} onDelete={async (player) => { if (confirm(`Remove ${player.fullName} and all linked details?`)) { await api(`/api/players/${player.id}`, { method: "DELETE" }); reload(); } }} /> : <EmptyState title="No player records" body="Use the form on this page to add your academy players." />}</Panel>
      <Panel title="Add Player">
        <form className="stack" onSubmit={submit}>
          <Input name="fullName" label="Full Name" />
          <Input name="dateOfBirth" label="Date of Birth" type="date" />
          <Select name="gender" values={["MALE", "FEMALE", "OTHER"]} />
          <Input name="mobileNumber" label="Mobile Number" />
          <Input name="parentName" label="Parent Name" />
          <Input name="parentContactNumber" label="Parent Contact" />
          <Input name="address" label="Address" />
          <Input name="bloodGroup" label="Blood Group" required={false} />
          <Input name="emergencyContact" label="Emergency Contact" />
          <Select name="playingRole" values={["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"]} />
          <Input name="battingStyle" label="Batting Style" defaultValue="Right Hand Bat" />
          <Input name="bowlingStyle" label="Bowling Style" defaultValue="Off Spin" />
          <Input name="jerseyNumber" label="Jersey Number" type="number" />
          <Input name="joiningDate" label="Joining Date" type="date" />
          <Select name="skillLevel" values={["BEGINNER", "INTERMEDIATE", "ADVANCED"]} />
          <Input name="monthlyFeeAmount" label="Monthly Fee" type="number" />
          <Input name="admissionFee" label="Admission Fee" type="number" defaultValue="5000" />
          <Input name="discount" label="Discount" type="number" defaultValue="0" />
          <div className="form-note">
            <strong>Player login</strong>
            <span>After saving, share the Player Code. The player can create their own account from the Create tab using Player Code + Parent Contact.</span>
          </div>
          <button className="primary">Save Player</button>
        </form>
      </Panel>
    </div>
  );
}

function PlayerProfile({ player, onBack }: { player: Player; onBack: () => void }) {
  const latestFee = player.feePayments?.[0];
  const latestStats = player.performanceStats?.[0];
  const latestAttendance = player.attendance?.[0];
  const pendingAmount = latestFee ? Math.max(player.monthlyFeeAmount - latestFee.amountPaid, 0) : player.monthlyFeeAmount;
  return (
    <div className="content profile-page">
      <section className="profile-hero">
        <button className="ghost" onClick={onBack}>Back to Players</button>
        <div className="profile-main">
          <div className="profile-photo">{player.photoUrl ? <img src={player.photoUrl} alt="" /> : initials(player.fullName)}</div>
          <div>
            <span className="eyebrow">Player Profile</span>
            <h2>{player.fullName}</h2>
            <p>{player.playerCode} · Jersey #{player.jerseyNumber} · {player.playingRole.replaceAll("_", " ")}</p>
          </div>
        </div>
      </section>

      <div className="stats">
        <Stat label="Skill Level" value={player.skillLevel} />
        <Stat label="Monthly Fee" value={inr(player.monthlyFeeAmount)} />
        <Stat label="Pending" value={inr(pendingAmount)} />
        <Stat label="Portal" value={player.user?.email ? "Active" : "Not Created"} />
      </div>

      <div className="grid two">
        <Panel title="Personal Details">
          <ListItem title="Age" meta={`${ageFromDob(player.dateOfBirth)} years`} />
          <ListItem title="Gender" meta={player.gender} />
          <ListItem title="Mobile" meta={player.mobileNumber} />
          <ListItem title="Address" meta={player.address ?? "Not added"} />
        </Panel>
        <Panel title="Parent and Emergency">
          <ListItem title={player.parentName} meta={`Parent contact: ${player.parentContactNumber}`} />
          <ListItem title="Portal Login" meta={player.user?.email ?? "Player has not created account yet"} />
        </Panel>
      </div>

      <div className="grid two">
        <Panel title="Cricket Details">
          <ListItem title="Batting Style" meta={player.battingStyle} />
          <ListItem title="Bowling Style" meta={player.bowlingStyle} />
          <ListItem title="Current Role" meta={player.playingRole.replaceAll("_", " ")} />
        </Panel>
        <Panel title="Latest Attendance">
          {latestAttendance ? <>
            <ListItem title="Morning Session" meta={latestAttendance.morningStatus} />
            <ListItem title="Evening Session" meta={latestAttendance.eveningStatus} />
          </> : <EmptyState title="No attendance yet" body="Attendance will appear after marking sessions." />}
        </Panel>
      </div>

      <div className="grid two">
        <Panel title="Fee History">
          {player.feePayments?.length ? <table><tbody>{player.feePayments.map((fee) => <tr key={fee.id}><td>{new Date(fee.dueDate).toLocaleDateString("en-IN")}</td><td>{inr(fee.amountPaid)}</td><td><Badge>{fee.status}</Badge></td></tr>)}</tbody></table> : <EmptyState title="No fee history" body="Fee records will appear here." />}
        </Panel>
        <Panel title="Performance">
          {latestStats ? <div className="stats mini-stats"><Stat label="Runs" value={latestStats.runsScored} /><Stat label="Wickets" value={latestStats.wickets} /><Stat label="Average" value={latestStats.battingAverage} /><Stat label="Catches" value={latestStats.catches} /></div> : <EmptyState title="No performance stats" body="Performance will appear after match or practice entries." />}
        </Panel>
      </div>

      <Panel title="Recent Matches">
        {player.matchPerformances?.length ? player.matchPerformances.map((item) => <ListItem key={item.id} title={item.match.matchName} meta={`${item.runs} runs, ${item.wickets} wickets, ${item.catches} catches`} badge={item.match.result} />) : <EmptyState title="No match records" body="Match performance will appear here." />}
      </Panel>
    </div>
  );
}

function AttendancePage({ data, reload }: { data: { attendance: Attendance[] }; reload: () => void }) {
  async function save(row: Attendance, form: HTMLFormElement) {
    const values = Object.fromEntries(new FormData(form));
    await api("/api/attendance", { method: "POST", body: JSON.stringify({ ...values, playerId: row.playerId, date: "2026-06-03" }) });
    reload();
  }
  return <div className="content cards">{data.attendance.map((row) => <form className="panel" key={row.id} onSubmit={(e) => { e.preventDefault(); save(row, e.currentTarget); }}><h2>{row.player?.fullName}</h2><Select name="morningStatus" values={["PRESENT", "ABSENT", "LEAVE"]} defaultValue={row.morningStatus} /><Select name="eveningStatus" values={["PRESENT", "ABSENT", "LEAVE"]} defaultValue={row.eveningStatus} /><button className="primary">Save Attendance</button></form>)}</div>;
}

function Fees({ data }: { data: { fees: FeePayment[] } }) {
  return <div className="content"><Panel title="Fee Ledger">{data.fees.length ? <table><tbody>{data.fees.map((fee) => <tr key={fee.id}><td>{fee.player.fullName}</td><td>{inr(fee.amountPaid)}</td><td>{inr(Math.max(fee.player.monthlyFeeAmount - fee.amountPaid, 0))}</td><td><Badge>{fee.status}</Badge></td></tr>)}</tbody></table> : <EmptyState title="No fee records" body="Fee entries will appear once players and payments are added." />}</Panel></div>;
}

function FeeAlerts({ data }: { data: { alerts: FeeAlert[] } }) {
  return <div className="content cards">{data.alerts.length ? data.alerts.map((alert) => <Panel key={alert.feeId} title={alert.playerName}><ListItem title={alert.alertType.replace("_", " ")} meta={`Due ${new Date(alert.dueDate).toLocaleDateString("en-IN")} - ${inr(alert.pendingAmount)} pending`} badge={alert.parentContactNumber} /></Panel>) : <EmptyState title="No fee alerts" body="Pending and overdue fee alerts will appear here." />}</div>;
}

function WhatsAppReminders() {
  const [reminders, setReminders] = useState<Array<{ feeId: string; playerName: string; parentName: string; phone: string; pendingAmount: number; whatsappUrl: string }> | null>(null);
  async function generate() {
    const data = await api<{ reminders: Array<{ feeId: string; playerName: string; parentName: string; phone: string; pendingAmount: number; whatsappUrl: string }> }>("/api/whatsapp/fee-reminders", { method: "POST", body: JSON.stringify({}) });
    setReminders(data.reminders);
  }
  return <div className="content"><Panel title="WhatsApp Fee Reminders"><p className="muted-copy">Generate click-to-send WhatsApp links for parents with pending fees.</p><button className="primary" onClick={generate}>Generate Reminder Links</button>{reminders && (reminders.length ? <div className="reminder-list">{reminders.map((item) => <div className="list-item" key={item.feeId}><div><strong>{item.playerName}</strong><span>{item.parentName} - {inr(item.pendingAmount)} pending</span></div><a className="primary link small-link" href={item.whatsappUrl} target="_blank">Open WhatsApp</a></div>)}</div> : <EmptyState title="No pending fee reminders" body="There are no unpaid fee records to remind right now." />)}</Panel></div>;
}

function AttendanceReports({ data }: { data: { summary: AttendanceSummary[] } }) {
  return <div className="content"><Panel title="Attendance Reports">{data.summary.length ? <table><tbody>{data.summary.map((row) => <tr key={row.playerId}><td><strong>{row.name}</strong></td><td>{row.present} present</td><td>{row.absent} absent</td><td>{row.leave} leave</td><td><Badge>{row.attendancePercent}%</Badge></td></tr>)}</tbody></table> : <EmptyState title="No attendance data" body="Mark attendance to generate daily, weekly, and monthly reports." />}</Panel></div>;
}

function Jerseys({ data, reload }: { data: { players: Player[] }; reload: () => void }) {
  async function save(player: Player, form: HTMLFormElement) {
    const jerseyNumber = new FormData(form).get("jerseyNumber");
    await api(`/api/players/${player.id}/jersey`, { method: "PATCH", body: JSON.stringify({ jerseyNumber }) });
    reload();
  }
  return <div className="content cards">{data.players.length ? data.players.map((player) => <form className="panel" key={player.id} onSubmit={(event) => { event.preventDefault(); save(player, event.currentTarget); }}><h2>{player.fullName}</h2><Input name="jerseyNumber" label="Jersey Number" type="number" defaultValue={String(player.jerseyNumber)} /><button className="primary">Save Jersey</button></form>) : <EmptyState title="No jerseys assigned" body="Add players first, then manage jersey numbers here." />}</div>;
}

function Performance({ data }: { data: { stats: PerformanceStat[] } }) {
  return <div className="content"><Panel title="Runs and Wickets">{data.stats.length ? <ChartBars data={data.stats.map((s) => ({ name: s.player.fullName.split(" ")[0], runs: s.runsScored, wickets: s.wickets }))} /> : <EmptyState title="No performance stats" body="Record match or practice statistics to see charts here." />}</Panel><Panel title="Player Statistics">{data.stats.length ? <table><tbody>{data.stats.map((s) => <tr key={s.id}><td>{s.player.fullName}</td><td>{s.runsScored} runs</td><td>{s.wickets} wickets</td><td>{s.catches} catches</td></tr>)}</tbody></table> : <EmptyState title="No statistics" body="Player statistics will appear here after entry." />}</Panel></div>;
}

function Improvement({ data }: { data: { assessments: Assessment[] } }) {
  return <div className="content cards">{data.assessments.map((a) => <Panel key={a.id} title={a.player.fullName}><Skill label="Batting" value={avg([a.footwork, a.shotSelection, a.timing, a.powerHitting])} /><Skill label="Bowling" value={avg([a.line, a.length, a.paceSpin, a.swingSpin])} /><Skill label="Fitness" value={avg([a.speed, a.agility, a.endurance, a.strength])} /><Skill label="Fielding" value={avg([a.catching, a.throwing, a.reflexes])} /></Panel>)}</div>;
}

function Matches({ data }: { data: { matches: Match[] } }) {
  return <div className="content">{data.matches.map((m) => <Panel key={m.id} title={m.matchName}><ListItem title={m.opponentTeam} meta={`${m.venue} · ${new Date(m.date).toLocaleDateString("en-IN")}`} badge={m.result} />{m.performances.map((p) => <ListItem key={p.id} title={p.player.fullName} meta={`${p.runs} runs, ${p.wickets} wickets, ${p.catches} catches`} />)}</Panel>)}</div>;
}

function MatchDashboard({ data }: { data: { totals: { matches: number; won: number; lost: number; draw: number; runs: number; wickets: number; catches: number }; topBatters: Array<{ playerName: string; runs: number; wickets: number; catches: number }> } }) {
  return <div className="content"><div className="stats"><Stat label="Matches" value={data.totals.matches} /><Stat label="Won" value={data.totals.won} /><Stat label="Runs" value={data.totals.runs} /><Stat label="Wickets" value={data.totals.wickets} /></div><Panel title="Top Match Performers">{data.topBatters.length ? data.topBatters.map((player) => <ListItem key={`${player.playerName}-${player.runs}`} title={player.playerName} meta={`${player.runs} runs, ${player.wickets} wickets, ${player.catches} catches`} />) : <EmptyState title="No match statistics" body="Add match performance records to populate this dashboard." />}</Panel></div>;
}

function Tournaments({ data, reload }: { data: { tournaments: Tournament[] }; reload: () => void }) {
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api("/api/tournaments", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    event.currentTarget.reset();
    reload();
  }
  return <div className="content grid form-grid"><Panel title="Tournament List">{data.tournaments.length ? data.tournaments.map((tournament) => <ListItem key={tournament.id} title={tournament.name} meta={`${tournament.season} - ${tournament.venue} - ${new Date(tournament.startDate).toLocaleDateString("en-IN")}`} badge={tournament.status} />) : <EmptyState title="No tournaments" body="Create academy tournaments, seasons, and venues from the form." />}</Panel><Panel title="Add Tournament"><form className="stack" onSubmit={submit}><Input name="name" label="Tournament Name" /><Input name="season" label="Season" /><Input name="startDate" label="Start Date" type="date" /><Input name="endDate" label="End Date" type="date" required={false} /><Input name="venue" label="Venue" /><Select name="status" values={["UPCOMING", "LIVE", "COMPLETED"]} /><Input name="notes" label="Notes" required={false} /><button className="primary">Save Tournament</button></form></Panel></div>;
}

function Reports() {
  return <div className="content cards">{["player-report", "attendance-report", "fee-report", "performance-report"].map((r) => <Panel key={r} title={r.replaceAll("-", " ")}><p>Download CSV report for academy operations.</p><a className="primary link" href={`/api/reports/${r}`}>Generate</a></Panel>)}</div>;
}

function PlayerTable({ players, reload, onView, onDelete }: { players: Player[]; reload: () => void; onView: (player: Player) => void; onDelete: (player: Player) => void }) {
  async function uploadPhoto(player: Player, file: File | undefined) {
    if (!file) return;
    const photoUrl = await fileToDataUrl(file);
    await api(`/api/players/${player.id}/photo`, { method: "PATCH", body: JSON.stringify({ photoUrl }) });
    reload();
  }
  return <table><tbody>{players.map((p) => <tr key={p.id}><td><div className="player-cell"><div className="player-photo">{p.photoUrl ? <img src={p.photoUrl} alt="" /> : initials(p.fullName)}</div><div><strong>{p.fullName}</strong><span>{p.playerCode}</span></div></div></td><td>{p.playingRole.replaceAll("_", " ")}</td><td>{ageFromDob(p.dateOfBirth)}</td><td>{p.parentName}</td><td><Badge>#{p.jerseyNumber}</Badge></td><td><button className="ghost table-btn" onClick={() => onView(p)} type="button">Profile</button></td><td><label className="upload-btn">Photo<input accept="image/*" type="file" onChange={(event) => uploadPhoto(p, event.target.files?.[0])} /></label></td><td><button className="danger-btn" onClick={() => onDelete(p)} type="button">Remove</button></td></tr>)}</tbody></table>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="panel"><h2>{title}</h2>{children}</section>; }
function EmptyState({ title, body }: { title: string; body: string }) { return <div className="empty-state"><strong>{title}</strong><span>{body}</span></div>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="stat"><span>{label}</span><strong>{value}</strong></div>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="badge">{children}</span>; }
function ListItem({ title, meta, badge }: { title: string; meta: string; badge?: string }) { return <div className="list-item"><div><strong>{title}</strong><span>{meta}</span></div>{badge && <Badge>{badge}</Badge>}</div>; }
function Input({ name, label, type = "text", defaultValue, required = true }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean }) { return <label>{label}<input required={required} name={name} type={type} defaultValue={defaultValue} /></label>; }
function Select({ name, values, defaultValue }: { name: string; values: string[]; defaultValue?: string }) { return <label>{name.replaceAll("_", " ")}<select name={name} defaultValue={defaultValue}>{values.map((v) => <option key={v}>{v}</option>)}</select></label>; }
function Skill({ label, value }: { label: string; value: number }) { return <div className="skill"><div><span>{label}</span><strong>{value}/10</strong></div><i style={{ width: `${value * 10}%` }} /></div>; }
function ChartLine({ data }: { data: { name: string; value: number }[] }) { return <ResponsiveContainer width="100%" height={280}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line dataKey="value" stroke="#17834b" strokeWidth={3} /></LineChart></ResponsiveContainer>; }
function ChartBars({ data }: { data: { name: string; runs: number; wickets: number }[] }) { return <ResponsiveContainer width="100%" height={280}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="runs" fill="#17834b" /><Bar dataKey="wickets" fill="#d7a829" /></BarChart></ResponsiveContainer>; }
function avg(values: number[]) { return Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)); }
function subtitle(section: Section) { return `${section} module for player operations, academy administration, and coach workflows.`; }

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
