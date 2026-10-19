# E-Sports Tournament Management System (ETMS) — Backend

A high-performance, production-ready backend architecture for managing E-Sports tournaments, bracket structures, multi-format team/solo participation, and role-based access control.

Built with **Node.js, Express, TypeScript, and Prisma ORM**.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
Run from within `d:/4th_Pro`:

```bash
npm install
```
*(On Windows systems where PowerShell script execution is restricted, run: `cmd /c npm install`)*

### 2. Initialize the Database & Seed Sample Records
This project is configured out-of-the-box with **SQLite** for instant, zero-friction local development, with a 1-to-1 migration path to **PostgreSQL**.

```bash
# Push schema to SQLite database file (creates prisma/dev.db)
npm run prisma:push

# Seed default roles, test accounts (Admin, Organizer, Players), games, and a sample tournament
npm run prisma:seed
```

### 3. Start Servers Concurrently

You can run both servers in separate terminal tabs:

**Terminal 1 — Backend API Server (`http://localhost:5000`):**
```powershell
cd d:\4th_Pro
cmd /c npm run dev
```

**Terminal 2 — Frontend Client (`http://localhost:3000`):**
```powershell
cd d:\4th_Pro\client
cmd /c npm run dev
```
*(Or directly from root: `cmd /c npm run client:dev`)*

The frontend development server will launch at `http://localhost:3000` with automated proxying of all `/api/*` endpoints to `http://localhost:5000`.

---

## 🎨 Frontend Design & Visual Language
The frontend was designed to directly replicate the UI mockups in `BWP_pro`:
- **Dark Gaming Aesthetic:** Midnight base (`#0a0d14`), dark slate panels (`#0f1422`), card surfaces (`#161f33`), glowing cyan (`#00f0ff`) and electric blue accents.
- **Role-Based Protected Routes (`ProtectedRoute`):**
  - `/admin/*` — Strictly for `ADMIN` role. Features platform KPI metrics, game catalog administration, and interactive User Ban Modal.
  - `/organizer/*` — Strictly for `ORGANIZER` role. Features hosted tournament management and Create Tournament wizard.
  - `/player/*` — Strictly for `PLAYER` role. Features gamer stats (Rank, ELO, Matches), enrolled tournaments, and format-aware Join Tournament modal (Solo vs Duo/Squad).
  - `/banned` — Dedicated disciplinary action page for restricted accounts.
- **Interceptors:** Axios client with automated Bearer JWT injection, 401 session expiration handling, and 403 suspension redirection.


## 🔐 Default Test Credentials (From Seed)

| Role | Email | Password | Permissions |
|---|---|---|---|
| **ADMIN** | `admin@esports.com` | `Password123!` | Global rights: CRUD games, ban users, manage all tournaments, view system overview. |
| **ORGANIZER** | `organizer@esports.com` | `Password123!` | Create tournaments, view own tournament sub-tables, disqualify players within own tournaments. |
| **PLAYER 1** | `player1@esports.com` | `Password123!` | Register solo or form/join teams for duo/squad tournaments, view score sheets. |
| **PLAYER 2** | `player2@esports.com` | `Password123!` | Partner player for Duo/Squad registrations. |
| **REFEREE** | `referee@esports.com` | `Password123!` | Stubbed role for future tournament match refereeing and score verification. |

---

## 🏛️ Architecture & Tournament Isolation

### Why Not Create Separate Physical Databases at Runtime?
Creating dynamic SQL databases per tournament degrades performance, prevents relational integrity, exhausts connection pools, and makes cross-tournament leaderboards and admin metric aggregations computationally prohibitive.

### Scoped Relational Multi-Tenant Model
This architecture implements **Logical Tenant Isolation**:
- **Tournament Scope:** All participants, teams, rounds, matches, and match results are strictly scoped to `tournament_id`.
- **Dynamic Format Branching:**
  - When tournament format is **`SOLO`**: Team creation is completely bypassed (`teamId` is strictly `NULL`).
  - When tournament format is **`DUO`** or **`SQUAD`**: Requires team name and teammate validations; instantiates a scoped `Team` and `TeamMember` records, and binds participants to that team in an atomic transaction.
