# PHASES.md — PharmaTrace Implementation Phases

> Authority: derives from `MASTER.md §11`. Each phase has a single owner, explicit dependencies, allowed file set, tasks, interfaces consumed/produced, acceptance criteria, and definition of done.

---

## Phase Summary

| Phase | Window | Owner | Objective |
|---|---|---|---|
| 1 — Foundation | 0:00–0:30 | **Lead** | Repo · schema · env · shell · seed structure |
| 2 — Core Backend | 0:30–2:30 | **Backend Agent** | Medicine · batch · unit · transfer APIs · state machine |
| 3 — Verification | 2:30–4:00 | **Backend Agent** | Public verify · scan events · fraud engine · alerts |
| 4 — Fraud + Audit | 4:00–5:00 | **Backend Agent** | Hash chain audit · alert endpoint · recall API |
| 5 — UI | 5:00–6:30 | **Frontend Agent** | All three screens · QR · supply chain timeline |
| 6 — Integration | 6:30–8:00 | **All** | Seed data · end-to-end tests · polish · demo rehearsal |

---

## Phase 1 — Foundation

**Time**: 0:00–0:30  
**Owner**: Lead  
**Goal**: Everyone can start working immediately after this phase.

### Tasks

1. Initialize Git repository.
2. Create folder structure:
   ```
   /MASTER.md
   /docs/
   /shared/types/index.ts    ← publish Role, UnitStatus, RiskLevel, EventType enums
   /frontend/                ← `npm create vite@latest frontend -- --template react-ts`
   /backend/                 ← `npm init` + install express, prisma, etc.
   /backend/prisma/schema.prisma  ← full schema from DATABASE.md
   /.env.example
   ```
3. Install frontend dependencies: `react`, `vite`, `tailwindcss`, `shadcn-ui`, `qrcode`, `recharts`.
4. Install backend dependencies: `express`, `@prisma/client`, `prisma`, `jsonwebtoken`, `bcryptjs`, `zod`, `cors`, `dotenv`.
5. Configure Tailwind in frontend.
6. Configure Prisma datasource (PostgreSQL preferred; SQLite if needed).
7. Run `npx prisma migrate dev --name init` to create DB.
8. Create stub `seed.ts` (data creation deferred to Phase 6).
9. Publish `shared/types/index.ts` with all enums from `CONTRACTS.md §1`.
10. Create branch structure: `feature/backend`, `feature/frontend`.
11. Commit skeleton and push.

### Interfaces Produced

- Complete Prisma schema (all models from `DATABASE.md`).
- `shared/types/index.ts` with all enums.
- Working `npx prisma studio` view of empty tables.
- Frontend dev server starts on port 5173.
- Backend dev server starts on port 3001.

### Acceptance Criteria

- [ ] `npx prisma migrate status` shows all migrations applied.
- [ ] `npx ts-node backend/src/index.ts` starts without error.
- [ ] `npm run dev` in frontend loads a blank React page.
- [ ] All enum values in `shared/types/index.ts` match `CONTRACTS.md §1`.

### Definition of Done

Foundation phase is done when both dev servers start and the database schema is applied.

---

## Phase 2 — Core Backend

**Time**: 0:30–2:30  
**Owner**: Backend Agent  
**Depends on**: Phase 1 (schema + enums)

### Tasks

1. Implement Express entry point (`backend/src/index.ts`) with CORS, JSON parsing, error handler middleware.
2. Implement `auth` module:
   - `POST /api/v1/auth/login` — bcrypt compare, issue JWT.
   - `GET /api/v1/auth/me` — decode JWT, return user.
   - `authenticate` middleware.
   - `authorize(roles[])` middleware.
3. Implement `medicines` module:
   - `POST /api/v1/medicines` (MANUFACTURER only).
   - `GET /api/v1/medicines`.
4. Implement `batches` module:
   - `POST /api/v1/batches` — create batch, auto-generate N units in transaction.
   - `GET /api/v1/batches`.
   - `GET /api/v1/batches/:batchId`.
   - Unit ID generation: `${batchNumber}-${String(seq).padStart(6, '0')}`.
5. Implement `units` module:
   - `GET /api/v1/units/:unitId`.
   - `GET /api/v1/units/:unitId/qr`.
6. Implement `transfers` module:
   - `POST /api/v1/transfers` — validate state transition, update unit status, create SupplyChainEvent.
   - State transition validator in `backend/src/utils/stateMachine.ts`.
7. Implement `organizations` module:
   - `GET /api/v1/organizations`.
8. Implement global error handler (`backend/src/middleware/errorHandler.ts`) that returns `ApiError` format.
9. Implement input validation using Zod on all write endpoints.

### Allowed Files

