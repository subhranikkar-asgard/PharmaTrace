# FRONTEND_AGENT.md — Frontend Agent Briefing

> This is your complete task brief. Read everything in this file before writing a single line of code.

---

## Who You Are

You are the **Frontend Agent** for PharmaTrace.  
You own `/frontend/**` exclusively.  
You push all work to the `feature/frontend` branch on GitHub.

---

## Step 0 — Git Setup (Do This First)

```bash
# Clone the repo (if starting fresh)
git clone https://github.com/subhranikkar-asgard/PharmaTrace.git
cd PharmaTrace

# Switch to your branch
git checkout feature/frontend

# Always pull before starting a session
git pull origin feature/frontend
```

---

## Step 1 — Read These Documents (In Order)

Before writing any code, read each file:

1. `/MASTER.md` — project identity, what is OUT OF SCOPE
2. `/docs/ARCHITECTURE.md §9` — the three required screens
3. `/docs/CONTRACTS.md` — all TypeScript types and response shapes you must match exactly
4. `/docs/API.md` — every endpoint available, their request/response shapes
5. `/docs/AGENT_RULES.md` — mandatory rules
6. `/docs/DEMO.md` — the exact UI states you must produce for the demo
7. `/docs/PHASES.md §Phase 5` — your exact tasks

> The contracts in `CONTRACTS.md` are frozen. Build your UI types from them exactly.

---

## Step 2 — One-Time Project Setup

```bash
cd PharmaTrace

# Create Vite React TypeScript project
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install dependencies
npm install
npm install tailwindcss @tailwindcss/vite
npm install qrcode html5-qrcode
npm install @types/qrcode
npm install recharts
npm install lucide-react
npm install axios

# (Optional but recommended) Install shadcn/ui
npx shadcn@latest init
# Choose: TypeScript, Default style, slate base color, yes CSS variables

# Configure Tailwind
# In vite.config.ts, add tailwindcss plugin
# In src/index.css, add: @import "tailwindcss";
```

**Commit:**
```bash
git add -A
git commit -m "feat(frontend): Phase 1 — Vite + React + Tailwind scaffold"
git push origin feature/frontend
```

---

## Step 3 — Project Structure to Create

```
frontend/src/
├── main.tsx
├── App.tsx                    ← routing
├── pages/
│   ├── VerifyPage.tsx         ← PUBLIC — highest priority
│   ├── ManufacturerPage.tsx   ← MANUFACTURER role
│   └── RegulatorPage.tsx      ← REGULATOR role
├── components/
│   ├── VerifyResult/
│   │   ├── VerifiedCard.tsx   ← green result
│   │   ├── SuspiciousCard.tsx ← amber result
│   │   └── RecalledCard.tsx   ← red result
│   ├── SupplyChainTimeline.tsx
│   ├── RiskScoreBadge.tsx
│   ├── AlertCard.tsx
│   ├── BatchCard.tsx
│   ├── QRDisplay.tsx
│   └── NavBar.tsx
├── services/
│   └── api.ts                 ← ALL fetch calls go here
├── hooks/
│   ├── useAuth.ts
│   └── useVerify.ts
└── types/
    └── index.ts               ← re-export from /shared/types/index.ts
```

---

## Step 4 — API Service Layer (Build This First)

File: `frontend/src/services/api.ts`

This is the **single file** where all backend calls live. No fetch calls anywhere else.

