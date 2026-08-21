# BACKEND_AGENT.md — Backend Agent Briefing

> This is your complete task brief. Read everything in this file before writing a single line of code.

---

## Who You Are

You are the **Backend Agent** for PharmaTrace.  
You own `/backend/**` exclusively.  
You push all work to the `feature/backend` branch on GitHub.

---

## Step 0 — Git Setup (Do This First)

```bash
# Clone the repo (if starting fresh)
git clone https://github.com/subhranikkar-asgard/PharmaTrace.git
cd PharmaTrace

# Switch to your branch
git checkout feature/backend

# Always pull before starting a session
git pull origin feature/backend
```

---

## Step 1 — Read These Documents (In Order)

Before writing code, read each of these files from the repo:

1. `/MASTER.md` — project identity, scope, what is OUT OF SCOPE
2. `/docs/ARCHITECTURE.md` — system structure, module map, your module responsibilities
3. `/docs/CONTRACTS.md` — ALL shared TypeScript types and API response shapes (frozen — do not change without coordination)
4. `/docs/DATABASE.md` — full Prisma schema, state machine, valid transitions
5. `/docs/API.md` — every endpoint you must implement (method, auth, request, response, errors)
6. `/docs/AGENT_RULES.md` — mandatory rules you must follow
7. `/docs/PHASES.md §Phase 2, §Phase 3, §Phase 4` — your exact tasks per phase

> Do NOT skip this. The docs tell you exactly what to build, what response shapes to use, and what to never touch.

---

## Step 2 — One-Time Project Setup

```bash
cd PharmaTrace

# Initialize backend
mkdir -p backend/src/modules backend/src/middleware backend/src/utils
cd backend
npm init -y

# Install all dependencies
npm install express @prisma/client jsonwebtoken bcryptjs zod cors dotenv
npm install -D typescript ts-node @types/node @types/express @types/jsonwebtoken @types/bcryptjs @types/cors prisma nodemon

# Initialize Prisma
npx prisma init

# Copy the schema from docs/DATABASE.md into backend/prisma/schema.prisma
# (Full schema is in DATABASE.md §2 — copy each model exactly)

# Create the database
npx prisma migrate dev --name init

# Confirm tables created
npx prisma studio
```

Copy `.env.example` from repo root to `backend/.env` and fill in values:
```bash
cp ../.env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET
```

**Commit after setup:**
```bash
git add -A
git commit -m "feat(backend): Phase 1 — project scaffold, Prisma schema, migrations"
git push origin feature/backend
```

---

## Step 3 — Build Phase 2 (Core Backend) — 0:30 to 2:30

Build these modules in order. Each module = one commit + one push.

### Module Order

```
1. Entry point + middleware
2. auth module
3. medicines module
4. batches module  ← generates serialized units
5. units module
6. transfers module  ← state machine validation
7. organizations module
```

### Module 1 — Entry Point

File: `backend/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Mount routers here after building each module
// app.use('/api/v1/auth', authRouter);
// etc.

// Error handler — always last
app.use(errorHandler);

app.listen(process.env.PORT || 3001, () => {
  console.log(`PharmaTrace API running on port ${process.env.PORT || 3001}`);
});
```

File: `backend/src/middleware/errorHandler.ts`
- Catch all errors, return `{ success: false, error: { code, message } }` format (see `CONTRACTS.md §2.2`)

File: `backend/src/middleware/auth.ts`
- `authenticate` middleware: verify JWT from `Authorization: Bearer <token>`, attach `req.user`
- `authorize(roles[])` factory: check `req.user.role` is in allowed list

File: `backend/src/middleware/validate.ts`
- Zod-based request validator middleware factory

**Commit:**
```bash
git commit -m "feat(backend): entry point, CORS, error handler, auth middleware"
git push origin feature/backend
```

---

### Module 2 — Auth

File: `backend/src/modules/auth/auth.router.ts`
File: `backend/src/modules/auth/auth.service.ts`

Endpoints (see `API.md §1`):
- `POST /api/v1/auth/login` — bcrypt.compare → sign JWT (`{ userId, role, orgId }`, 8h expiry)
- `GET /api/v1/auth/me` — decode token, return user + org

**Commit:**
```bash
git commit -m "feat(backend): auth module — login, JWT, /me endpoint"
git push origin feature/backend
```

---

### Module 3 — Medicines

Endpoints (see `API.md §2`):
- `POST /api/v1/medicines` — MANUFACTURER only
- `GET /api/v1/medicines` — list for authenticated org

**Commit:**
```bash
git commit -m "feat(backend): medicines module — create, list"
git push origin feature/backend
```

---

### Module 4 — Batches (Critical)

Endpoints (see `API.md §3`):
- `POST /api/v1/batches` — create batch + auto-generate units in **single Prisma transaction**
- `GET /api/v1/batches` 
- `GET /api/v1/batches/:batchId`