- `/backend/src/**`
- `/backend/prisma/seed.ts` (stub only — full seed in Phase 6)
- `/backend/package.json` (add dependencies as needed)

### Interfaces Consumed

- `shared/types/index.ts` — all enums.
- `DATABASE.md` — schema, state machine table.
- `CONTRACTS.md` — all request/response shapes.
- `API.md` — exact endpoint definitions.

### Interfaces Produced

- All auth, medicine, batch, unit, transfer, organization endpoints.
- Functioning state machine validation.
- Working JWT middleware.

### Acceptance Criteria

- [ ] `POST /api/v1/auth/login` returns JWT for seeded user.
- [ ] `POST /api/v1/batches` creates batch + 5 units in a single transaction.
- [ ] Units have IDs in format `B2026-001-000001`.
- [ ] `POST /api/v1/transfers` advances unit from `MANUFACTURED` → `IN_DISTRIBUTION`.
- [ ] Invalid transfer (wrong role, wrong state) returns `INVALID_STATE_TRANSITION`.
- [ ] All responses match `CONTRACTS.md` shapes.

### Definition of Done

All Phase 2 acceptance criteria pass. No errors in `console.error` on a clean test run.

---

## Phase 3 — Verification

**Time**: 2:30–4:00  
**Owner**: Backend Agent  
**Depends on**: Phase 2 (units, transfers, state machine)

### Tasks

1. Implement `verification` module:
   - `GET /api/v1/verify/:unitId` — public, no auth.
   - Load unit + batch + medicine + supply chain events.
   - Check: unit exists, batch exists, expiry, recall status, sale status.
   - Record `ScanEvent`.
   - Call `fraudEngine.evaluate(unit, scanHistory, currentScan)`.
   - If `riskScore >= 30`: call `fraud.createAlert(...)`.
   - Call `audit.createEvent(UNIT_VERIFIED, ...)`.
   - Return `VerificationResponse` (see `CONTRACTS.md §3`).
2. Implement `fraudEngine.ts` utility:
   ```
   Rules (evaluated in order, additive, capped at 100):
   - RECALLED:           +100
   - EXPIRED:            +100
   - ALREADY_SOLD:       +40
   - DUPLICATE_SCAN:     +25  (scan within DUPLICATE_SCAN_WINDOW_SECONDS of previous)
   - IMPOSSIBLE_TRAVEL:  +30  (required speed > IMPOSSIBLE_TRAVEL_THRESHOLD_KMH)
   - EXCESSIVE_SCANS:    +20  (scanCount > EXCESSIVE_SCAN_THRESHOLD)
   ```
3. Implement impossible-travel calculation:
   - Haversine distance between previous scan lat/lng and current.
   - Speed = distance / (timeDiff in hours).
   - Flag if speed > threshold (default 500 km/h).
4. Implement `hashChain.ts` utility:
   - `createAuditEvent(eventType, entityId, eventData, actorId)`:
     - Fetch last AuditEvent for entityId.
     - `previousHash = lastEvent?.currentHash ?? ''`.
     - `currentHash = SHA256(JSON.stringify(sortedData) + previousHash + timestamp.toISOString())`.
     - Insert AuditEvent.
5. Implement `audit` module:
   - `GET /api/v1/audit/:entityId` — list events.
   - `GET /api/v1/audit/:entityId/verify` — re-compute hashes and confirm chain.
6. Implement `sales` module:
   - `POST /api/v1/sales` — PHARMACY only; validate unit at AT_PHARMACY; create Sale; update unit status to SOLD; create AuditEvent.

### Allowed Files

- `/backend/src/**`

### Interfaces Consumed

- Phase 2 outputs (units, batches, supply chain events).
- `CONTRACTS.md §3` (VerificationResponse shape).
- `DATABASE.md §3` (state machine).
- `.env` vars: `IMPOSSIBLE_TRAVEL_THRESHOLD_KMH`, `DUPLICATE_SCAN_WINDOW_SECONDS`, `EXCESSIVE_SCAN_THRESHOLD`.

### Interfaces Produced

- `GET /api/v1/verify/:unitId` (public verification endpoint — primary demo endpoint).
- `POST /api/v1/sales`.
- `GET /api/v1/audit/:entityId`.
- `GET /api/v1/audit/:entityId/verify`.
- `fraudEngine.evaluate()` utility function.
- `hashChain.createAuditEvent()` utility function.

### Acceptance Criteria

- [ ] `GET /api/v1/verify/B2026-001-000001` returns `riskScore: 0`, `riskLevel: "LOW"`.
- [ ] After `POST /api/v1/sales` for that unit, second verify returns `riskScore >= 40` and `reasons` includes "already sold" text.
- [ ] Impossible-travel flag fires when lat/lng changes by > 1000 km in < 1 minute (simulate with query params).
- [ ] Hash chain `verify` endpoint returns `chainValid: true` on a clean chain.
- [ ] All scan events are persisted in `ScanEvent` table.
- [ ] `FraudAlert` created when `riskScore >= 30`.

