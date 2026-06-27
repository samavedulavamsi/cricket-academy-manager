# Cricket Academy Manager - Multi-Academy SaaS

This project now supports the first seven SaaS features from the platform brief without rebuilding the app:

1. Multi-academy data isolation with `academyId` ownership across core records.
2. Academy registration that provisions academy, super admin, first coach, settings, and dashboard defaults.
3. Academy-first login with academy search/code selection and a sports-news landing experience.
4. Coach invitation, invitation-based registration, forgot/reset password, change password, and profile management.
5. Configurable role permissions for the supported academy roles.
6. Parent portal scoped to the parent’s own child only.
7. Sports news architecture on the login page, ready for a real API later.

## Stack

- `frontend`: React + Vite + TypeScript
- `backend`: Node.js + Express + TypeScript
- `backend/prisma`: PostgreSQL schema, migrations, and seed logic

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

3. Start PostgreSQL or point `DATABASE_URL` to Neon/Postgres.

4. Apply schema and seed:

```bash
npm run prisma:migrate
npm run prisma:seed
```

5. Start both apps:

```bash
npm run dev
```

URLs:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/api/health`

## Default Bootstrap Academy

When `ADMIN_EMAIL` and `ADMIN_PASSWORD` are present in `backend/.env`, the backend bootstraps a default academy and super admin on startup.

Default development values in the current env:

- Academy code: `DBR2026`
- Email: `dbr@gmail.com`
- Password: `dbracademy`

## Academy Auth Flows

- Academy registration creates academy profile, settings, super admin, first coach, default notifications, default downloads, default gallery items, and role-permission rows.
- Academy login requires an academy code plus account email/password.
- Parent signup requires academy code, player code, and parent contact number.
- Coach signup requires an invitation token created by the academy super admin.
- Forgot password generates a reset token; reset password consumes that token.

## Roles

Supported roles:

- `SUPER_ADMIN`
- `ACADEMY_ADMIN`
- `HEAD_COACH`
- `ASSISTANT_COACH`
- `MANAGER`
- `ACCOUNTANT`
- `PARENT`
- `PLAYER`

Role permissions are stored per academy and can be updated from the Roles screen.

## Parent Portal Scope

The parent portal returns only:

- own child profile
- own child attendance
- own child fees
- own child performance
- coach feedback
- parent-facing notifications
- gallery items
- downloads
- upcoming matches

## Sports News

The academy login page now renders a card-based sports-news section from `/api/news/sports`.

Current source:

- static seeded backend feed

Designed for later upgrade:

- swap backend seed provider for a real sports news API without changing the frontend contract

## Migration Notes

The multi-academy schema migration generated for this upgrade lives at:

```text
backend/prisma/migrations/20260627143000_multi_academy_saas/migration.sql
```

## Google Forms

Google Forms import remains available. Payloads must now include `academyCode`.

Reference:

```text
docs/google-forms-import.md
```
