import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, CreditCard, ShieldCheck, UserRoundPlus, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ageFromDob, api, formatDate, formatRole, initials, money } from "./api";
import type {
  AcademyProfile,
  AcademySummary,
  Attendance,
  AttendanceSummary,
  Coach,
  CoachFeedback,
  CoachInvitation,
  DownloadResource,
  FeeAlert,
  FeePayment,
  MediaAsset,
  NotificationItem,
  Permission,
  Player,
  RoleConfig,
  SessionUser,
  SportsNewsItem
} from "./types";

type SessionState = {
  user: SessionUser;
  academy: AcademyProfile;
  permissions: Permission[];
};

type Section = "Dashboard" | "Players" | "Attendance" | "Fees" | "Coaches" | "Roles";

const permissionList: Permission[] = [
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
];

export function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<SessionState>("/api/auth/me")
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading academy workspace...</div>;
  if (!session) return <AuthLanding onAuthenticated={setSession} />;
  if (session.user.role === "PARENT") return <ParentPortal session={session} onLogout={() => logout(setSession)} />;

  return <AdminShell session={session} onSessionChange={setSession} onLogout={() => logout(setSession)} />;
}

function AuthLanding({ onAuthenticated }: { onAuthenticated: (session: SessionState) => void }) {
  const [mode, setMode] = useState<"login" | "register" | "parent" | "coach" | "forgot" | "reset">("login");
  const [selectedAcademy, setSelectedAcademy] = useState<AcademySummary | null>(null);
  const [query, setQuery] = useState("");
  const [academies, setAcademies] = useState<AcademySummary[]>([]);
  const [news, setNews] = useState<SportsNewsItem[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    api<{ items: SportsNewsItem[] }>("/api/news/sports")
      .then((data) => setNews(data.items))
      .catch(() => setNews([]));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setAcademies([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      api<{ academies: AcademySummary[] }>(`/api/academies/search?q=${encodeURIComponent(query.trim())}`)
        .then((data) => setAcademies(data.academies))
        .catch(() => setAcademies([]));
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [query]);

  async function refreshSession() {
    const session = await api<SessionState>("/api/auth/me");
    onAuthenticated(session);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      if (mode === "login") {
        await api("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
        await refreshSession();
        return;
      }

      if (mode === "register") {
        await api("/api/academies/register", { method: "POST", body: JSON.stringify(payload) });
        await refreshSession();
        return;
      }

      if (mode === "parent") {
        await api("/api/auth/player-register", { method: "POST", body: JSON.stringify(payload) });
        await refreshSession();
        return;
      }

      if (mode === "coach") {
        await api("/api/coaches/register", { method: "POST", body: JSON.stringify(payload) });
        await refreshSession();
        return;
      }

      if (mode === "forgot") {
        const result = await api<{ resetToken: string }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) });
        setResetToken(result.resetToken);
        setMode("reset");
        setMessage("Reset token generated. Paste it below to set a new password.");
        return;
      }

      await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify(payload) });
      setMode("login");
      setMessage("Password reset complete. Sign in with the new password.");
    } catch (caught) {
      setError(parseError(caught));
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-brand">
          <div className="brand-mark">{selectedAcademy?.name?.slice(0, 2).toUpperCase() ?? "CA"}</div>
          <div>
            <strong>Cricket Academy SaaS</strong>
            <span>Multi-academy operations, coach access, and parent portal</span>
          </div>
        </div>

        <div className="auth-tabs">
          {[
            ["login", "Academy Login"],
            ["register", "Academy Registration"],
            ["parent", "Parent Access"],
            ["coach", "Coach Invitation"],
            ["forgot", "Forgot Password"],
            ["reset", "Reset Password"]
          ].map(([value, label]) => (
            <button key={value} className={mode === value ? "active" : ""} onClick={() => setMode(value as typeof mode)} type="button">
              {label}
            </button>
          ))}
        </div>

        <div className="academy-search">
          <label>
            Find academy
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by academy name, city, or code" />
          </label>
          {academies.length > 0 && (
            <div className="academy-results">
              {academies.map((academy) => (
                <button key={academy.id} className={`academy-card ${selectedAcademy?.id === academy.id ? "selected" : ""}`} onClick={() => setSelectedAcademy(academy)} type="button">
                  <div className="academy-card-head">
                    <span className="academy-dot" style={{ background: academy.themeColor }} />
                    <strong>{academy.name}</strong>
                  </div>
                  <span>{academy.academyCode}</span>
                  <span>{academy.city}, {academy.state}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "login" && (
            <>
              <FormTitle title="Academy login" body="Pick an academy first, then sign in with your academy account." />
              <Input name="academyCode" label="Academy code" defaultValue={selectedAcademy?.academyCode ?? ""} />
              <Input name="email" label="Email" type="email" />
              <Input name="password" label="Password" type="password" />
            </>
          )}

          {mode === "register" && (
            <>
              <FormTitle title="Create academy" body="Provision academy profile, super admin, first coach, settings, and a ready dashboard in one flow." />
              <div className="form-grid-two">
                <Input name="academyName" label="Academy Name" />
                <Input name="ownerName" label="Academy Owner" />
                <Input name="email" label="Academy Email" type="email" />
                <Input name="mobileNumber" label="Mobile Number" />
                <Input name="website" label="Website" required={false} />
                <Input name="logoUrl" label="Logo URL" required={false} />
                <Input name="city" label="City" />
                <Input name="state" label="State" />
                <Input name="country" label="Country" defaultValue="India" />
                <Input name="timeZone" label="Time Zone" defaultValue="Asia/Kolkata" />
                <Input name="currency" label="Currency" defaultValue="INR" />
                <Input name="themeColor" label="Theme Color" defaultValue="#17834b" />
                <Input name="subdomain" label="Subdomain" required={false} />
                <Select name="subscriptionPlan" values={["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]} />
              </div>
              <label>
                Address
                <textarea name="address" rows={3} required />
              </label>
              <div className="form-grid-two">
                <Input name="superAdminName" label="Super Admin Name" />
                <Input name="superAdminPhone" label="Super Admin Phone" />
                <Input name="superAdminEmail" label="Super Admin Email" type="email" />
                <Input name="superAdminPassword" label="Super Admin Password" type="password" />
                <Input name="firstCoachName" label="First Coach Name" />
                <Input name="firstCoachPhone" label="First Coach Phone" />
                <Input name="firstCoachEmail" label="First Coach Email" type="email" />
                <Input name="firstCoachPassword" label="First Coach Password" type="password" />
              </div>
            </>
          )}

          {mode === "parent" && (
            <>
              <FormTitle title="Parent portal signup" body="Use academy code, player code, and parent contact to create secure parent access." />
              <Input name="academyCode" label="Academy code" defaultValue={selectedAcademy?.academyCode ?? ""} />
              <Input name="playerCode" label="Player code" />
              <Input name="parentContactNumber" label="Parent contact number" />
              <Input name="email" label="Portal email" type="email" />
              <Input name="password" label="Create password" type="password" />
            </>
          )}

          {mode === "coach" && (
            <>
              <FormTitle title="Coach invitation registration" body="Accept a super-admin invitation, complete your profile, and start inside the right academy." />
              <Input name="token" label="Invitation token" />
              <Input name="name" label="Full name" />
              <Input name="phone" label="Mobile number" />
              <Input name="title" label="Profile title" required={false} />
              <Input name="profilePhotoUrl" label="Profile photo URL" required={false} />
              <Input name="password" label="Create password" type="password" />
            </>
          )}

          {mode === "forgot" && (
            <>
              <FormTitle title="Forgot password" body="Generate a reset token for a coach, admin, or parent account inside a specific academy." />
              <Input name="academyCode" label="Academy code" defaultValue={selectedAcademy?.academyCode ?? ""} />
              <Input name="email" label="Account email" type="email" />
            </>
          )}

          {mode === "reset" && (
            <>
              <FormTitle title="Reset password" body="Paste the token from the password recovery step and set a new password." />
              <Input name="token" label="Reset token" defaultValue={resetToken} />
              <Input name="password" label="New password" type="password" />
            </>
          )}

          {message && <div className="success-box">{message}</div>}
          {error && <div className="error-box">{error}</div>}
          <button className="primary" type="submit">Continue</button>
        </form>
      </section>

      <section className="news-panel">
        <div className="news-header">
          <span className="eyebrow">Sports News</span>
          <h1>Cricket headlines for a professional academy front door</h1>
          <p>Architecture is ready for a real sports-news API later. Right now the academy login page already speaks the language of the sport.</p>
        </div>
        <div className="news-grid">
          {news.map((item) => (
            <article className="news-card" key={item.id}>
              <img alt="" src={item.imageUrl} />
              <div className="news-copy">
                <span className="news-chip" style={{ background: item.accentColor }}>{item.category.replaceAll("_", " ")}</span>
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
                <div className="news-meta">
                  <span>{item.source}</span>
                  <span>{formatDate(item.publishedAt)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function AdminShell({ session, onSessionChange, onLogout }: { session: SessionState; onSessionChange: (session: SessionState) => void; onLogout: () => void }) {
  const [section, setSection] = useState<Section>("Dashboard");
  const sections = useMemo(() => {
    const visible: Array<{ label: Section; icon: typeof Users; permission?: Permission }> = [
      { label: "Dashboard", icon: BarChart3 },
      { label: "Players", icon: Users, permission: "MANAGE_PLAYERS" },
      { label: "Attendance", icon: CalendarDays, permission: "MANAGE_ATTENDANCE" },
      { label: "Fees", icon: CreditCard, permission: "MANAGE_FEES" },
      { label: "Coaches", icon: UserRoundPlus, permission: "MANAGE_COACHES" },
      { label: "Roles", icon: ShieldCheck, permission: "MANAGE_ROLE_PERMISSIONS" }
    ];
    return visible.filter((item) => !item.permission || session.permissions.includes(item.permission));
  }, [session.permissions]);

  useEffect(() => {
    if (!sections.find((item) => item.label === section)) {
      setSection("Dashboard");
    }
  }, [section, sections]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">{session.academy.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{session.academy.name}</strong>
            <span>{session.academy.academyCode} · {session.academy.subscriptionPlan}</span>
          </div>
        </div>
        <div className="academy-summary">
          <span>{session.academy.city}, {session.academy.state}</span>
          <span>{formatRole(session.user.role)}</span>
        </div>
        <nav>
          {sections.map((item) => (
            <button className={section === item.label ? "active" : ""} key={item.label} onClick={() => setSection(item.label)}>
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h1>{section}</h1>
            <p>{session.user.name} · {formatRole(session.user.role)} · {session.academy.ownerName}</p>
          </div>
          <button className="ghost" onClick={onLogout}>Logout</button>
        </header>

        {section === "Dashboard" && <Dashboard session={session} />}
        {section === "Players" && <Players session={session} />}
        {section === "Attendance" && <AttendancePage />}
        {section === "Fees" && <FeesPage session={session} />}
        {section === "Coaches" && <CoachesPage session={session} onSessionChange={onSessionChange} />}
        {section === "Roles" && <RolesPage />}
      </main>
    </div>
  );
}

function Dashboard({ session }: { session: SessionState }) {
  const [data, setData] = useState<{ players: Player[]; attendance: Attendance[]; fees: FeePayment[]; stats: Array<{ runsScored: number; wickets: number; player: Player }> } | null>(null);

  useEffect(() => {
    api<{ players: Player[]; attendance: Attendance[]; fees: FeePayment[]; stats: Array<{ runsScored: number; wickets: number; player: Player }> }>("/api/dashboard").then(setData);
  }, []);

  if (!data) return <div className="content"><Panel title="Loading">Preparing academy dashboard...</Panel></div>;

  const presentToday = data.attendance.filter((row) => row.morningStatus === "PRESENT" || row.eveningStatus === "PRESENT").length;
  const totalCollection = data.fees.reduce((sum, fee) => sum + fee.amountPaid, 0);
  const pending = data.fees.reduce((sum, fee) => sum + Math.max(fee.player.monthlyFeeAmount - fee.amountPaid, 0), 0);
  const attendanceRate = data.players.length ? Math.round((presentToday / data.players.length) * 100) : 0;

  return (
    <div className="content">
      <div className="stats">
        <Stat label="Players" value={data.players.length} />
        <Stat label="Present Today" value={presentToday} />
        <Stat label="Attendance %" value={attendanceRate} />
        <Stat label="Pending Fees" value={money(pending, session.academy.currency)} />
      </div>

      <div className="grid two">
        <Panel title="Academy Snapshot">
          <ListItem title={session.academy.name} meta={`${session.academy.city}, ${session.academy.state}, ${session.academy.country}`} badge={session.academy.academyCode} />
          <ListItem title="Owner" meta={session.academy.ownerName} badge={session.academy.subscriptionPlan} />
          <ListItem title="Revenue Collected" meta={money(totalCollection, session.academy.currency)} badge={session.academy.currency} />
        </Panel>
        <Panel title="Coach and Parent Readiness">
          <ListItem title="Multi-academy isolation" meta="Academy-scoped auth, players, attendance, fees, registrations, and reports." badge="Feature 1" />
          <ListItem title="Coach onboarding" meta="Invitation, self-registration, profile management, and password flows are live." badge="Feature 4" />
          <ListItem title="Parent portal" meta="Child-only access to attendance, fees, performance, feedback, gallery, and downloads." badge="Feature 6" />
        </Panel>
      </div>

      <div className="grid two">
        <Panel title="Attendance Trend">
          <ChartLine data={data.players.map((player, index) => ({ name: player.fullName.split(" ")[0], value: Math.max(52, 86 - index * 3) }))} />
        </Panel>
        <Panel title="Runs and Wickets">
          <ChartBars data={data.stats.map((item) => ({ name: item.player.fullName.split(" ")[0], runs: item.runsScored, wickets: item.wickets }))} />
        </Panel>
      </div>
    </div>
  );
}

function Players({ session }: { session: SessionState }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [error, setError] = useState("");

  async function loadPlayers() {
    const data = await api<{ players: Player[] }>("/api/players");
    setPlayers(data.players);
  }

  useEffect(() => {
    loadPlayers().catch((caught) => setError(parseError(caught)));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/players", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
      event.currentTarget.reset();
      await loadPlayers();
    } catch (caught) {
      setError(parseError(caught));
    }
  }

  async function openProfile(player: Player) {
    const data = await api<{ player: Player }>(`/api/players/${player.id}`);
    setSelected(data.player);
  }

  if (selected) {
    return (
      <div className="content">
        <button className="ghost slim" onClick={() => setSelected(null)}>Back to players</button>
        <PlayerProfile player={selected} currency={session.academy.currency} />
      </div>
    );
  }

  return (
    <div className="content grid form-layout">
      <Panel title="Player Records">
        {error && <div className="error-box">{error}</div>}
        {players.length ? (
          <table>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td>
                    <div className="player-cell">
                      <div className="player-photo">{player.photoUrl ? <img alt="" src={player.photoUrl} /> : initials(player.fullName)}</div>
                      <div>
                        <strong>{player.fullName}</strong>
                        <span>{player.playerCode}</span>
                      </div>
                    </div>
                  </td>
                  <td>{formatRole(player.playingRole)}</td>
                  <td>{ageFromDob(player.dateOfBirth)}</td>
                  <td>{player.parentName}</td>
                  <td><Badge>#{player.jerseyNumber}</Badge></td>
                  <td><button className="ghost slim" type="button" onClick={() => openProfile(player)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No players yet" body="Add the first player for this academy from the form on the right." />
        )}
      </Panel>

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
          <Input name="bowlingStyle" label="Bowling Style" defaultValue="Right Arm Medium" />
          <Input name="jerseyNumber" label="Jersey Number" type="number" />
          <Input name="joiningDate" label="Joining Date" type="date" />
          <Select name="skillLevel" values={["BEGINNER", "INTERMEDIATE", "ADVANCED"]} />
          <Input name="monthlyFeeAmount" label="Monthly Fee" type="number" />
          <Input name="admissionFee" label="Admission Fee" type="number" defaultValue="0" />
          <Input name="discount" label="Discount" type="number" defaultValue="0" />
          <button className="primary">Save Player</button>
        </form>
      </Panel>
    </div>
  );
}

function PlayerProfile({ player, currency }: { player: Player; currency: string }) {
  const latestFee = player.feePayments?.[0];
  const latestAttendance = player.attendance?.[0];
  const latestStats = player.performanceStats?.[0];
  const pending = latestFee ? Math.max(player.monthlyFeeAmount - latestFee.amountPaid, 0) : player.monthlyFeeAmount;

  return (
    <>
      <section className="hero-card">
        <div className="profile-photo large">{player.photoUrl ? <img alt="" src={player.photoUrl} /> : initials(player.fullName)}</div>
        <div>
          <span className="eyebrow">Player Profile</span>
          <h2>{player.fullName}</h2>
          <p>{player.playerCode} · Jersey #{player.jerseyNumber} · {formatRole(player.playingRole)}</p>
        </div>
      </section>

      <div className="stats">
        <Stat label="Age" value={ageFromDob(player.dateOfBirth)} />
        <Stat label="Skill" value={formatRole(player.skillLevel)} />
        <Stat label="Pending" value={money(pending, currency)} />
        <Stat label="Portal" value={player.user?.email ? "Active" : "Not created"} />
      </div>

      <div className="grid two">
        <Panel title="Parent and Contact">
          <ListItem title={player.parentName} meta={player.parentContactNumber} />
          <ListItem title="Emergency Contact" meta={player.emergencyContact} />
          <ListItem title="Address" meta={player.address ?? "-"} />
        </Panel>
        <Panel title="Latest Status">
          <ListItem title="Attendance" meta={`${latestAttendance?.morningStatus ?? "-"} / ${latestAttendance?.eveningStatus ?? "-"}`} />
          <ListItem title="Performance" meta={`${latestStats?.runsScored ?? 0} runs, ${latestStats?.wickets ?? 0} wickets`} />
        </Panel>
      </div>

      {!!player.coachFeedback?.length && (
        <Panel title="Coach Feedback">
          {player.coachFeedback.map((item: CoachFeedback) => (
            <ListItem key={item.id} title={item.title} meta={`${item.coach.name} · ${formatDate(item.createdAt)} · ${item.notes}`} />
          ))}
        </Panel>
      )}
    </>
  );
}

function AttendancePage() {
  const [data, setData] = useState<{ attendance: Attendance[]; summary: AttendanceSummary[] } | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const [rows, summary] = await Promise.all([
      api<{ attendance: Attendance[] }>("/api/attendance"),
      api<{ summary: AttendanceSummary[] }>("/api/attendance/reports")
    ]);
    setData({ attendance: rows.attendance, summary: summary.summary });
  }

  useEffect(() => {
    load().catch((caught) => setError(parseError(caught)));
  }, []);

  async function save(row: Attendance, form: HTMLFormElement) {
    const values = Object.fromEntries(new FormData(form).entries());
    await api("/api/attendance", {
      method: "POST",
      body: JSON.stringify({ ...values, playerId: row.playerId, date: new Date().toISOString() })
    });
    await load();
  }

  if (!data) return <div className="content"><Panel title="Loading">Loading attendance...</Panel></div>;

  return (
    <div className="content">
      {error && <div className="error-box">{error}</div>}
      <Panel title="Attendance Summary">
        {data.summary.length ? (
          <table>
            <tbody>
              {data.summary.map((row) => (
                <tr key={row.playerId}>
                  <td><strong>{row.name}</strong></td>
                  <td>{row.present} present</td>
                  <td>{row.absent} absent</td>
                  <td>{row.leave} leave</td>
                  <td><Badge>{row.attendancePercent}%</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No attendance rows" body="Mark sessions for players to build attendance reports." />
        )}
      </Panel>

      <div className="cards-grid">
        {data.attendance.map((row) => (
          <form className="panel" key={row.id} onSubmit={(event) => { event.preventDefault(); void save(row, event.currentTarget); }}>
            <h2>{row.player?.fullName ?? "Player"}</h2>
            <Select name="morningStatus" values={["PRESENT", "ABSENT", "LEAVE"]} defaultValue={row.morningStatus} />
            <Select name="eveningStatus" values={["PRESENT", "ABSENT", "LEAVE"]} defaultValue={row.eveningStatus} />
            <button className="primary">Save Attendance</button>
          </form>
        ))}
      </div>
    </div>
  );
}

function FeesPage({ session }: { session: SessionState }) {
  const [fees, setFees] = useState<FeePayment[]>([]);
  const [alerts, setAlerts] = useState<FeeAlert[]>([]);
  const [reminders, setReminders] = useState<Array<{ feeId: string; playerName: string; parentName: string; phone: string; pendingAmount: number; whatsappUrl: string }>>([]);

  useEffect(() => {
    api<{ fees: FeePayment[] }>("/api/fees").then((data) => setFees(data.fees));
    api<{ alerts: FeeAlert[] }>("/api/fee-alerts").then((data) => setAlerts(data.alerts));
  }, []);

  async function generateReminders() {
    const data = await api<{ reminders: Array<{ feeId: string; playerName: string; parentName: string; phone: string; pendingAmount: number; whatsappUrl: string }> }>("/api/whatsapp/fee-reminders", {
      method: "POST",
      body: JSON.stringify({})
    });
    setReminders(data.reminders);
  }

  return (
    <div className="content">
      <div className="grid two">
        <Panel title="Fee Ledger">
          {fees.length ? (
            <table>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id}>
                    <td>{fee.player.fullName}</td>
                    <td>{money(fee.amountPaid, session.academy.currency)}</td>
                    <td>{money(Math.max(fee.player.monthlyFeeAmount - fee.amountPaid, 0), session.academy.currency)}</td>
                    <td><Badge>{fee.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No fee records" body="Fee entries will appear once payments are captured for players." />
          )}
        </Panel>

        <Panel title="Upcoming Alerts">
          {alerts.length ? alerts.map((alert) => (
            <ListItem key={alert.feeId} title={alert.playerName} meta={`${alert.alertType.replaceAll("_", " ")} · ${formatDate(alert.dueDate)} · ${money(alert.pendingAmount, session.academy.currency)}`} badge={alert.parentContactNumber} />
          )) : <EmptyState title="No alerts" body="Pending and overdue fee items will show up here." />}
        </Panel>
      </div>

      <Panel title="WhatsApp Reminders">
        <button className="primary" onClick={generateReminders}>Generate Reminder Links</button>
        <div className="list-stack">
          {reminders.map((item) => (
            <div className="list-item" key={item.feeId}>
              <div>
                <strong>{item.playerName}</strong>
                <span>{item.parentName} · {money(item.pendingAmount, session.academy.currency)}</span>
              </div>
              <a className="primary link-button" href={item.whatsappUrl} target="_blank">Open WhatsApp</a>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function CoachesPage({ session, onSessionChange }: { session: SessionState; onSessionChange: (session: SessionState) => void }) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [invitations, setInvitations] = useState<CoachInvitation[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const [coachData, invitationData] = await Promise.all([
      api<{ coaches: Coach[] }>("/api/coaches"),
      api<{ invitations: CoachInvitation[] }>("/api/coaches/invitations")
    ]);
    setCoaches(coachData.coaches);
    setInvitations(invitationData.invitations);
  }

  useEffect(() => {
    load().catch((caught) => setError(parseError(caught)));
  }, []);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/coaches/invitations", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries()))
      });
      event.currentTarget.reset();
      await load();
    } catch (caught) {
      setError(parseError(caught));
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/coaches/profile", {
        method: "PATCH",
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries()))
      });
      const refreshed = await api<SessionState>("/api/auth/me");
      onSessionChange(refreshed);
      await load();
    } catch (caught) {
      setError(parseError(caught));
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries()))
      });
      event.currentTarget.reset();
    } catch (caught) {
      setError(parseError(caught));
    }
  }

  return (
    <div className="content">
      {error && <div className="error-box">{error}</div>}
      <div className="grid two">
        <Panel title="Coach Directory">
          {coaches.length ? coaches.map((coach) => (
            <ListItem key={coach.id} title={coach.name} meta={`${coach.email} · ${coach.phone ?? "No phone"} · ${coach.title ?? formatRole(coach.role)}`} badge={formatRole(coach.role)} />
          )) : <EmptyState title="No coaches yet" body="Invite the next coach from the panel on the right." />}
        </Panel>

        <Panel title="Invite Coach">
          {session.user.role === "SUPER_ADMIN" ? (
            <form className="stack" onSubmit={invite}>
              <Input name="email" label="Coach Email" type="email" />
              <Input name="phone" label="Phone Number" required={false} />
              <Select name="role" values={["ACADEMY_ADMIN", "HEAD_COACH", "ASSISTANT_COACH", "MANAGER", "ACCOUNTANT"]} />
              <Input name="message" label="Invitation Message" required={false} />
              <button className="primary">Send Invitation</button>
            </form>
          ) : (
            <EmptyState title="Super admin only" body="Only the super admin can invite coaches into the academy." />
          )}
        </Panel>
      </div>

      <div className="grid two">
        <Panel title="My Coach Profile">
          <form className="stack" onSubmit={saveProfile}>
            <Input name="name" label="Name" defaultValue={session.user.name} />
            <Input name="phone" label="Phone" required={false} />
            <Input name="title" label="Title" required={false} />
            <Input name="profilePhotoUrl" label="Photo URL" required={false} />
            <button className="primary">Save Profile</button>
          </form>
        </Panel>

        <Panel title="Security">
          <form className="stack" onSubmit={changePassword}>
            <Input name="currentPassword" label="Current Password" type="password" />
            <Input name="newPassword" label="New Password" type="password" />
            <button className="primary">Change Password</button>
          </form>
        </Panel>
      </div>

      <Panel title="Invitation Tracker">
        {invitations.length ? invitations.map((invitation) => (
          <ListItem key={invitation.id} title={invitation.email} meta={`${formatRole(invitation.role)} · Expires ${formatDate(invitation.expiresAt)} · Token ${invitation.token.slice(0, 12)}...`} badge={invitation.status} />
        )) : <EmptyState title="No invitations yet" body="Invitations will appear here after the super admin sends them." />}
      </Panel>
    </div>
  );
}

function RolesPage() {
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const data = await api<{ roles: RoleConfig[] }>("/api/roles");
    setRoles(data.roles);
  }

  useEffect(() => {
    load().catch((caught) => setError(parseError(caught)));
  }, []);

  async function save(role: string, form: HTMLFormElement) {
    const selected = Array.from(new FormData(form).entries())
      .filter(([, value]) => value === "on")
      .map(([key]) => key) as Permission[];

    await api(`/api/roles/${role}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions: selected })
    });
    await load();
  }

  return (
    <div className="content">
      {error && <div className="error-box">{error}</div>}
      <div className="cards-grid">
        {roles.map((role) => (
          <form className="panel" key={role.role} onSubmit={(event) => { event.preventDefault(); void save(role.role, event.currentTarget); }}>
            <h2>{formatRole(role.role)}</h2>
            <div className="permission-grid">
              {permissionList.map((permission) => (
                <label className="checkbox-row" key={permission}>
                  <input defaultChecked={role.permissions.includes(permission)} name={permission} type="checkbox" />
                  <span>{formatRole(permission)}</span>
                </label>
              ))}
            </div>
            <button className="primary">Save Permissions</button>
          </form>
        ))}
      </div>
    </div>
  );
}

function ParentPortal({ session, onLogout }: { session: SessionState; onLogout: () => void }) {
  const [data, setData] = useState<{
    player: Player;
    attendance: Attendance[];
    fees: FeePayment[];
    stats: Array<{ runsScored: number; wickets: number; battingAverage: number; catches: number; recordedAt: string }>;
    feedback: CoachFeedback[];
    notifications: NotificationItem[];
    gallery: MediaAsset[];
    downloads: DownloadResource[];
    matches: Array<{ id: string; matchName: string; opponentTeam: string; date: string; venue: string; result: string }>;
  } | null>(null);

  useEffect(() => {
    api<{
      player: Player;
      attendance: Attendance[];
      fees: FeePayment[];
      stats: Array<{ runsScored: number; wickets: number; battingAverage: number; catches: number; recordedAt: string }>;
      feedback: CoachFeedback[];
      notifications: NotificationItem[];
      gallery: MediaAsset[];
      downloads: DownloadResource[];
      matches: Array<{ id: string; matchName: string; opponentTeam: string; date: string; venue: string; result: string }>;
    }>("/api/parent/portal").then(setData);
  }, []);

  if (!data) return <div className="loading">Loading parent portal...</div>;

  const latestFee = data.fees[0];
  const pending = latestFee ? Math.max(data.player.monthlyFeeAmount - latestFee.amountPaid, 0) : data.player.monthlyFeeAmount;
  const latestStats = data.stats[0];

  return (
    <div className="parent-shell">
      <header className="parent-hero">
        <div>
          <span className="eyebrow">Parent Portal</span>
          <h1>{data.player.fullName}</h1>
          <p>{session.academy.name} · Attendance, fees, performance, feedback, gallery, downloads, and upcoming matches for your child only.</p>
        </div>
        <button className="ghost" onClick={onLogout}>Logout</button>
      </header>

      <main className="content">
        <div className="stats">
          <Stat label="Player Code" value={data.player.playerCode} />
          <Stat label="Skill" value={formatRole(data.player.skillLevel)} />
          <Stat label="Pending Fees" value={money(pending, session.academy.currency)} />
          <Stat label="Batting Average" value={latestStats?.battingAverage ?? 0} />
        </div>

        <div className="grid two">
          <Panel title="Attendance">
            {data.attendance.map((row) => (
              <ListItem key={row.id} title={formatDate(row.date)} meta={`${row.morningStatus} morning · ${row.eveningStatus} evening`} />
            ))}
          </Panel>
          <Panel title="Fees">
            {data.fees.map((fee) => (
              <ListItem key={fee.id} title={formatDate(fee.dueDate)} meta={`${money(fee.amountPaid, session.academy.currency)} paid · ${money(Math.max(data.player.monthlyFeeAmount - fee.amountPaid, 0), session.academy.currency)} pending`} badge={fee.status} />
            ))}
          </Panel>
        </div>

        <div className="grid two">
          <Panel title="Performance">
            {latestStats ? (
              <div className="stats mini">
                <Stat label="Runs" value={latestStats.runsScored} />
                <Stat label="Wickets" value={latestStats.wickets} />
                <Stat label="Average" value={latestStats.battingAverage} />
                <Stat label="Catches" value={latestStats.catches} />
              </div>
            ) : (
              <EmptyState title="No performance data" body="Performance updates will appear after coaches record them." />
            )}
          </Panel>
          <Panel title="Upcoming Matches">
            {data.matches.length ? data.matches.map((match) => (
              <ListItem key={match.id} title={match.matchName} meta={`${match.opponentTeam} · ${match.venue} · ${formatDate(match.date)}`} badge={match.result} />
            )) : <EmptyState title="No upcoming matches" body="Upcoming fixtures will show up here." />}
          </Panel>
        </div>

        <div className="grid two">
          <Panel title="Coach Feedback">
            {data.feedback.length ? data.feedback.map((item) => (
              <ListItem key={item.id} title={item.title} meta={`${item.coach.name} · ${formatDate(item.createdAt)} · ${item.notes}`} />
            )) : <EmptyState title="No coach feedback yet" body="Coach notes will appear here after review sessions." />}
          </Panel>
          <Panel title="Notifications">
            {data.notifications.length ? data.notifications.map((item) => (
              <ListItem key={item.id} title={item.title} meta={`${formatDate(item.createdAt)} · ${item.message}`} badge={item.audience} />
            )) : <EmptyState title="No notifications" body="Announcements and reminders will appear here." />}
          </Panel>
        </div>

        <div className="grid two">
          <Panel title="Gallery">
            <div className="gallery-grid">
              {data.gallery.map((item) => (
                <article className="gallery-card" key={item.id}>
                  <img alt="" src={item.previewUrl} />
                  <strong>{item.title}</strong>
                  <span>{formatRole(item.type)}</span>
                </article>
              ))}
            </div>
          </Panel>
          <Panel title="Downloads">
            {data.downloads.length ? data.downloads.map((item) => (
              <div className="list-item" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
                <a className="primary link-button" href={item.fileUrl}>Open</a>
              </div>
            )) : <EmptyState title="No downloads yet" body="Shared files and academy resources will show up here." />}
          </Panel>
        </div>
      </main>
    </div>
  );
}

function FormTitle({ title, body }: { title: string; body: string }) {
  return (
    <div className="form-title">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel"><h2>{title}</h2>{children}</section>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}

function ListItem({ title, meta, badge }: { title: string; meta: string; badge?: string }) {
  return <div className="list-item"><div><strong>{title}</strong><span>{meta}</span></div>{badge && <Badge>{badge}</Badge>}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty-state"><strong>{title}</strong><span>{body}</span></div>;
}

function Input({ name, label, type = "text", defaultValue, required = true }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean }) {
  return <label>{label}<input defaultValue={defaultValue} name={name} required={required} type={type} /></label>;
}

function Select({ name, values, defaultValue }: { name: string; values: string[]; defaultValue?: string }) {
  return (
    <label>
      {formatRole(name)}
      <select defaultValue={defaultValue} name={name}>
        {values.map((value) => <option key={value} value={value}>{formatRole(value)}</option>)}
      </select>
    </label>
  );
}

function ChartLine({ data }: { data: Array<{ name: string; value: number }> }) {
  return <ResponsiveContainer height={280} width="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line dataKey="value" stroke="#17834b" strokeWidth={3} /></LineChart></ResponsiveContainer>;
}

function ChartBars({ data }: { data: Array<{ name: string; runs: number; wickets: number }> }) {
  return <ResponsiveContainer height={280} width="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="runs" fill="#17834b" /><Bar dataKey="wickets" fill="#d7a829" /></BarChart></ResponsiveContainer>;
}

async function logout(setSession: (value: SessionState | null) => void) {
  await api("/api/auth/logout", { method: "POST" });
  setSession(null);
}

function parseError(caught: unknown) {
  if (caught instanceof Error) return caught.message;
  return "Something went wrong";
}
