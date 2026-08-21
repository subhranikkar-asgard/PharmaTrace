# ARCHITECTURE.md — PharmaTrace System Architecture

> Authority: derives from `MASTER.md`. See `MASTER.md §Contract Hierarchy`.

---

## 1. Overview

PharmaTrace is a **modular monolith**. There are exactly two deployed processes:

1. **Vite dev server** (or static build) — serves the React frontend.
2. **Express API server** — serves all backend logic via `/api/v1/`.

Both share a single PostgreSQL (or SQLite) database via Prisma ORM.

```
┌─────────────────────────────────────────────┐
│                   Browser                    │
│            React + Vite + Tailwind           │
│    Public Verify | Manufacturer | Regulator  │
└────────────────────┬────────────────────────┘
                     │ HTTP JSON  (REST /api/v1/)
                     ▼
┌─────────────────────────────────────────────┐
│               Express API Server             │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  auth    │ │medicines │ │   batches   │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  units   │ │transfers │ │verification │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  sales   │ │  fraud   │ │   recalls   │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
│  ┌──────────┐ ┌──────────┐                  │
│  │  alerts  │ │  audit   │                  │
│  └──────────┘ └──────────┘                  │
└────────────────────┬────────────────────────┘
                     │ Prisma ORM
                     ▼
┌─────────────────────────────────────────────┐
│   PostgreSQL  (SQLite for dev if needed)     │
└─────────────────────────────────────────────┘
```

---

## 2. Repository Structure

```
pharmatrace/
├── MASTER.md
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── CONTRACTS.md
│   ├── OWNERSHIP.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── AGENT_RULES.md
│   ├── PHASES.md
│   └── DEMO.md
├── shared/
│   └── types/
│       └── index.ts          ← Shared TypeScript types (owned by Lead)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── VerifyPage.tsx
│   │   │   ├── ManufacturerPage.tsx
│   │   │   └── RegulatorPage.tsx
│   │   ├── components/
│   │   ├── services/
│   │   │   └── api.ts        ← All backend calls
│   │   └── types/
│   │       └── index.ts      ← Copies/re-exports from shared/types
│   └── public/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── index.ts          ← Express entry point
│       ├── config.ts
│       ├── middleware/
│       │   ├── auth.ts
│       │   ├── errorHandler.ts
│       │   └── validate.ts
│       ├── modules/
│       │   ├── auth/
│       │   ├── medicines/
│       │   ├── batches/
│       │   ├── units/
│       │   ├── transfers/
│       │   ├── verification/
│       │   ├── sales/
│       │   ├── fraud/
│       │   ├── recalls/
│       │   ├── alerts/
│       │   └── audit/
│       └── utils/
│           ├── hashChain.ts
│           └── fraudEngine.ts
└── .env.example
```

---

## 3. Backend Module Responsibilities

| Module | Responsibility |
|---|---|
| `auth` | Login, JWT issuance, role verification middleware |
| `medicines` | CRUD for Medicine entity |
| `batches` | CRUD for Batch entity; batch-level recall trigger |
| `units` | Serialized unit generation; state reads |
| `transfers` | Supply-chain movement; state transitions |
| `verification` | Public verify endpoint; scan event recording; fraud invocation |
| `sales` | Mark unit SOLD; block re-sale |
| `fraud` | Deterministic rule engine; FraudAlert creation |
| `recalls` | Batch recall; unit state propagation |
| `alerts` | Read FraudAlert list for regulator |
| `audit` | AuditEvent creation; hash-chain computation; chain verification |

---

## 4. Data Flow: Verification Request

```
Browser → POST /api/v1/verify/:unitId
            │
            ▼
      verification module
            │
            ├─ find unit + batch (Prisma)
            ├─ check expiry
            ├─ check recall status
            ├─ check sale status
            ├─ record ScanEvent
            │
            ├─ call fraud module
            │     ├─ load scan history
            │     ├─ evaluate rules
            │     └─ return { riskScore, riskLevel, reasons[] }
            │
            ├─ if riskScore ≥ 30 → create FraudAlert (fraud module)
            │
            ├─ create AuditEvent (audit module)
            │
            └─ return VerificationResponse
```

