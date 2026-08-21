# AGENT_RULES.md — PharmaTrace AI Coding Agent Rules

> Authority: derives from `MASTER.md §14`. All AI coding agents must read and follow this document before writing a single line of code.

---

## 0. Mandatory Pre-Flight Checklist

Before writing any code, every agent must confirm it has read:

- [ ] `MASTER.md` — project identity, objectives, constraints
- [ ] `ARCHITECTURE.md` — system structure and module responsibilities
- [ ] `CONTRACTS.md` — shared types, API envelopes, all request/response shapes
- [ ] `OWNERSHIP.md` — what you own, what you must not touch
- [ ] `PHASES.md` — your assigned phase, dependencies, acceptance criteria
- [ ] `API.md` — all endpoint definitions
- [ ] `DATABASE.md` — schema and state machine

**If you have not read all of the above, stop. Read them first.**

---

## 1. Ownership Rule

You modify **only** files within your assigned ownership boundary.

- **Frontend Agent**: `/frontend/**` only.
- **Backend Agent**: `/backend/**` only.
- **Lead**: `/docs/**`, `/shared/types/**`, root config.

If you need to change a file outside your boundary:

1. Stop.
2. Document what change you need and why.
3. Coordinate with the owning agent or Lead.
4. Do not make the change unilaterally.

---

## 2. Contract Rule

The contracts in `CONTRACTS.md` and `API.md` are the law.

- Implement exactly what is specified.
- Do not invent new response fields silently.
- Do not change field names, types, or shapes without updating `CONTRACTS.md` first.
- Do not add undocumented endpoints that the frontend might rely on.

---

## 3. Contract Change Rule

If you genuinely need to change a contract:

1. Stop implementing.
2. Write a short proposal: what changes, why, which agents are affected.
3. Update `CONTRACTS.md` as the single authoritative source.
4. Update all dependent implementations simultaneously.
5. Notify the affected agent.
6. Run integration tests before marking done.

**No silent breaking changes. Ever.**

---

## 4. No Re-Implementation Rule

If code that fulfills a requirement already exists and works:

- Do not re-implement it.
- Do not rewrite it in a "better" way without a concrete defect to fix.
- Import and use the existing implementation.

Duplication causes drift. Drift causes demo failures.

---

## 5. No Scope Expansion Rule

You implement only what is required for the Golden Demo Flow and the phase acceptance criteria.

Do not add:
- Features not listed in `MASTER.md §3 Prototype Scope`
- Extra UI pages not in `ARCHITECTURE.md §9`
- Extra database tables not in `DATABASE.md`
- ML or AI features
- Blockchain features
- Complex notification infrastructure
- IoT, GPS, or map services

If you think something is needed, document it as a "Future Extension" in a comment. Do not implement it.

---

## 6. State Machine Rule

Unit state transitions must be validated against the table in `DATABASE.md §3 State Machine`.

- Reject all invalid transitions with error code `INVALID_STATE_TRANSITION`.
- Never advance a unit to a state not reachable from its current state.
- Never skip states in the chain.

---

## 7. Fraud Engine Rule

The fraud engine in `/backend/src/utils/fraudEngine.ts` is the single source of fraud logic.

- All rules are deterministic. No randomness.
- All scores are additive, capped at 100.
- All reasons are human-readable English strings.
- The risk band mapping is: 0–29 LOW, 30–59 MEDIUM, 60–79 HIGH, 80–100 CRITICAL.
- No agent may implement a parallel fraud engine. Import `fraudEngine.ts`.

---

## 8. Audit Rule

Every significant action must create an `AuditEvent` via the `audit` module.

Significant actions:
- Unit created
- Unit transferred
- Unit verified (scan)
- Unit sold
- Unit recalled
- Fraud alert raised
- Batch recalled

Do not skip audit events. The hash chain must be complete for the demo verification to work.

---

## 9. Public Verification Rule

`GET /api/v1/verify/:unitId` must never require authentication.

This is non-negotiable. The demo depends on a patient scanning a QR without logging in.

---

## 10. Seed Data Rule

The seed script (`/backend/prisma/seed.ts`) must:

- Be idempotent (safe to run multiple times).
- Use `upsert` not `create` for all seed data.
- Create all entities required by `PRD.md §6 Demo Data Requirements`.
- Use the exact unit IDs and batch numbers specified in `DEMO.md`.
- Hash all passwords with bcrypt before storing.
- Never commit plaintext passwords.

---

## 11. Security Rules

- Never commit `.env` files.
- Use `.env.example` with placeholder values.
- Hash passwords (bcrypt, minimum 10 rounds).
- Validate all input on write endpoints.
- Return only the error code and message in error responses — never stack traces in production mode.
- No sensitive data in QR codes.

---

## 12. Testing Rule

After completing your phase, run the relevant tests:

**Backend Agent**: Run the integration test sequence from `MASTER.md §30` using your test runner.

**Frontend Agent**: Verify all three result states (VERIFIED, SUSPICIOUS, RECALLED) render correctly using the demo unit IDs from `DEMO.md`.

Do not mark a phase complete until acceptance criteria pass.

---

## 13. Completion Report Rule

When you complete a phase, report:

1. Files changed (list each file).
2. Files created (list each file).
3. Any contract changes made (list changes and confirm `CONTRACTS.md` updated).
4. Tests run and results.
5. Known issues or blockers.

---

## 14. Communication Rule

If you are blocked — a contract is unclear, a dependency is not ready, you found a contradiction between documents — **stop and report**. Do not guess. Do not invent an alternative implementation. Raise the issue explicitly.

---

## 15. The 8-Hour Rule

The 8-hour constraint always wins over architectural elegance.

If a feature cannot be implemented correctly within the time budget:
- Cut it.
- Document it as a Future Extension.
- Do not ship a broken or half-implemented feature.

A clean, working demo of the Golden Flow is worth more than a sophisticated but broken system.

---

## 16. Prohibited Actions

| Action | Why Prohibited |
|---|---|
| Modifying files outside ownership boundary | Causes merge conflicts, breaks other agents' work |
| Changing API shapes silently | Breaks frontend/backend integration |
| Changing DB schema without notifying Lead | Breaks running backend |
| Implementing ML or blockchain | Out of scope, wastes time |
| Committing `.env` files | Security risk |
| Committing `node_modules` | Repository bloat |
| Pushing directly to `main` | Unstable main branch |
| Duplicating existing logic | Creates drift |
| Skipping audit events | Breaks hash chain demo |
| Removing public access from verify endpoint | Breaks demo |
