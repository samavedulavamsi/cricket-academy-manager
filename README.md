# Cricket Academy Manager - Vite + Node.js

This is the split frontend/backend version:

- `frontend`: Vite + React + TypeScript
- `backend`: Node.js + Express + TypeScript
- `backend/prisma`: PostgreSQL schema and seed data

## Run Locally

1. Copy env files:

```bash
copy .env.example .env
copy backend\.env.example backend\.env
```

2. Install dependencies:

```bash
npm install
```

3. Start PostgreSQL.

If Docker is installed:

```bash
docker compose up -d
```

If Docker is not installed, use any PostgreSQL database and update `DATABASE_URL`.

4. Create tables and seed:

```bash
npm run prisma:migrate
npm run prisma:seed
```

5. Start frontend and backend together:

```bash
npm run dev
```

The frontend is configured to automatically open in your normal external default browser.

URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api/health`

Seeded login:

Admin:

- Email: value from `ADMIN_EMAIL`
- Password: value from `ADMIN_PASSWORD`

Default development values if you do not change `.env`:

- Email: `dbr@gmail.com`
- Password: `dbracademy`

No sample players are inserted. Add players through the app forms.

## Player Portal Logins

There are two ways to create a player portal account.

Coach-created account:

- `Player Portal Email`
- `Player Portal Password`

Player-created account:

1. Add/import the player first.
2. Give the player their `Player Code`.
3. Player opens the `Create` tab on the login screen.
4. Player verifies with player code + parent contact number.
5. Player creates their own email/password login.

That player can then use the `Player` tab on the login screen to see only their own details.

Coaches can remove a player from the `Players` page. Removing a player also deletes linked attendance, fee, performance, improvement, match-performance, and portal-login data.

## Added Academy Modules

- Player photo upload from the `Players` table.
- WhatsApp fee reminder links from the `WhatsApp` module.
- Parent/player portal via the `Player` login tab.
- Match statistics dashboard in `Match Dashboard`.
- Attendance summaries in `Attendance Reports`.
- Fee due and overdue alerts in `Fee Alerts`.
- Jersey number management in `Jerseys`.
- Tournament creation and listing in `Tournaments`.

WhatsApp reminders use click-to-send `wa.me` links. A full automatic WhatsApp sender requires a WhatsApp Business API provider and approved message templates.

## Mobile / Play Store Path

The frontend is now PWA-ready with:

- `manifest.webmanifest`
- service worker
- app icons
- mobile viewport/theme metadata
- responsive layouts

For Play Store publishing, package the PWA using a Trusted Web Activity or wrap the frontend with Capacitor after deploying the backend and frontend publicly.

Player data is stored in PostgreSQL. CSV reports can be opened in Excel.

If your database already has old demo players from an earlier version, clear them with:

```bash
RESET_ACADEMY_DATA=true npm run prisma:seed
```

## Google Forms

Player registration from Google Forms is supported through a secure import endpoint.

See:

```text
docs/google-forms-import.md
```

## Why This Version

This structure is easier to understand if you want separate deployments:

- Deploy frontend to Vercel, Netlify, or static hosting.
- Deploy backend to Render, Railway, Fly.io, or a VPS.
- Use PostgreSQL from Supabase, Neon, Railway, Render, or local Docker.