- **Resource Ownership Guards:** Organizers cannot mutate or disqualify participants in tournaments they do not own; Admins possess global bypass.

---

## 📂 Project Structure

```
4th_Pro/
├── prisma/
│   ├── schema.prisma              # Primary Prisma schema (SQLite dev ready)
│   ├── schema.postgresql.prisma   # PostgreSQL production schema with native ENUMs & UUIDs
│   └── seed.ts                    # Database seeder with test accounts & catalog
├── src/
│   ├── config/
│   │   ├── db.ts                  # Prisma Client singleton & connection hooks
│   │   └── env.ts                 # Validated environment configuration
│   ├── controllers/
│   │   ├── admin.controller.ts    # Admin dashboard overview & global ban/unban
│   │   ├── auth.controller.ts     # Register, Login & Profile handlers
│   │   ├── game.controller.ts     # Master Game catalog CRUD handlers
│   │   └── tournament.controller.ts # Tournament creation, join, & details
│   ├── middlewares/
│   │   └── auth.middleware.ts     # JWT authenticate, authorizeRoles, verifyTournamentOwner
│   ├── routes/
│   │   ├── admin.routes.ts        # /api/admin/*
│   │   ├── auth.routes.ts         # /api/auth/*
│   │   ├── game.routes.ts         # /api/games/*
│   │   └── tournament.routes.ts   # /api/tournaments/*
│   ├── services/
│   │   ├── admin.service.ts
│   │   ├── auth.service.ts
│   │   ├── game.service.ts
│   │   └── tournament.service.ts
│   ├── types/
│   │   └── index.ts               # Roles, TournamentFormat, and status types
│   ├── app.ts                     # Express setup with Helmet, CORS, and Routes
│   └── server.ts                  # Server entrypoint
├── .env                           # Environment variables
├── package.json
└── tsconfig.json
```

---

## 📡 Core API Reference

### 1. Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account (`email`, `username`, `password`, `role`: `PLAYER | ORGANIZER | ADMIN | REFEREE`).
- `POST /api/auth/login` — Login with email/username and password. Returns JWT Bearer token.
- `GET /api/auth/profile` *(Bearer Token)* — Returns authenticated user details.

### 2. Game Catalog (`/api/games`)
- `GET /api/games` — List all games in the catalog.
- `POST /api/games` *(Admin Only)* — Add new game (`title`, `slug`, `genre`, `isTeamBased`, `minTeamSize`, `maxTeamSize`).
- `DELETE /api/games/:id` *(Admin Only)* — Remove game from catalog.

### 3. Tournaments (`/api/tournaments`)
- `POST /api/tournaments` *(Admin & Organizer)* — Create tournament.
  ```json
  {
    "title": "Valorant Champions Cup",
    "slug": "valorant-champions-cup",
    "gameId": "<game-uuid>",
    "format": "SQUAD",
    "maxParticipants": 16,
    "startDate": "2026-11-01T10:00:00Z"
  }
  ```
- `POST /api/tournaments/:id/join` *(Player)* — Join tournament:
  - **For SOLO:** Send `{}` (no team required; team creation bypassed).
  - **For DUO/SQUAD:** Send `{ "teamName": "Ghost Clan", "partnerUserIds": ["<user-id>"] }`.
- `GET /api/tournaments/:id/details` — Returns tournament metadata, scoped participants, teams list (if DUO/SQUAD), and score sheets.
- `POST /api/tournaments/:tournamentId/participants/:participantId/disqualify` *(Organizer Owner & Admin)* — Disqualify a participant within the tournament.

### 4. Admin Management (`/api/admin`)
- `GET /api/admin/overview?role=PLAYER` *(Admin Only)* — Aggregated dashboard with KPI counts, user list, game catalog, and tournaments.
- `PATCH /api/admin/users/:id/ban` *(Admin Only)* — Global ban/unban user (`{ "isBanned": true, "reason": "Toxicity" }`).
