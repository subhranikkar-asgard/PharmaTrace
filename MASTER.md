# MASTER.md — PharmaTrace Authoritative Reference

> **This is the highest-authority document in the PharmaTrace repository.**
> All other documents derive from this file. If any lower-level document contradicts this file, this file wins. Stop and resolve the contradiction before writing code.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Project name** | PharmaTrace |
| **Formal title** | Counterfeit Medicine Supply-Chain Verification |
| **Type** | Internal hackathon prototype |
| **Implementation window** | ≤ 8 hours |
| **Blockchain** | None — tamper-evident PostgreSQL audit chain only |

---

## 2. Primary Objective

Demonstrate one complete, working **Golden Demo Flow** (see §9 and `DEMO.md`):

```
Create Medicine → Batch → Serialized Unit → QR
  → Supply-Chain Movement → Patient Scans → VERIFIED
  → Pharmacy Sells → Same QR Scanned → SUSPICIOUS
  → Fraud Engine → Risk Score + Reasons
  → Regulator Alert → Recall Batch
  → Patient Scans → RECALLED
```

**Every architectural decision must serve this flow. Nothing else takes priority.**

---

## 3. Prototype Scope

### MUST IMPLEMENT
- Medicine / Batch / Unit creation
- Unit-level serialization (`B2026-001-000001`)
- QR code generation (encodes verification URL or unit ID)
- QR scanning or manual unit-ID entry
- Supply-chain simulation: MANUFACTURER → DISTRIBUTOR → WHOLESALER → PHARMACY
- Unit state machine (see §7)
- Verification endpoint (checks expiry, recall, sale, duplicate, fraud)
- Duplicate scan detection
- Impossible-travel detection (simulated coordinates)
- Deterministic fraud rule engine with risk score + human-readable reasons
- Mark-as-sold + block re-sale
- Regulator batch recall
- SHA-256 hash-chain audit log
- Three UI views: Public Verification · Manufacturer · Regulator

### OUT OF SCOPE (DO NOT IMPLEMENT)
- Any real blockchain (Hyperledger, Ethereum, Solidity, wallets, tokens)
- Machine-learning fraud detection
- Real geolocation services or production map infrastructure
- Real pharmaceutical/government integrations
- Real SMS / email infrastructure
- Native mobile apps (iOS / Android)
- IoT / hardware sensors
- Microservices / Kubernetes
- Complex org administration
- Advanced analytics beyond what the demo needs
- Production-grade distributed architecture

---

## 4. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Charts** | Recharts (dashboard counters only) |
| **QR Generate** | `qrcode` npm package |
| **QR Scan** | `html5-qrcode` (nice-to-have; manual entry is fallback) |
| **Backend** | Node.js 20, TypeScript, Express |
| **Database** | PostgreSQL + Prisma ORM |
| **DB fallback** | SQLite (only if PostgreSQL setup threatens the deadline — document the choice) |
| **Auth** | Simple JWT + role enum; seeded demo accounts |
| **Hashing** | Node `crypto` SHA-256 |
| **API prefix** | `/api/v1/` |

---

## 5. Architecture Summary

```
Browser (React / Vite)
        │  HTTP + JSON
        ▼
Express API  (/api/v1/)
        │
  ┌─────┴──────────────────────────────────────────────┐
  │  Logical modules (single process, single codebase)  │
  │  auth · medicines · batches · units · transfers     │
  │  verification · sales · fraud · recalls · audit     │
  └─────────────────────────────────────────────────────┘
        │  Prisma ORM
        ▼
  PostgreSQL (or SQLite for dev)
```

No microservices. No message queues. Modular monolith only.

---

## 6. Component Boundaries

| Component | Directory | Owner Agent |
|---|---|---|
| Frontend app | `/frontend/` | **Frontend Agent** |
| Backend API | `/backend/` | **Backend Agent** |
| Prisma schema + migrations | `/backend/prisma/` | **Backend Agent** |
| Shared TypeScript types | `/shared/types/` | **Lead / by coordination** |
| Documentation | `/docs/` | **Lead / Architecture** |
| Root config & CI | `/` | **Lead only** |

---

## 7. Unit State Machine (Summary)

