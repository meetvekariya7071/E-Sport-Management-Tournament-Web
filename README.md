# 🏆 E-Sports Tournament Management System (ETMS)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-indigo.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black.svg)](https://socket.io/)
[![Vitest](https://img.shields.io/badge/Vitest-5.0-yellow.svg)](https://vitest.dev/)

A full-stack, enterprise-grade E-Sports Tournament Management System built with a high-performance Node.js / Express backend, Prisma ORM, real-time WebSockets, and a cyber-themed React client. Supports automated tournament seeding, single-elimination brackets, battle royale multi-round leaderboards, role-based access control (Admin, Organizer, Referee, Player), match dispute resolution, referee score verification, and live telemetry health monitoring.

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.x, v20.x, or v22.x
- **npm**: v9.x or later
- **Docker & Docker Compose** *(Optional, for containerized deployment)*

---

### 2. Step-by-Step Installation from Scratch

#### Step 2.1: Clone and Install Dependencies
```bash
# In the 4th_Pro repository root:
npm install

# Install client dependencies:
cd client
npm install
cd ..
```
*(On Windows systems where PowerShell execution policy is restricted, prefix commands with `cmd /c`)*

#### Step 2.2: Environment Setup
Ensure `.env` exists in the root:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=super_secret_jwt_production_ready_esports_key_2026
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Ensure `client/.env` exists for Vite:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

#### Step 2.3: Database Migrations & Automated Seeding
```bash
# Push database schema with Prisma
npm run prisma:push

# Run the comprehensive database seeder (populates Admin, Organizers, Referee, 20 Players, Games & Tournaments)
npm run prisma:seed
```

#### Step 2.4: Launch Development Servers
Start both backend and frontend servers:

**Backend API (`http://localhost:5000`):**
```bash
npm run dev
```

**Frontend Client (`http://localhost:3000`):**
```bash
npm run client:dev
# or: cd client && npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 🐳 Docker Deployment Quick-Start

To run the entire stack (PostgreSQL database, Backend API, and Frontend Client) using Docker Compose:

```bash
# Build and start all production containers
docker compose up --build

# Run in background daemon mode
docker compose up -d

# Stop all containers
docker compose down
```

The application will be accessible at:
- **Web Application Client**: `http://localhost:3000`
- **Backend API Server**: `http://localhost:5000`
- **Health Check Endpoint**: `http://localhost:5000/api/health`

---

## 🔐 Default Demo Accounts & Credentials

The database seeder (`npm run prisma:seed`) populates the clean quick-login demo accounts with password **`PASSWORD123!`**:

| Role | Email / Login ID | Username | Password | Access Rights & Portals |
|---|---|---|---|---|
| **Super Admin** | `admin@esports.com` | `admin` | `PASSWORD123!` | `/admin` — System Status Widget, Game catalog CRUD, User ban/unban management, Global audit trail |
| **Organizer** | `organizer@esports.com` | `organizer` | `PASSWORD123!` | `/organizer` — Create tournaments, live match scoring console, tournament sub-databases |
| **Player 1 (Solo)** | `player1@esports.com` | `player1` | `PASSWORD123!` | `/player` — SOLO Battle Royale leaderboards, Apex Duo Captain |
| **Player 2 (Partner)**| `player2@esports.com` | `player2` | `PASSWORD123!` | `/player` — Apex Duo tactical partner (`DUO101`) |
| **Referee** | `referee@esports.com` | `referee` | `PASSWORD123!` | `/referee/dashboard` — Check-in checklist (Present/No Show/DQ), scorecard verification |

---

## 🎮 Pre-Seeded Tournaments (All by Demo Organizer)

1. **Solo Apex Battlegrounds Championship (BGMI / PUBG Mobile)**
   - Format: `SOLO` (Status: `COMPLETED`)
   - Sub-database structure: Contains participant entries for Player 1 and a score table. **Strictly 0 team records generated.**
   - Verified scorecard by referee.

2. **Rocket League Duo Clash Series (Rocket League)**
   - Format: `DUO` (Status: `IN_PROGRESS`)
   - Sub-database structure: Contains a Team record linking Player 1 and Player 2 (`Apex Duo`, invite code `DUO101`), checked-in participants, and verified match scorecards.

3. **CS2 Masters Squad Invitational (Counter-Strike 2)**
   - Format: `SQUAD` (Status: `REGISTRATION_OPEN`)
   - Sub-database structure: Clean slate with 16 open slots ready for squad team formation and registrations.

---

## 🩺 Production Health Monitoring & Telemetry

### Endpoint: `GET /api/health`
Returns live system metrics without requiring authentication:
```json
{
  "status": "online",
  "service": "Esports Tournament Management API",
  "timestamp": "2026-10-19T17:19:57.284Z",
  "uptime": {
    "seconds": 933,
    "formatted": "0h 15m 33s"
  },
  "database": {
    "status": "healthy",
    "latencyMs": 1,
    "provider": "SQLite (Prisma ORM)"
  },
  "websocket": {
    "status": "active",
    "activeConnections": 1
  },
  "cache": {
    "status": "active",
    "activeKeys": 4,
    "hits": 18,
    "misses": 7
  },
  "memory": {
    "rss": "108 MB",
    "heapUsed": "22 MB",
    "heapTotal": "24 MB"
  },
  "responseTimeMs": 1
}
```

### Admin System Status Widget
Located directly on `/admin` dashboard:
- Live database ping latency with green/amber/red pulse badges.
- Active Socket.io real-time client counter.
- In-memory cache hit ratio and key counts.
- Process RSS and Heap memory meters.
- Auto-refreshing interval (every 15s) + Instant Manual Refresh trigger.

---

## 🛡️ Standardized Error Handling & UX

### Centralized API Error Response Formatter
All backend failures return a consistent JSON payload:
```json
{
  "success": false,
  "message": "Human-readable error description",
  "errorCode": "RESOURCE_NOT_FOUND",
  "details": null
}
```

### Global UI Error Boundary
- Built-in React error boundary (`client/src/components/ErrorBoundary.tsx`) catching unhandled render exceptions.
- Displays a gaming fallback screen featuring:
  - Error diagnostics details toggle
  - 'Return to Home' CTA
  - 'Reboot System' reload button
- Responsive mobile drawer navigation with dark glassmorphism and animated hamburgers.
- Global toast alert system (`useToast()`) providing instant audio-visual cues on tournament registration, team creation, team joining, score publishing, and administrative disciplinary notices.

---

## 🧪 Automated Testing & Verification

Run the full Vitest backend test suite:
```bash
npm test
```
**Test Coverage (28/28 Passing):**
- `tests/auth.test.ts`: User registration, unique constraints, credential login, password hashing, and token verification.
- `tests/tournaments.test.ts`: SOLO vs DUO/SQUAD isolation, invite-code generation, and roster capacity checks.
- `tests/rbac.test.ts`: RBAC permission guards, organizer ownership boundaries, and admin super-user capabilities.
- `tests/referee_disputes_audit.test.ts`: Referee match verification, player dispute ticketing, and platform audit trail logging.

### Verify Production Builds
```bash
# Build backend
npm run build

# Build client
npm run client:build
```
Both compile with **zero TypeScript errors and zero lint warnings**.

---

## 📜 License
Licensed under the [ISC License](LICENSE).