### Definition of Done

Public verification returns correct responses for VERIFIED, SUSPICIOUS scenarios. Hash chain verifies clean.

---

## Phase 4 — Fraud + Audit + Recalls

**Time**: 4:00–5:00  
**Owner**: Backend Agent  
**Depends on**: Phase 3 (fraud engine, audit events, scan events)

### Tasks

1. Implement `recalls` module:
   - `POST /api/v1/recalls` — REGULATOR only.
   - Validate batch exists and is not already recalled.
   - Create `Recall` record.
   - UPDATE all `MedicineUnit` in batch → `status = RECALLED`.
   - UPDATE `Batch.status = RECALLED`.
   - Create `AuditEvent(BATCH_RECALLED)`.
   - Return `RecallResponse`.
   - `GET /api/v1/recalls`.
2. Implement `alerts` module:
   - `GET /api/v1/alerts` with optional `?riskLevel=&resolved=&limit=&offset=` filters.
   - `GET /api/v1/alerts/:alertId`.
   - `PATCH /api/v1/alerts/:alertId/resolve`.
3. Implement `stats` endpoint:
   - `GET /api/v1/stats` — return counts for dashboard.
4. Ensure `GET /api/v1/verify/:unitId` for a RECALLED unit returns `status: "RECALLED"`, `riskScore: 100`, `riskLevel: "CRITICAL"`, `recallReason: "..."`.

### Allowed Files

- `/backend/src/**`

### Interfaces Consumed

- Phase 3 outputs (fraud engine, audit, verification).
- `CONTRACTS.md §8, §9, §10`.

### Interfaces Produced

- `POST /api/v1/recalls`.
- `GET /api/v1/recalls`.
- `GET /api/v1/alerts`.
- `GET /api/v1/alerts/:alertId`.
- `PATCH /api/v1/alerts/:alertId/resolve`.
- `GET /api/v1/stats`.

### Acceptance Criteria

- [ ] `POST /api/v1/recalls` marks all batch units RECALLED.
- [ ] Verify of recalled unit returns `status: "RECALLED"` and `recallReason`.
- [ ] `GET /api/v1/alerts` returns FraudAlert list with correct shape.
- [ ] `GET /api/v1/stats` returns correct counts from database.
- [ ] REGULATOR-only endpoints reject MANUFACTURER token with 403.

### Definition of Done

All three verification states (VERIFIED, SUSPICIOUS, RECALLED) work end-to-end through the API. Regulator can see alerts and issue recalls.

---

## Phase 5 — Frontend / UI

**Time**: 5:00–6:30  
**Owner**: Frontend Agent  
**Depends on**: Phase 2–4 (all API endpoints must be working; use mock data if not yet available)

### Constraint

If backend endpoints are not yet ready, implement the UI against **static mock data** matching `CONTRACTS.md` shapes. Wire to real API in Phase 6.

### Tasks

#### Screen 1: Public Verification (`/verify` or `/verify/:unitId`)

**Highest priority.**

- Input: text field for Unit ID + optional Scan QR button (using `html5-qrcode` if time allows; manual entry is sufficient).
- On submit: call `GET /api/v1/verify/:unitId` (no auth).
- Render three distinct result states:

  **VERIFIED (green)**
  ```
  ✓ VERIFIED
  Paracetamol 500 mg Tablet
  Batch: B2026-001
  Manufacturer: ABC Pharma
  Manufactured: 2026-01-15   Expiry: 2027-12-31
  
  Supply Chain
  ✓ Manufacturer — ABC Pharma — Mumbai
  ✓ Distributor  — MedDist Pvt Ltd — Delhi
  ✓ Wholesaler   — PharmaTrade — Kolkata
  ✓ Pharmacy     — City Pharmacy — Bangalore
  ```

  **SUSPICIOUS (amber)**
  ```
  ⚠ SUSPICIOUS PRODUCT
  Risk Score: 87/100
  Reasons:
  • Medicine unit has already been sold
  • Duplicate scan detected within short interval
  • Physically impossible movement between scan locations
  
  DO NOT DISPENSE — Contact your pharmacist immediately
  ```

  **RECALLED (red)**
  ```
  🚨 RECALLED PRODUCT
  Batch B2026-001 has been recalled.
  Reason: Quality defect detected — batch withdrawn immediately.
  
  DO NOT USE — Return to pharmacy
  ```

#### Screen 2: Manufacturer Dashboard (`/manufacturer`)