**Unit ID generation logic (implement in `batches.service.ts`):**
```typescript
// Inside a prisma.$transaction([...])
const units = Array.from({ length: quantity }, (_, i) => ({
  unitId: `${batchNumber}-${String(i + 1).padStart(6, '0')}`,
  batchId: batch.id,
  status: 'REGISTERED',
}));
await prisma.medicineUnit.createMany({ data: units });
```

**Commit:**
```bash
git commit -m "feat(backend): batches module — create batch + auto-generate serialized units"
git push origin feature/backend
```

---

### Module 5 — Units

Endpoints (see `API.md §4`):
- `GET /api/v1/units/:unitId` — lookup by unitId string (e.g., `B2026-001-000001`)
- `GET /api/v1/units/:unitId/qr` — return `{ unitId, qrContent }` where `qrContent = ${FRONTEND_URL}/verify/${unitId}`

**Commit:**
```bash
git commit -m "feat(backend): units module — get unit, QR content endpoint"
git push origin feature/backend
```

---

### Module 6 — Transfers (State Machine)

File: `backend/src/utils/stateMachine.ts`

```typescript
// Valid transitions map — from DATABASE.md §3
export const VALID_TRANSITIONS: Record<string, string[]> = {
  REGISTERED:      ['MANUFACTURED'],
  MANUFACTURED:    ['IN_DISTRIBUTION'],
  IN_DISTRIBUTION: ['AT_DISTRIBUTOR'],
  AT_DISTRIBUTOR:  ['AT_WHOLESALER'],
  AT_WHOLESALER:   ['AT_PHARMACY'],
  AT_PHARMACY:     ['SOLD', 'RECALLED', 'SUSPICIOUS'],
  SOLD:            ['RECALLED'],
  SUSPICIOUS:      ['RECALLED'],
  RECALLED:        [],
  EXPIRED:         [],
  BLOCKED:         [],
};

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
```

Endpoint (see `API.md §5`):
- `POST /api/v1/transfers` — validate caller role, validate state transition, update unit status, create SupplyChainEvent, create AuditEvent

Role → valid target status mapping:
```
MANUFACTURER  can transfer to AT_DISTRIBUTOR   (sets IN_DISTRIBUTION then AT_DISTRIBUTOR? simplify: direct to AT_DISTRIBUTOR)
DISTRIBUTOR   can transfer to AT_WHOLESALER
WHOLESALER    can transfer to AT_PHARMACY
```

**Commit:**
```bash
git commit -m "feat(backend): transfers module — state machine, supply chain events"
git push origin feature/backend
```

---

### Module 7 — Organizations

Endpoint:
- `GET /api/v1/organizations` — list all orgs (for frontend dropdowns)

**Commit:**
```bash
git commit -m "feat(backend): organizations module — list endpoint"
git push origin feature/backend
```

---

### 🚩 Phase 2 Complete — Signal to Frontend Agent

```bash
git commit --allow-empty -m "milestone: Phase 2 complete — core APIs ready for frontend integration"
git push origin feature/backend
```

> **Frontend Agent**: when you see this commit on `feature/backend`, you can switch from mock data to real API calls for: auth, medicines, batches, units, transfers.

---

## Step 4 — Build Phase 3 (Verification) — 2:30 to 4:00

### Utility: hashChain.ts

File: `backend/src/utils/hashChain.ts`

```typescript
import crypto from 'crypto';
import { prisma } from '../db';

export async function createAuditEvent(
  eventType: string,
  entityId: string,
  eventData: Record<string, unknown>,
  actorId?: string
) {
  const lastEvent = await prisma.auditEvent.findFirst({
    where: { entityId },
    orderBy: { timestamp: 'desc' },
  });

  const previousHash = lastEvent?.currentHash ?? '';
  const timestamp = new Date();
  const payload = JSON.stringify({ ...eventData, entityId, eventType }, Object.keys({ ...eventData, entityId, eventType }).sort());
  const currentHash = crypto
    .createHash('sha256')
    .update(payload + previousHash + timestamp.toISOString())
    .digest('hex');

  return prisma.auditEvent.create({
    data: { eventType, entityId, eventData, previousHash, currentHash, timestamp, actorId },
  });
}
```

### Utility: fraudEngine.ts

File: `backend/src/utils/fraudEngine.ts`

Rules (additive, capped at 100) — from `ARCHITECTURE.md §7`:

| Rule | Score | Condition |
|---|---|---|
| RECALLED | +100 | batch.status === 'RECALLED' |
| EXPIRED | +100 | batch.expiryDate < now |
| ALREADY_SOLD | +40 | sale record exists |
| DUPLICATE_SCAN | +25 | last scan within DUPLICATE_SCAN_WINDOW_SECONDS |
| IMPOSSIBLE_TRAVEL | +30 | required speed > IMPOSSIBLE_TRAVEL_THRESHOLD_KMH |
| EXCESSIVE_SCANS | +20 | scanCount > EXCESSIVE_SCAN_THRESHOLD |

Returns: `{ riskScore: number, riskLevel: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL', reasons: string[] }`

Risk bands: 0–29 LOW, 30–59 MEDIUM, 60–79 HIGH, 80–100 CRITICAL