```typescript
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

const client = axios.create({ baseURL: BASE });

// Attach JWT token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('pharmatrace_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  client.post('/auth/login', { email, password }).then(r => r.data.data);

export const getMe = () =>
  client.get('/auth/me').then(r => r.data.data);

// ── Verification (public — no token needed) ───────────────────────────
export const verifyUnit = (unitId: string, lat?: number, lng?: number) => {
  const params = lat && lng ? `?lat=${lat}&lng=${lng}` : '';
  return client.get(`/verify/${unitId}${params}`).then(r => r.data.data);
};

// ── Medicines ─────────────────────────────────────────────────────────
export const getMedicines = () =>
  client.get('/medicines').then(r => r.data.data);

export const createMedicine = (data: { name: string; strength: string; form: string }) =>
  client.post('/medicines', data).then(r => r.data.data);

// ── Batches ───────────────────────────────────────────────────────────
export const getBatches = () =>
  client.get('/batches').then(r => r.data.data);

export const getBatch = (batchId: string) =>
  client.get(`/batches/${batchId}`).then(r => r.data.data);

export const createBatch = (data: {
  medicineId: string; batchNumber: string;
  quantity: number; manufactureDate: string; expiryDate: string;
}) => client.post('/batches', data).then(r => r.data.data);

// ── Units ─────────────────────────────────────────────────────────────
export const getUnit = (unitId: string) =>
  client.get(`/units/${unitId}`).then(r => r.data.data);

export const getUnitQR = (unitId: string) =>
  client.get(`/units/${unitId}/qr`).then(r => r.data.data);

// ── Transfers ─────────────────────────────────────────────────────────
export const createTransfer = (data: {
  unitIds: string[]; toOrganizationId: string;
  location: string; lat: number; lng: number; notes?: string;
}) => client.post('/transfers', data).then(r => r.data.data);

// ── Sales ─────────────────────────────────────────────────────────────
export const sellUnit = (unitId: string, notes?: string) =>
  client.post('/sales', { unitId, notes }).then(r => r.data.data);

// ── Recalls ───────────────────────────────────────────────────────────
export const recallBatch = (batchId: string, reason: string) =>
  client.post('/recalls', { batchId, reason }).then(r => r.data.data);

export const getRecalls = () =>
  client.get('/recalls').then(r => r.data.data);

// ── Alerts ────────────────────────────────────────────────────────────
export const getAlerts = (params?: { riskLevel?: string; resolved?: boolean }) =>
  client.get('/alerts', { params }).then(r => r.data.data);

export const resolveAlert = (alertId: string) =>
  client.patch(`/alerts/${alertId}/resolve`).then(r => r.data.data);

// ── Stats ─────────────────────────────────────────────────────────────
export const getStats = () =>
  client.get('/stats').then(r => r.data.data);

// ── Organizations ─────────────────────────────────────────────────────
export const getOrganizations = () =>
  client.get('/organizations').then(r => r.data.data);
```

**Commit:**
```bash
git commit -m "feat(frontend): API service layer — all backend calls centralized"
git push origin feature/frontend
```

---

## Step 5 — How to Handle Backend Not Being Ready Yet

**Use mock data** that exactly matches `CONTRACTS.md` shapes.

Create: `frontend/src/services/mockData.ts`

```typescript
// Mock VerificationResponse for B2026-001-000001 (VERIFIED)
export const MOCK_VERIFIED = {
  unitId: 'B2026-001-000001',
  status: 'AT_PHARMACY',
  riskScore: 0,
  riskLevel: 'LOW',
  reasons: [],
  medicine: { name: 'Paracetamol', strength: '500 mg', form: 'Tablet' },
  batch: { batchNumber: 'B2026-001', expiryDate: '2027-12-31T00:00:00.000Z', manufactureDate: '2026-01-15T00:00:00.000Z' },
  manufacturer: 'ABC Pharma',
  supplyChain: [
    { stage: 'MANUFACTURER', organization: 'ABC Pharma', location: 'Mumbai', timestamp: '2026-01-15T10:00:00.000Z', auditHash: 'abc123' },
    { stage: 'DISTRIBUTOR', organization: 'MedDist Pvt Ltd', location: 'Delhi', timestamp: '2026-01-20T10:00:00.000Z', auditHash: 'def456' },
    { stage: 'WHOLESALER', organization: 'PharmaTrade', location: 'Kolkata', timestamp: '2026-01-25T10:00:00.000Z', auditHash: 'ghi789' },
    { stage: 'PHARMACY', organization: 'City Pharmacy', location: 'Bangalore', timestamp: '2026-01-30T10:00:00.000Z', auditHash: 'jkl012' },
  ],
  scanCount: 1,
  lastScannedAt: new Date().toISOString(),
  recallReason: null,
};

// Mock for SUSPICIOUS
export const MOCK_SUSPICIOUS = {
  ...MOCK_VERIFIED,
  unitId: 'B2026-001-000002',
  status: 'SOLD',
  riskScore: 87,
  riskLevel: 'CRITICAL',
  reasons: [
    'Medicine unit has already been sold',
    'Duplicate scan detected within short interval',
    'Physically impossible movement between scan locations',
  ],
};

// Mock for RECALLED
export const MOCK_RECALLED = {
  ...MOCK_VERIFIED,
  unitId: 'B2026-002-000001',
  status: 'RECALLED',
  riskScore: 100,
  riskLevel: 'CRITICAL',
  reasons: ['Batch has been recalled — do not dispense'],
  recallReason: 'Quality defect detected — batch withdrawn immediately.',
};
```

