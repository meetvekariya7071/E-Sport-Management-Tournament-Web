# 🏆 E-Sports Tournament Management System (ETMS)

A production-ready, full-stack E-Sports Tournament Management Platform engineered for organizing competitive gaming events across diverse tournament formats (**SOLO**, **DUO**, **SQUAD**). Features real-time bracket orchestration, live leaderboards, role-based access control (RBAC), match dispute resolution, referee score verification, and live telemetry health monitoring.

---

## ⚡ Key Architectural Highlights

- **Backend Architecture**: Node.js, Express, TypeScript, Prisma ORM, Socket.IO, Helmet, Express-Rate-Limit, Node-Cache.
- **Frontend Architecture**: React 18, Vite, TypeScript, TailwindCSS, Lucide Icons, Axios Interceptors, Real-Time Socket.IO Client.
- **Tournament Formats**:
  - **SOLO Battle Royale**: Multi-round aggregate scoring (Placement Points + Kill Points) with strictly zero team instantiation.
  - **DUO Knockout**: Paired team rosters with unique invite codes and partner join links.
  - **SQUAD Elimination**: Bracket generation with Quarterfinals, Semifinals, and Finals, official referee match verification, and dispute resolution workflows.
- **Zero-Latency Telemetry**: Live system health endpoint (`GET /api/health`), database ping latency measurement, active WebSocket connections tracking, and in-memory cache monitoring.
- **Fault-Tolerant UX**: Centralized API error structure and global React Error Boundary fallback screen with gaming-themed HUD.

---

## 🚀 Step-by-Step Setup from Scratch

### 1. Prerequisites
- **Node.js**: v18.x or v20.x+
- **npm**: v9.x+
- **Docker & Docker Compose** *(Optional, for containerized deployments)*

---

### 2. Clone & Install Dependencies

Install root backend dependencies:
```bash
npm install
```

Install frontend client dependencies:
```bash
npm --prefix client install
```

---

### 3. Environment Configuration

Create `.env` file in the root directory:
```bash
cp .env.example .env
```

Ensure your `.env` contains:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=super_secure_production_jwt_secret_esports_2026
JWT_EXPIRES_IN=7d
DATABASE_URL=file:./dev.db
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

---

### 4. Database Setup & Automated Seeding

Generate Prisma client, push database schema, and seed realistic demo records:

```bash
# 1. Generate Prisma Client
npm run prisma:generate

# 2. Push schema to database
npm run prisma:push

# 3. Seed realistic demo data across all 4 roles & tournament formats
npm run prisma:seed
```

---

### 5. Launch Development Servers

Start backend and frontend concurrently in two terminals:

**Terminal 1 — Backend API & WebSockets (`http://localhost:5000`):**
```bash
npm run dev
```

**Terminal 2 — Frontend Client (`http://localhost:3000`):**
```bash
npm run client:dev
```
*(Or navigate to `client/` and run `npm run dev`)*

Access the application in your browser at **`http://localhost:3000`**.

---

### 6. Production Builds & Verification

To verify full production compilation with zero errors:

```bash
# Verify backend TypeScript compilation
npm run build

# Verify frontend production bundle
npm run client:build

# Run full automated test suite (33 tests)
npm run test
```

---

## 🔐 Default Demo Accounts & Credentials

The database seeder (`prisma/seed.ts`) automatically populates test accounts across all system roles:

| Role | Email | Password | Gamertag / In-Game Name | Permissions |
|---|---|---|---|---|
| **SUPER ADMIN** | `admin@esports.com` | `Admin@12345` | `ApexAdmin` | Global authority: user moderation, game catalog CRUD, system telemetry, dispute oversight. |
| **ORGANIZER 1** | `org1@esports.com` | `Password@123` | `NexusHost` | Create & manage tournaments, seed brackets, publish matches, disqualify participants. |
| **ORGANIZER 2** | `org2@esports.com` | `Password@123` | `VortexOps` | Host events, manage tournament sub-databases, export participant CSVs. |
| **REFEREE** | `ref1@esports.com` | `Password@123` | `JudgeDredd` | Match assignment portal, scorecard verification, player check-in verification, dispute resolution. |
| **PLAYER 1-20** | `player1@esports.com` through `player20@esports.com` | `Password@123` | `ShadowViper`, `NovaBlast`, `Krypton99`, `ValkyrieX`, `PhantomStrike`, `BlazeFury`, `FrostByte`, etc. | Solo registration, Duo/Squad team formation, match disputes, live score tracking. |

---

## 🎮 Seeded Games & Tournaments

### 1. Games Catalog
1. **Valorant** — Tactical 5v5 Hero Shooter (Genre: Tactical FPS, Formats: SQUAD).
2. **BGMI / PUBG Mobile** — 100-Player Battle Royale (Genre: Battle Royale, Formats: SOLO, DUO, SQUAD).
3. **Rocket League** — High-Octane Vehicular Soccer (Genre: Sports / Action, Formats: SOLO, DUO, SQUAD).

### 2. Tournaments Populated by Seeder
- **BGMI Pro Solo Showdown (SOLO Battle Royale)**:
  - Format: `SOLO`, Points / Battle Royale scoring.
  - 16 registered solo participants (`TournamentParticipant.teamId` is strictly `null`; **zero Team records created**).
  - 3 completed match rounds with rank and kill points aggregated into live leaderboard standings.
- **Rocket League 2v2 Duo Clash (DUO Knockout)**:
  - Format: `DUO`, Single Elimination.
  - 8 paired teams with team invite codes (e.g., `RL-DUO-01`, `RL-DUO-02`) and 16 linked participants.