**Haversine distance** (for impossible travel):
```typescript
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

**Commit:**
```bash
git commit -m "feat(backend): fraudEngine + hashChain utilities"
git push origin feature/backend
```

---

### Verification Endpoint

Endpoint (see `API.md §6`): `GET /api/v1/verify/:unitId` — **no auth required**

Logic flow:
1. Find unit (include batch, medicine, supplyChain, scans, sale)
2. If not found → `404 UNIT_NOT_FOUND`
3. Create ScanEvent (with lat/lng from query params)
4. Run `fraudEngine.evaluate(unit, allScans, currentScan)`
5. If riskScore ≥ 30 → create FraudAlert
6. Call `createAuditEvent(UNIT_VERIFIED, unitId, {...}, null)`
7. Return VerificationResponse (shape from `CONTRACTS.md §3`)

```bash
git commit -m "feat(backend): verification module — public verify endpoint, scan recording"
git push origin feature/backend
```

---

### Sales Endpoint

Endpoint (see `API.md §7`): `POST /api/v1/sales` — PHARMACY only

```bash
git commit -m "feat(backend): sales module — mark unit sold, block re-sale"
git push origin feature/backend
```

---

### Audit Endpoints

Endpoints (see `API.md §10`):
- `GET /api/v1/audit/:entityId`
- `GET /api/v1/audit/:entityId/verify` — re-compute all hashes, return `chainValid: boolean`

```bash
git commit -m "feat(backend): audit module — hash chain read + verify endpoint"
git push origin feature/backend
```

---

## Step 5 — Build Phase 4 (Recalls + Alerts) — 4:00 to 5:00

### Recalls

Endpoint (see `API.md §8`): `POST /api/v1/recalls` — REGULATOR only

```typescript
// In a single transaction:
await prisma.$transaction([
  prisma.recall.create({ data: { batchId, reason, initiatedBy } }),
  prisma.batch.update({ where: { id: batchId }, data: { status: 'RECALLED' } }),
  prisma.medicineUnit.updateMany({ where: { batchId }, data: { status: 'RECALLED' } }),
]);
await createAuditEvent('BATCH_RECALLED', batchId, { reason }, actorId);
```

```bash
git commit -m "feat(backend): recalls module — batch recall, unit propagation"
git push origin feature/backend
```

---

### Alerts

Endpoints (see `API.md §9`):
- `GET /api/v1/alerts` (with filters)
- `GET /api/v1/alerts/:alertId`
- `PATCH /api/v1/alerts/:alertId/resolve`

```bash
git commit -m "feat(backend): alerts module — fraud alert list, resolve"
git push origin feature/backend
```

---

### Stats

Endpoint: `GET /api/v1/stats`

```typescript
const [totalUnits, totalVerifications, suspiciousEvents, activeRecalls, criticalAlerts] =
  await Promise.all([
    prisma.medicineUnit.count(),
    prisma.scanEvent.count(),
    prisma.fraudAlert.count({ where: { resolvedAt: null } }),
    prisma.recall.count(),
    prisma.fraudAlert.count({ where: { riskLevel: 'CRITICAL', resolvedAt: null } }),
  ]);
```

```bash
git commit -m "feat(backend): stats endpoint for regulator dashboard"
git push origin feature/backend
```

---

### 🚩 Phase 4 Complete — Signal to Frontend Agent

```bash
git commit --allow-empty -m "milestone: Phase 4 complete — ALL backend APIs ready"
git push origin feature/backend
```

> **Frontend Agent**: when you see this commit, ALL endpoints are live. Wire everything.

---

## Step 6 — Seed Data — Phase 6

File: `backend/prisma/seed.ts`

Use `upsert` for everything. Create exactly:
- 5 organizations (ABC Pharma, MedDist, PharmaTrade, City Pharmacy, CDSCO)
- 5 users (one per org, email/password from `PRD.md §6`)
- 1 medicine (Paracetamol 500 mg Tablet)
- 2 batches (B2026-001 active, B2026-002 to be recalled)
- Units: B2026-001-000001 (AT_PHARMACY, clean), B2026-001-000002 (SOLD), B2026-002-000001 (recalled)
- Full supply chain events for all demo units
- Corresponding audit events and scan events

```bash
npx prisma db seed
git commit -m "feat(backend): seed data — full demo data for Golden Demo"
git push origin feature/backend
```

---

## Rules You Must Always Follow

1. Only modify files under `/backend/**`.
2. Never change `CONTRACTS.md` response shapes without coordination.
3. Never remove public access from `GET /api/v1/verify/:unitId`.
4. Always create an AuditEvent for every significant action.
5. Use `upsert` in seed, never raw `create`.
6. Never commit `.env` — only `.env.example`.
7. Push after every module. Do not batch everything into one giant push.
8. Use the exact commit message format above so the Frontend Agent can track your progress.

---

## Files You Must Never Touch

- `/frontend/**` — belongs to Frontend Agent
- `/docs/**` — belongs to Lead
- `/shared/types/index.ts` — coordinate with Lead before changing
- `/MASTER.md` — read-only for you
