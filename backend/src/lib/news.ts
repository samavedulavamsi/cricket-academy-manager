export type SportsNewsItem = {
  id: string;
  category: "LATEST_CRICKET" | "IPL" | "INTERNATIONAL" | "BCCI" | "ICC" | "WOMENS" | "UPCOMING_MATCHES" | "TRENDING_VIDEOS";
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  imageUrl: string;
  accentColor: string;
  href: string;
};

export const sportsNewsSeed: SportsNewsItem[] = [
  {
    id: "latest-1",
    category: "LATEST_CRICKET",
    title: "Academy-ready cricket ops now need better digital front doors",
    summary: "A strong academy login and communication layer is becoming as important as drills, fixtures, and fee workflows.",
    source: "Cricket Academy Desk",
    publishedAt: "2026-06-27T08:00:00.000Z",
    imageUrl: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=900&q=80",
    accentColor: "#17834b",
    href: "#"
  },
  {
    id: "ipl-1",
    category: "IPL",
    title: "IPL analysis continues to shape academy training intensity models",
    summary: "Teams are borrowing match-simulation methods from T20 environments to prepare young batters for pressure overs.",
    source: "League Watch",
    publishedAt: "2026-06-27T07:30:00.000Z",
    imageUrl: "https://images.unsplash.com/photo-1593766827228-8737b4534aa6?auto=format&fit=crop&w=900&q=80",
    accentColor: "#d7a829",
    href: "#"
  },
  {
    id: "intl-1",
    category: "INTERNATIONAL",
    title: "International pathway programs are pushing stronger youth data tracking",
    summary: "Performance reviews, workload visibility, and parent communication are becoming standard across modern cricket systems.",
    source: "International Cricket Wire",
    publishedAt: "2026-06-27T06:50:00.000Z",
    imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=80",
    accentColor: "#10233f",
    href: "#"
  },
  {
    id: "bcci-1",
    category: "BCCI",
    title: "Domestic planning updates keep academies focused on structured development calendars",
    summary: "Season planning, camp scheduling, and tournament prep remain central to academy administration.",
    source: "Board Bulletin",
    publishedAt: "2026-06-27T06:15:00.000Z",
    imageUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=900&q=80",
    accentColor: "#0d6f3d",
    href: "#"
  },
  {
    id: "icc-1",
    category: "ICC",
    title: "Global development programs continue emphasizing grassroots analytics",
    summary: "Cross-format player growth now leans on better capture of attendance, fitness, and match feedback.",
    source: "ICC Tracker",
    publishedAt: "2026-06-27T05:40:00.000Z",
    imageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=80",
    accentColor: "#2563eb",
    href: "#"
  },
  {
    id: "women-1",
    category: "WOMENS",
    title: "Women’s cricket pathways are accelerating demand for better academy tooling",
    summary: "Families and coaches increasingly expect transparent reporting, schedules, and development notes.",
    source: "Women’s Cricket Roundup",
    publishedAt: "2026-06-27T05:00:00.000Z",
    imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
    accentColor: "#be185d",
    href: "#"
  },
  {
    id: "upcoming-1",
    category: "UPCOMING_MATCHES",
    title: "Weekend fixtures spotlight academy readiness and player rotation",
    summary: "Upcoming academy and club fixtures are driving sharper communication between coaches and parents.",
    source: "Fixtures Desk",
    publishedAt: "2026-06-27T04:20:00.000Z",
    imageUrl: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=900&q=80",
    accentColor: "#c2410c",
    href: "#"
  },
  {
    id: "video-1",
    category: "TRENDING_VIDEOS",
    title: "Trending skill clips keep short-format coaching feedback highly shareable",
    summary: "Compact breakdowns of grip, release, and footwork are becoming a favorite learning format for parents and players.",
    source: "Video Scout",
    publishedAt: "2026-06-27T03:45:00.000Z",
    imageUrl: "https://images.unsplash.com/photo-1502904550040-7534597429ae?auto=format&fit=crop&w=900&q=80",
    accentColor: "#7c3aed",
    href: "#"
  }
];