- **Valorant Masters Invitational (SQUAD Elimination)**:
  - Format: `SQUAD`, Single Elimination bracket.
  - 4 full 4-player rosters: *Sentinels Prime*, *Fnatic Reborn*, *Paper Rex Elite*, *LOUD Velocity*.
  - Bracket matches (Semifinals & Finals) with live round scores and official referee verification by `ref1@esports.com`.

---

## 🩺 Production Health Checks & Monitoring

### `GET /api/health`
Monitors database connectivity, active WebSocket connections, in-memory cache health, and system resource consumption.

#### Response Payload (`200 OK`):
```json
{
  "status": "healthy",
  "timestamp": "2026-10-19T14:45:00.000Z",
  "uptime": 1420.55,
  "database": {
    "status": "connected",
    "pingMs": 2.14
  },
  "websockets": {
    "status": "active",
    "connectedClients": 14
  },
  "cache": {
    "status": "operational",
    "keys": 8,
    "hits": 142,
    "misses": 18,
    "hitRate": "88.75%"
  },
  "memory": {
    "rss": "85.24 MB",
    "heapTotal": "52.18 MB",
    "heapUsed": "38.64 MB"
  },
  "system": {
    "nodeVersion": "v20.18.0",
    "platform": "win32"
  }
}
```

### Admin Live Telemetry Widget
Located on the **`/admin`** dashboard:
- **Database Latency**: Real-time ping in milliseconds with status badge (`Online` / `Degraded`).
- **Live Sockets**: Real-time connected players and spectator sessions count.
- **Cache Hit Rate**: Performance ratio of in-memory query cache.
- **Memory Footprint**: Active process heap and RSS memory consumption.

---

## 🛡️ Error Handling & UI Resilience

### 1. Centralized API Error Response Formatter
All backend exceptions, validation failures, and authorization denials return a uniform JSON schema:

```json
{
  "success": false,
  "message": "Tournament participant not found or access denied.",
  "errorCode": "RESOURCE_NOT_FOUND",
  "details": null
}
```

Standard error codes implemented:
- `VALIDATION_ERROR` (400)
- `AUTHENTICATION_REQUIRED` (401)
- `FORBIDDEN_ACCESS` (403)
- `ACCOUNT_BANNED` (403)
- `RESOURCE_NOT_FOUND` (404)
- `ENDPOINT_NOT_FOUND` (404)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_SERVER_ERROR` (500)

### 2. Global React Error Boundary (`client/src/components/ErrorBoundary.tsx`)
Intercepts unhandled React rendering exceptions gracefully without crashing the browser tab:
- Renders a cyber-themed gaming HUD fallback screen.
- Displays exception diagnostics (`name`, `message`, and sanitized component stack trace).
- Provides immediate recovery actions: **"Reload Arena"** and **"Return to Home"**.

---

## 🐳 Docker Quick-Start (Containerized Deployment)

Deploy the entire multi-container production stack with a single command:

```bash
docker compose up --build
```

### Services Provisioned:
1. **`etms_postgres`**: PostgreSQL 16 Alpine container with persistent volume and automatic healthcheck.
2. **`etms_redis`**: Redis 7 Alpine cache store.
3. **`etms_backend`**: Node.js Express multi-stage container running production TypeScript build.
4. **`etms_frontend`**: Nginx Alpine container serving optimized Vite static bundle with reverse proxying.

To run detached in background:
```bash
docker compose up -d
```

To stop containers:
```bash
docker compose down
```

---

## 🧪 Automated Testing Suite

Run all test suites covering Authentication, Role-Based Access Control, Tournament Isolation, and Referee Dispute Resolution:

```bash
npm run test
```

### Test Coverage Highlights:
- **`tests/auth.test.ts`**: Password hashing, JWT generation, login rate limiting, role assignments.
- **`tests/rbac.test.ts`**: Admin, Organizer, Player, and Referee permission checks, user ban enforcement.
- **`tests/tournaments.test.ts`**: SOLO vs DUO/SQUAD isolation, team invite codes, roster limit enforcement.
- **`tests/referee-disputes.test.ts`**: Referee scorecard verification, player disputes ticketing, resolution workflow.

---

## 📁 Repository Directory Layout

```
4th_Pro/
├── client/                     # Vite + React 18 Frontend
│   ├── src/
│   │   ├── api/                # Axios API services (auth, tournaments, referee, admin)
│   │   ├── components/         # Navbar, ErrorBoundary, ProtectedRoute, Status Cards
│   │   ├── context/            # AuthContext & SocketContext
│   │   ├── pages/              # Admin, Organizer, Player, Referee, Tournament pages
│   │   ├── types/              # Frontend TypeScript interfaces
│   │   └── App.tsx             # Route definitions & guards
│   ├── Dockerfile              # Multi-stage Nginx build
│   └── nginx.conf              # Nginx SPA fallback & API proxy
├── prisma/
│   ├── schema.prisma           # Prisma Schema (SQLite & PostgreSQL compatible)
│   └── seed.ts                 # Full executable seeder (20 players, 4 roles, 3 formats)
├── src/
│   ├── config/                 # DB singleton, environment validation
│   ├── controllers/            # Route controllers (Auth, Tournaments, Referee, Admin)
│   ├── middlewares/            # Auth, RBAC, Rate-limit, Global Error Handler
│   ├── routes/                 # Express REST route definitions
│   ├── services/               # Core business logic & CacheService
│   ├── utils/                  # Centralized error formatter & custom AppError
│   ├── app.ts                  # Express app, health checks & middleware stack
│   └── server.ts               # HTTP & Socket.IO server entrypoint
├── tests/                      # Automated Vitest integration test suites
├── docker-compose.yml          # Production multi-service orchestration
├── Dockerfile                  # Production backend container definition
├── package.json                # Project manifests & scripts
└── README.md                   # System documentation
```

---

## 📄 License
This project is licensed under the ISC License.
