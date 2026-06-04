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

When adding a player, fill:

- `Player Portal Email`
- `Player Portal Password`

That player can then use the `Player` tab on the login screen to see only their own details.

Coaches can remove a player from the `Players` page. Removing a player also deletes linked attendance, fee, performance, improvement, match-performance, and portal-login data.

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