---

## 5. Data Flow: Recall

```
Regulator → POST /api/v1/recalls
              │
              ▼
        recalls module
              │
              ├─ validate batch exists
              ├─ create Recall record
              ├─ UPDATE all units in batch → status = RECALLED
              ├─ create AuditEvent
              └─ return { recallId, affectedUnits }
```

---

## 6. Audit Hash Chain

Every significant event (unit creation, transfer, verification, sale, recall, fraud alert) creates an `AuditEvent`.

```
Hash formula:
  currentHash = SHA256(
    JSON.stringify(sortedEventData) +
    previousHash +
    timestamp.toISOString()
  )

Chain:
  AuditEvent #1  previousHash=""         currentHash=HashA
  AuditEvent #2  previousHash=HashA      currentHash=HashB
  AuditEvent #3  previousHash=HashB      currentHash=HashC
```

Verification: re-compute each hash from stored data and confirm it matches stored `currentHash`, and that `previousHash` equals the prior event's `currentHash`.

---

## 7. Fraud Engine Rules

```typescript
// Executed in fraudEngine.ts
// Returns { riskScore: number, riskLevel: string, reasons: string[] }

Rules (additive, capped at 100):
  UNIT_INVALID       +100  "Medicine unit not found in the system"
  RECALLED           +100  "Batch has been recalled — do not dispense"
  EXPIRED            +100  "Medicine has passed its expiry date"
  ALREADY_SOLD       +40   "Medicine unit has already been sold"
  DUPLICATE_SCAN     +25   "Duplicate scan detected within short interval"
  IMPOSSIBLE_TRAVEL  +30   "Physically impossible movement between scan locations"
  EXCESSIVE_SCANS    +20   "Abnormally high number of scans for this unit"

Risk bands:
  0–29    LOW
  30–59   MEDIUM
  60–79   HIGH
  80–100  CRITICAL
```

---

## 8. Authentication Design

- JWT, signed with `JWT_SECRET` env var, 8-hour expiry.
- Token payload: `{ userId, role, orgId }`.
- Middleware `authenticate` validates token on protected routes.
- Middleware `authorize(roles[])` checks role membership.
- Public routes: `GET /api/v1/verify/:unitId` — no token required.
- Demo accounts seeded; no registration UI required.

---

## 9. QR Code Design

- QR content: `https://{FRONTEND_URL}/verify/{unitId}`
- Generated client-side using `qrcode` npm package.
- No sensitive information in QR.
- Unit ID format: `B2026-001-000001`

---

## 10. Environment Configuration

```
# .env.example
DATABASE_URL="postgresql://user:password@localhost:5432/pharmatrace"
JWT_SECRET="change-this-in-production"
PORT=3001
FRONTEND_URL="http://localhost:5173"
IMPOSSIBLE_TRAVEL_THRESHOLD_KMH=500
DUPLICATE_SCAN_WINDOW_SECONDS=300
EXCESSIVE_SCAN_THRESHOLD=5
```

---

## 11. Architectural Decisions

| Decision | Choice | Reason |
|---|---|---|
| Monolith vs microservices | Monolith | 8-hour constraint; no operational overhead |
| ORM | Prisma | Type-safe, fast setup, schema-as-code |
| Fraud detection | Deterministic rules | No ML infra needed; explainable by design |
| Blockchain | None (hash chain in DB) | "Blockchain-ready" narrative; zero infra |
| Auth | Simple JWT + seeds | No time for OAuth / SSO |
| QR scanning | Manual entry fallback | `html5-qrcode` is optional enhancement |
| SQLite vs PostgreSQL | PostgreSQL preferred; SQLite if needed | Document the decision in a note in `DATABASE.md` |