In `api.ts`, add a flag:
```typescript
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
```

Switch to real API when Backend Agent posts the milestone commit.

---

## Step 6 — Build Screen 1: Public Verification (HIGHEST PRIORITY)

File: `frontend/src/pages/VerifyPage.tsx`

This is the most important screen. Build it first. It must show all three result states.

### Layout

```
┌─────────────────────────────────────────────┐
│  🔍  VERIFY MEDICINE                         │
│                                             │
│  Enter Unit ID                              │
│  [ B2026-001-000001              ] [Verify] │
│                                             │
│  ── OR ──                                   │
│  [ Scan QR Code ] (optional)                │
└─────────────────────────────────────────────┘

Result card renders below based on API response
```

### Result Card: VERIFIED (green)

```
┌─────────────────────────────────────────────┐
│  ✅  VERIFIED                      [LOW 0]  │
│─────────────────────────────────────────────│
│  Paracetamol 500 mg Tablet                  │
│  Batch: B2026-001 · Manufacturer: ABC Pharma│
│  Manufactured: 2026-01-15  Expiry: 2027-12-31│
│─────────────────────────────────────────────│
│  Supply Chain                               │
│  ✓ MANUFACTURER  ABC Pharma    Mumbai       │
│  ✓ DISTRIBUTOR   MedDist       Delhi        │
│  ✓ WHOLESALER    PharmaTrade   Kolkata      │
│  ✓ PHARMACY      City Pharmacy  Bangalore   │
└─────────────────────────────────────────────┘
```

Tailwind classes: `border-green-200 bg-green-50`, icon color `text-green-600`

### Result Card: SUSPICIOUS (amber)

```
┌─────────────────────────────────────────────┐
│  ⚠️  SUSPICIOUS PRODUCT       [CRITICAL 87] │
│─────────────────────────────────────────────│
│  Reasons:                                   │
│  • Medicine unit has already been sold      │
│  • Duplicate scan within short interval     │
│  • Physically impossible movement           │
│─────────────────────────────────────────────│
│  ⛔ DO NOT DISPENSE                         │
│  Contact your pharmacist immediately        │
└─────────────────────────────────────────────┘
```

Tailwind classes: `border-amber-200 bg-amber-50`, icon color `text-amber-600`

### Result Card: RECALLED (red)

```
┌─────────────────────────────────────────────┐
│  🚨  RECALLED PRODUCT       [CRITICAL 100]  │
│─────────────────────────────────────────────│
│  Batch B2026-001 has been recalled.         │
│  Reason: Quality defect detected...         │
│─────────────────────────────────────────────│
│  ⛔ DO NOT USE                              │
│  Return to pharmacy immediately             │
└─────────────────────────────────────────────┘
```

Tailwind classes: `border-red-200 bg-red-50`, icon color `text-red-600`

### Routing Logic

```typescript
// Determine which card to show based on VerificationResponse:
function getResultType(data: VerificationResponse): 'verified' | 'suspicious' | 'recalled' {
  if (data.status === 'RECALLED') return 'recalled';
  if (data.riskScore >= 30) return 'suspicious';
  return 'verified';
}
```

