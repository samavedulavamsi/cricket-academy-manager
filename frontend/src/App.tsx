import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarCheck, CreditCard, FileDown, Gauge, Medal, Trophy, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ageFromDob, api, inr } from "./api";
import type { Assessment, Attendance, FeePayment, Match, PerformanceStat, Player } from "./types";

type User = { id: string; name: string; email: string; role: string; playerId?: string | null };
type Section = "Dashboard" | "Players" | "Attendance" | "Fees" | "Performance" | "Improvement" | "Matches" | "Reports";

const nav: Array<{ label: Section; icon: typeof Gauge }> = [
  { label: "Dashboard", icon: Gauge },
  { label: "Players", icon: Users },
  { label: "Attendance", icon: CalendarCheck },
  { label: "Fees", icon: CreditCard },
  { label: "Performance", icon: BarChart3 },
  { label: "Improvement", icon: Medal },
  { label: "Matches", icon: Trophy },
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
  const [mode, setMode] = useState<"coach" | "player">("coach");
  const credentials = mode === "coach"
    ? { title: "Coach Login", helper: "Access player management, attendance, fees, reports, and academy operations." }
    : { title: "Player Login", helper: "Access your attendance, fee status, performance, and progress reports." };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
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
        </div>
        <h1>{credentials.title}</h1>
        <p>{credentials.helper}</p>
        <label>Email<input key={`${mode}-email`} name="email" type="email" placeholder={mode === "coach" ? "coach@youracademy.com" : "player@youracademy.com"} autoComplete="email" /></label>
        <label>Password<input key={`${mode}-password`} name="password" type="password" placeholder="Enter password" autoComplete="current-password" /></label>
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
  const endpoint = useMemo(() => section === "Dashboard" ? "/api/dashboard" : `/api/${section.toLowerCase()}`, [section]);
  useEffect(() => {
    setData(null);
    api(endpoint).then(setData).catch((error) => setData({ error: String(error) }));
  }, [endpoint]);
  if (!data) return <div className="content"><div className="panel">Loading {section.toLowerCase()}...</div></div>;
  if (data.error) return <div className="content"><div className="panel error">{data.error}</div></div>;

  if (section === "Dashboard") return <Dashboard data={data} />;
  if (section === "Players") return <Players data={data} reload={() => api(endpoint).then(setData)} />;
  if (section === "Attendance") return <AttendancePage data={data} reload={() => api(endpoint).then(setData)} />;
  if (section === "Fees") return <Fees data={data} />;
  if (section === "Performance") return <Performance data={data} />;
  if (section === "Improvement") return <Improvement data={data} />;
  if (section === "Matches") return <Matches data={data} />;
  return <Reports />;
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
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/players", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
    event.currentTarget.reset();
    reload();
  }
  return (
    <div className="content grid form-grid">
      <Panel title="Player Records">{data.players.length ? <PlayerTable players={data.players} onDelete={async (player) => { if (confirm(`Remove ${player.fullName} and all linked details?`)) { await api(`/api/players/${player.id}`, { method: "DELETE" }); reload(); } }} /> : <EmptyState title="No player records" body="Use the form on this page to add your academy players." />}</Panel>
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
          <Input name="portalEmail" label="Player Portal Email" type="email" required={false} />
          <Input name="portalPassword" label="Player Portal Password" type="password" required={false} />
          <button className="primary">Save Player</button>
        </form>
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

function Performance({ data }: { data: { stats: PerformanceStat[] } }) {
  return <div className="content"><Panel title="Runs and Wickets">{data.stats.length ? <ChartBars data={data.stats.map((s) => ({ name: s.player.fullName.split(" ")[0], runs: s.runsScored, wickets: s.wickets }))} /> : <EmptyState title="No performance stats" body="Record match or practice statistics to see charts here." />}</Panel><Panel title="Player Statistics">{data.stats.length ? <table><tbody>{data.stats.map((s) => <tr key={s.id}><td>{s.player.fullName}</td><td>{s.runsScored} runs</td><td>{s.wickets} wickets</td><td>{s.catches} catches</td></tr>)}</tbody></table> : <EmptyState title="No statistics" body="Player statistics will appear here after entry." />}</Panel></div>;
}

function Improvement({ data }: { data: { assessments: Assessment[] } }) {
  return <div className="content cards">{data.assessments.map((a) => <Panel key={a.id} title={a.player.fullName}><Skill label="Batting" value={avg([a.footwork, a.shotSelection, a.timing, a.powerHitting])} /><Skill label="Bowling" value={avg([a.line, a.length, a.paceSpin, a.swingSpin])} /><Skill label="Fitness" value={avg([a.speed, a.agility, a.endurance, a.strength])} /><Skill label="Fielding" value={avg([a.catching, a.throwing, a.reflexes])} /></Panel>)}</div>;
}

function Matches({ data }: { data: { matches: Match[] } }) {
  return <div className="content">{data.matches.map((m) => <Panel key={m.id} title={m.matchName}><ListItem title={m.opponentTeam} meta={`${m.venue} · ${new Date(m.date).toLocaleDateString("en-IN")}`} badge={m.result} />{m.performances.map((p) => <ListItem key={p.id} title={p.player.fullName} meta={`${p.runs} runs, ${p.wickets} wickets, ${p.catches} catches`} />)}</Panel>)}</div>;
}

function Reports() {
  return <div className="content cards">{["player-report", "attendance-report", "fee-report", "performance-report"].map((r) => <Panel key={r} title={r.replaceAll("-", " ")}><p>Download CSV report for academy operations.</p><a className="primary link" href={`/api/reports/${r}`}>Generate</a></Panel>)}</div>;
}

function PlayerTable({ players, onDelete }: { players: Player[]; onDelete: (player: Player) => void }) {
  return <table><tbody>{players.map((p) => <tr key={p.id}><td><strong>{p.fullName}</strong><span>{p.playerCode}</span></td><td>{p.playingRole.replaceAll("_", " ")}</td><td>{ageFromDob(p.dateOfBirth)}</td><td>{p.parentName}</td><td><Badge>{p.skillLevel}</Badge></td><td><button className="danger-btn" onClick={() => onDelete(p)} type="button">Remove</button></td></tr>)}</tbody></table>;
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