```
REGISTERED → MANUFACTURED → IN_DISTRIBUTION → AT_DISTRIBUTOR
  → AT_WHOLESALER → AT_PHARMACY → SOLD
```

Exception states (may be entered from most states):  
`RECALLED · EXPIRED · SUSPICIOUS · BLOCKED`

Full transitions documented in `DATABASE.md §State Machine`.

---

## 8. Agent Ownership

See `OWNERSHIP.md` for the full matrix. In brief:

- **Frontend Agent** owns `/frontend/**` exclusively.
- **Backend Agent** owns `/backend/**` exclusively.
- **Lead** owns `/docs/**`, `/shared/**`, root config.
- No agent modifies another agent's files without explicit coordination.
- Shared files (schema, types, contracts) require coordination — see `OWNERSHIP.md §Shared Files`.

---

## 9. Golden Demo

Defined in full in `DEMO.md`. The demo MUST be executable end-to-end without manual data entry because seed data pre-populates all required entities.

Critical result states:
1. First scan → **VERIFIED** (green)
2. Post-sale scan → **SUSPICIOUS** (amber) with risk reasons
3. Post-recall scan → **RECALLED** (red)

---

## 10. Contract Hierarchy

```
MASTER.md           ← highest authority
  ├── CONTRACTS.md  ← component interfaces (API + types)
  ├── API.md        ← endpoint-level detail
  ├── DATABASE.md   ← schema + state machine
  ├── ARCHITECTURE.md
  ├── OWNERSHIP.md
  ├── AGENT_RULES.md
  ├── PHASES.md
  ├── PRD.md
  └── DEMO.md
```

**Rule**: No lower-level document may silently contradict a higher-level document.

---

## 11. Development Phases

| Phase | Window | Owner | Goal |
|---|---|---|---|
| 1 — Foundation | 0:00–0:30 | Lead | Repo · schema · shell · seed structure |
| 2 — Core Backend | 0:30–2:30 | Backend | Medicines · batches · units · supply-chain APIs |
| 3 — Verification | 2:30–4:00 | Backend | QR · scan · state checks · verification API |
| 4 — Fraud + Audit | 4:00–5:00 | Backend | Fraud engine · audit hash chain · alerts |
| 5 — UI | 5:00–6:30 | Frontend | Verification · Manufacturer · Regulator screens |
| 6 — Integration | 6:30–8:00 | All | Seed · test · fix · polish · demo rehearsal |

Full phase detail in `PHASES.md`.

---

## 12. Definition of Done

The prototype is **done** when:

- [ ] Seed script runs without error and populates demo data.
- [ ] `GET /api/v1/verify/:unitId` returns VERIFIED for a clean unit.
- [ ] After `POST /api/v1/sales`, same unit returns SUSPICIOUS.
- [ ] Fraud engine returns `riskScore`, `riskLevel`, `reasons[]` on duplicate scan.
- [ ] `POST /api/v1/recalls` marks batch RECALLED.
- [ ] Verification of recalled unit returns RECALLED status.
- [ ] Audit hash chain passes verification check.
- [ ] Public Verification screen renders all three result states.
- [ ] Regulator screen shows alert and Recall Batch button.
- [ ] Golden Demo from `DEMO.md` can be executed start-to-finish without errors.

---

## 13. Critical Constraints

1. **8-hour hard limit** — cut scope, not quality of the demo flow.
2. **No real blockchain** — use PostgreSQL audit chain.
3. **No ML** — deterministic fraud rules only.
4. **Public verification requires no login**.
5. **Seed data is mandatory** — demo must not require manual setup.
6. **Agents must not modify files outside their ownership boundary.**
7. **API contracts are frozen once Phase 2 is complete** — changes require coordination.
8. **SQLite is acceptable** if PostgreSQL setup is slow — document the decision.

---

## 14. AI-Agent Rules (Summary)

See `AGENT_RULES.md` for the full ruleset. In brief:

1. Read `MASTER.md` → `ARCHITECTURE.md` → `CONTRACTS.md` → `OWNERSHIP.md` before writing any code.
2. Modify only files within your assigned ownership boundary.
3. Never change a contract silently — follow the Contract Change Rule.
4. Never re-implement code that already works.
5. Run relevant tests before reporting completion.
6. Report all changed files and any contract changes when done.