**Commit:**
```bash
git commit -m "feat(frontend): VerifyPage — all three result states (VERIFIED, SUSPICIOUS, RECALLED)"
git push origin feature/frontend
```

---

## Step 7 — Supply Chain Timeline Component

File: `frontend/src/components/SupplyChainTimeline.tsx`

Visual vertical timeline showing each step with:
- Stage name (MANUFACTURER → DISTRIBUTOR → WHOLESALER → PHARMACY)
- Organization name
- Location
- Timestamp (formatted)
- Green checkmark for each completed step

```typescript
// Props
interface Props {
  steps: SupplyChainStep[];
}
```

**Commit:**
```bash
git commit -m "feat(frontend): SupplyChainTimeline component"
git push origin feature/frontend
```

---

## Step 8 — Risk Score Badge Component

File: `frontend/src/components/RiskScoreBadge.tsx`

Show score number + risk level label, color-coded:

| RiskLevel | Colors |
|---|---|
| LOW | `bg-green-100 text-green-800` |
| MEDIUM | `bg-yellow-100 text-yellow-800` |
| HIGH | `bg-orange-100 text-orange-800` |
| CRITICAL | `bg-red-100 text-red-800` |

**Commit:**
```bash
git commit -m "feat(frontend): RiskScoreBadge component"
git push origin feature/frontend
```

---

## Step 9 — Build Screen 2: Manufacturer Dashboard

File: `frontend/src/pages/ManufacturerPage.tsx`

Requires login (`MANUFACTURER` role).

Sections:
1. **Batch List** — table/cards showing batchNumber, medicine, quantity, expiryDate, status badge
2. **Create Batch Form** — fields: medicine dropdown, batch number, quantity, manufacture date, expiry date
3. **Batch Detail** (expandable/modal) — unit list + QR display for selected unit

### QR Display Component

File: `frontend/src/components/QRDisplay.tsx`

```typescript
import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';

interface Props { value: string; size?: number; }

export function QRDisplay({ value, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) QRCode.toCanvas(canvasRef.current, value, { width: size });
  }, [value, size]);
  return <canvas ref={canvasRef} />;
}
```

### Transfer Section

- Checkbox-select units → select destination org dropdown → Transfer button

**Commit:**
```bash
git commit -m "feat(frontend): ManufacturerPage — batch list, create batch, QR display, transfer"
git push origin feature/frontend
```

---

## Step 10 — Build Screen 3: Regulator Dashboard (SECOND PRIORITY)

File: `frontend/src/pages/RegulatorPage.tsx`

Requires login (`REGULATOR` role).

### Summary Cards Row

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Total Units  │  │ Verifications│  │  Suspicious  │  │ Active Recalls│
│    1,000     │  │     248      │  │      12      │  │      1       │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

Use `getStats()` API call.

### Alert Cards

Map over `getAlerts()` results. Each card:

```
┌─────────────────────────────────────────────────────┐
│ [CRITICAL]  B2026-001-000001         Score: 94/100  │
│─────────────────────────────────────────────────────│
│ • Medicine unit has already been sold               │
│ • Duplicate scan detected                           │
│ • Physically impossible movement                    │
│                                                     │
│ Raised: 2026-08-21 08:30 AM                        │
│─────────────────────────────────────────────────────│
│ [Investigate ▼]           [🚨 Recall Batch]         │
└─────────────────────────────────────────────────────┘
```

- **[Investigate]**: toggle expanded view showing supply chain timeline
- **[Recall Batch]**: open confirmation modal

### Recall Modal

```
┌─────────────────────────────────┐
│ Recall Batch B2026-001          │
│─────────────────────────────────│
│ This will mark all 100 units as │
│ RECALLED immediately.           │
│                                 │
│ Reason:                         │
│ [ text area                   ] │
│                                 │
│ [Cancel]        [Confirm Recall]│
└─────────────────────────────────┘
```

