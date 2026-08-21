# OWNERSHIP.md — PharmaTrace File Ownership and Modification Boundaries

> Authority: derives from `MASTER.md`. Enforced for all AI coding agents and human developers.

---

## 1. Ownership Matrix

| Path | Owner | May Modify | Must NOT Modify |
|---|---|---|---|
| `/MASTER.md` | **Lead** | Lead only | Backend Agent, Frontend Agent |
| `/docs/**` | **Lead** | Lead only | Backend Agent, Frontend Agent |
| `/shared/types/index.ts` | **Lead** | Lead only (with coordination) | Backend Agent, Frontend Agent without coordination |
| `/frontend/**` | **Frontend Agent** | All frontend files | Any backend file, shared types, docs |
| `/backend/src/**` | **Backend Agent** | All backend source files | Any frontend file, docs |
| `/backend/prisma/schema.prisma` | **Backend Agent** | Backend Agent (notify Lead on changes) | Frontend Agent |
| `/backend/prisma/seed.ts` | **Backend Agent** | Backend Agent | Frontend Agent |
| `/backend/package.json` | **Backend Agent** | Backend Agent | Frontend Agent |
| `/frontend/package.json` | **Frontend Agent** | Frontend Agent | Backend Agent |
| `/.env.example` | **Lead** | Lead (coordinate) | Any agent without coordination |
| `/docker-compose.yml` | **Lead** | Lead only | Any agent |
| `/.github/**` | **Lead** | Lead only | Any agent |

---

## 2. Shared Files (High-Conflict)

These files are touched by multiple agents and must be coordinated carefully.

| File | Owner | Change Protocol |
|---|---|---|
| `/shared/types/index.ts` | Lead | Agent proposes change in PR comment → Lead approves and merges |
| `/backend/prisma/schema.prisma` | Backend Agent | Notify Lead before running migrations; do not rename existing fields |
| `/.env.example` | Lead | Backend Agent may add variables with a PR note |
| `docker-compose.yml` | Lead | Agents request changes; Lead applies |

---

## 3. What Each Agent Owns

### Lead / Architecture Owner

**Owns:**
- `/MASTER.md`
- `/docs/**` (all documentation)
- `/shared/types/index.ts`
- `/.env.example`
- `docker-compose.yml`
- `.github/**`
- Root `package.json` (if workspace monorepo)

**Responsibilities:**
- Maintain documentation consistency
- Resolve contract conflicts
- Publish shared types
- Manage Git branch strategy

---

### Backend Agent

**Owns:**
- `/backend/src/**`
- `/backend/prisma/schema.prisma`
- `/backend/prisma/seed.ts`
- `/backend/package.json`
- `/backend/tsconfig.json`
- `/backend/.env` (local only, never committed)

**May read:**
- `/shared/types/index.ts`
- `/docs/**` (read-only)
- `/frontend/**` (read-only for integration understanding)

**Must NOT:**
- Modify any file under `/frontend/`
- Modify `/shared/types/index.ts` without coordination
- Change documented API response shapes without updating `CONTRACTS.md`
- Drop or rename database columns used by other phases without coordination

**Produces (contracts):**
- All REST API endpoints defined in `API.md`
- Database schema in `schema.prisma`

**Consumes (contracts):**
- Types from `/shared/types/index.ts`
- Endpoint expectations from `CONTRACTS.md`

---

### Frontend Agent

**Owns:**
- `/frontend/src/**`
- `/frontend/public/**`
- `/frontend/index.html`
- `/frontend/package.json`
- `/frontend/vite.config.ts`
- `/frontend/tailwind.config.ts`
- `/frontend/tsconfig.json`

**May read:**
- `/shared/types/index.ts`
- `/docs/API.md`
- `/docs/CONTRACTS.md`
- `/docs/DEMO.md` (for UI flow)

**Must NOT:**
- Modify any file under `/backend/`
- Modify `/shared/types/index.ts` without coordination
- Call undocumented backend endpoints
- Invent response shapes different from `CONTRACTS.md`

**Produces (contracts):**
- UI screens matching `docs/ARCHITECTURE.md §9` and `DEMO.md`

**Consumes (contracts):**
- All REST API endpoints from `API.md`
- Types from `/shared/types/index.ts`

---

## 4. Dependency Graph

```
Lead (docs, types, config)
    │
    ├──► Backend Agent
    │         │  produces API + schema
    │         ▼
    └──► Frontend Agent
               consumes API + types
```

Backend Agent **must** have the schema and core endpoints working before Frontend Agent makes API calls. Frontend can use mock data during Phase 2–4.

---

## 5. Branch Ownership

| Branch | Owner | Purpose |
|---|---|---|
| `main` | Lead | Stable, demo-ready code only |
| `feature/backend` | Backend Agent | All backend work |
| `feature/frontend` | Frontend Agent | All frontend work |
| `feature/database` | Backend Agent | Schema / migration work (may merge into feature/backend) |
| `feature/integration` | All | Final integration, seed, demo polish |

Rules:
- Never push directly to `main`.
- Backend Agent merges `feature/backend` → `main` when phase acceptance criteria are met.
- Frontend Agent merges `feature/frontend` → `main` similarly.
- Lead performs final merge of `feature/integration` → `main`.

---

## 6. Conflict Resolution

If two agents need to change the same file:

1. Stop. Do not both edit.
2. One agent proposes the change in a PR/comment.
3. Lead or the owning agent reviews and applies.
4. The non-owning agent pulls the updated file.
5. Continue.

Time lost to a merge conflict costs more than time lost to coordination.

---

## 7. No Duplication Rule

If logic already exists in the codebase (e.g., the fraud engine, the hash chain utility), **do not re-implement it**. Import and use it. Duplication creates drift and debug complexity.