- Requires login (check JWT in localStorage).
- Show: list of batches with unit count, status, expiry.
- Create Batch form: medicine dropdown, batch number, quantity, dates.
- Batch detail: list of units with status + QR display (render QR image using `qrcode` package for selected unit).
- Transfer button: select units, select destination org, submit.

#### Screen 3: Regulator Dashboard (`/regulator`)

**Second highest priority.**

- Requires login (REGULATOR role).
- Summary cards: Total Units · Verifications · Suspicious Events · Active Recalls.
- Alert list: cards showing unitId, riskScore, riskLevel badge (color-coded), reasons, timestamps.
- Alert card has two actions: [Investigate] (expands detail) and [Recall Batch] (calls `POST /api/v1/recalls`).
- Recall confirmation modal.
- Recall list showing recalled batches.

#### Navigation

- Simple top nav: PharmaTrace logo | Verify | Manufacturer | Regulator | Login.
- Role-aware: show Manufacturer/Regulator links only when logged in with the right role.

#### Visual Style

- Font: Inter (Google Fonts or Tailwind default).
- Background: `slate-50`.
- Cards: white with `shadow-sm`, `rounded-xl`.
- Primary: `blue-600` / `teal-600`.
- Success: `green-600`.
- Warning: `amber-500`.
- Critical: `red-600`.
- Text: `slate-900` / `slate-700`.
- No neon, no glassmorphism, no excessive gradients.

### Allowed Files

- `/frontend/src/**`
- `/frontend/public/**`
- `/frontend/index.html`
- `/frontend/package.json` (add dependencies)

### Interfaces Consumed

- All API endpoints from `API.md`.
- Types from `shared/types/index.ts`.
- `CONTRACTS.md` — all response shapes.
- `DEMO.md` — demo unit IDs and expected UI states.

### Acceptance Criteria

- [ ] `/verify` page renders without errors.
- [ ] Entering `B2026-001-000001` shows VERIFIED state (green).
- [ ] Entering `B2026-001-000002` (sold unit) shows SUSPICIOUS state (amber) with reasons.
- [ ] Entering a recalled unit shows RECALLED state (red).
- [ ] Manufacturer dashboard shows batch list and unit QR.
- [ ] Regulator dashboard shows alert cards with Recall Batch button.
- [ ] Recall modal fires `POST /api/v1/recalls` and refreshes the UI.
- [ ] No TypeScript compilation errors.

### Definition of Done

All three verification states render correctly. Regulator can see alerts and issue a recall from the UI.

---

## Phase 6 — Integration & Demo Preparation

**Time**: 6:30–8:00  
**Owner**: All (coordinated by Lead)  
**Depends on**: All previous phases

### Tasks

1. **Seed data** (`/backend/prisma/seed.ts`):
   - Create all organizations, users, medicine, batches, units from `PRD.md §6`.
   - Run full supply-chain for demo units (B2026-001-000001 through AT_PHARMACY).
   - Mark B2026-001-000002 as SOLD.
   - Create batch B2026-002 with recalled status (for unit B2026-001-000003 or a unit in B2026-002).
   - Create matching scan events, supply chain events, audit events, fraud alerts.
   - Run `npx prisma db seed` and verify all data.

2. **Integration tests** (Backend Agent):
   Run the following sequence without errors:
   ```
   POST /auth/login (manufacturer)
   POST /batches   → batchId
   GET  /verify/:unitId → riskScore=0
   POST /sales { unitId }
   GET  /verify/:unitId → riskScore>=40, reasons include "already sold"
   POST /auth/login (regulator)
   POST /recalls { batchId }
   GET  /verify/:unitId → status=RECALLED
   GET  /audit/:unitId/verify → chainValid=true
   ```

3. **Frontend wiring** (Frontend Agent):
   - Replace any mock data with real API calls.
   - Test all three verify result states against seeded data.
   - Fix any styling issues.
   - Add loading spinners and error states.

4. **Demo rehearsal** (Lead):
   - Execute `DEMO.md` steps 1–16 end-to-end.
   - Record any bugs.
   - Fix critical bugs only.
   - Validate the Golden Demo passes without errors.

5. **Polish** (Frontend Agent):
   - Ensure supply-chain timeline shows all four nodes with timestamps.
   - Ensure QR renders for the demo unit.
   - Ensure risk score is visually prominent (number + color + label).

### Acceptance Criteria

- [ ] `npx prisma db seed` runs without error.
- [ ] All seeded unit IDs match `DEMO.md`.
- [ ] Integration test sequence passes end-to-end.
- [ ] Golden Demo from `DEMO.md` executes without manual data entry.
- [ ] All three verification result states visible in UI.
- [ ] No console errors during demo.

### Definition of Done

`DEMO.md` can be executed start-to-finish by anyone on the team without additional setup. The system demonstrates all 16 steps of the Golden Demo Flow.