On confirm: call `recallBatch(batchId, reason)`, then refresh alerts + stats.

**Commit:**
```bash
git commit -m "feat(frontend): RegulatorPage — stats, alert cards, recall modal"
git push origin feature/frontend
```

---

## Step 11 — Navigation + Auth

File: `frontend/src/App.tsx`

```typescript
// Routes
<Route path="/" element={<Navigate to="/verify" />} />
<Route path="/verify" element={<VerifyPage />} />
<Route path="/verify/:unitId" element={<VerifyPage />} />
<Route path="/manufacturer" element={<ProtectedRoute role="MANUFACTURER"><ManufacturerPage /></ProtectedRoute>} />
<Route path="/regulator" element={<ProtectedRoute role="REGULATOR"><RegulatorPage /></ProtectedRoute>} />
<Route path="/login" element={<LoginPage />} />
```

File: `frontend/src/hooks/useAuth.ts`
- Store token + user in `localStorage`
- Expose `login()`, `logout()`, `user`, `isAuthenticated`

**Commit:**
```bash
git commit -m "feat(frontend): routing, auth hook, ProtectedRoute, NavBar, LoginPage"
git push origin feature/frontend
```

---

## Step 12 — Wire to Real API (After Backend Phase 4 Milestone)

Watch `feature/backend` on GitHub for the commit:
```
milestone: Phase 4 complete — ALL backend APIs ready
```

When you see it:
```bash
# Pull latest backend branch to verify endpoints
git fetch origin feature/backend
# Then in api.ts, set USE_MOCK = false (or remove mock flag entirely)
```

Test against real endpoints:
- `B2026-001-000001` → VERIFIED
- `B2026-001-000002` → SUSPICIOUS
- Recall via UI → `B2026-001-000001` → RECALLED

**Commit:**
```bash
git commit -m "feat(frontend): wire to real backend API — remove mocks"
git push origin feature/frontend
```

---

## Step 13 — Visual Polish

1. Loading spinners (`animate-spin`) while API calls are in flight.
2. Error states for failed API calls (red toast / inline message).
3. Responsive layout — works on laptop screen for the demo.
4. Font: Inter — add to `index.html`:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
   ```
5. Add to Tailwind config: `fontFamily: { sans: ['Inter', 'sans-serif'] }`

**Commit:**
```bash
git commit -m "feat(frontend): loading states, error handling, Inter font, responsive polish"
git push origin feature/frontend
```

---

## Visual Design Rules

| Token | Tailwind Class |
|---|---|
| Background | `bg-slate-50` |
| Card | `bg-white rounded-xl shadow-sm border border-slate-200` |
| Primary | `text-blue-600 bg-blue-600` |
| Success | `text-green-600 bg-green-50 border-green-200` |
| Warning | `text-amber-600 bg-amber-50 border-amber-200` |
| Danger | `text-red-600 bg-red-50 border-red-200` |
| Body text | `text-slate-900` |
| Muted text | `text-slate-500` |

**Do NOT use**: neon colors, glassmorphism, excessive gradients, heavy animations.

---

## Synchronization with Backend Agent

| Watch for | On `feature/backend` | Your Action |
|---|---|---|
| Commit: `milestone: Phase 2 complete` | Auth, medicines, batches, units, transfers are live | Wire those screens to real API |
| Commit: `milestone: Phase 4 complete` | ALL endpoints live | Wire everything, remove mocks |
| No milestone yet | Build UI with mock data | Don't block — keep building |

To check backend progress:
```bash
git fetch origin feature/backend
git log origin/feature/backend --oneline -10
```

---

## Files You Must Never Touch

- `/backend/**` — belongs to Backend Agent
- `/docs/**` — belongs to Lead
- `/shared/types/index.ts` — coordinate with Lead before changing
- `/MASTER.md` — read-only for you

---

## Add to frontend/.env

```
VITE_API_URL=http://localhost:3001/api/v1
VITE_USE_MOCK=true
```

Change `VITE_USE_MOCK=false` when Backend Agent signals Phase 4 complete.
