# DEMO.md — PharmaTrace Golden Demo Script

> Authority: derives from `MASTER.md §9`. This is the primary success criterion for the prototype.
>
> The demo must be executable **without manual data entry**. All prerequisite data is created by `npx prisma db seed`.

---

## Prerequisites

Before starting the demo, run:

```bash
# Terminal 1 — Backend
cd backend
npx prisma db seed
npm run dev
# Expected: "PharmaTrace API running on port 3001"

# Terminal 2 — Frontend
cd frontend
npm run dev
# Expected: "Local: http://localhost:5173"
```

Open two browser windows:
- **Window A**: `http://localhost:5173/verify` (Public / Patient view)
- **Window B**: `http://localhost:5173/regulator` (Regulator view — login as `regulator@demo.local` / `Demo@1234`)

---

## Demo Unit Reference

| Unit ID | State | Purpose |
|---|---|---|
| `B2026-001-000001` | AT_PHARMACY (clean) | Step 5 — First scan → **VERIFIED** |
| `B2026-001-000002` | SOLD | Step 8 — Second scan → **SUSPICIOUS** |
| `B2026-002-000001` | RECALLED | Final scan after recall → **RECALLED** |

> **Note**: The demo will also recall batch `B2026-001` live in Step 14, making `B2026-001-000001` show RECALLED on the third scan (Step 15).

---

## Step-by-Step Demo Script

---

### Step 1 — Manufacturer Creates Medicine

> **Context**: Explain that ABC Pharma is creating a new medicine product in the system.

**Action (UI)**:
1. Login as `manufacturer@demo.local` / `Demo@1234`.
2. Navigate to Manufacturer Dashboard → Medicines.
3. Show the existing "Paracetamol 500 mg Tablet" entry (seeded).

**What to say**: *"A manufacturer registers the medicine — name, strength, form. This becomes the digital identity anchor for every batch and unit."*

**Expected**: Medicine card showing "Paracetamol 500 mg Tablet — ABC Pharma".

---

### Step 2 — Manufacturer Creates Batch

**Action (UI)**:
1. On Manufacturer Dashboard → Batches.
2. Show batch `B2026-001` (seeded): quantity 100, expiry 2027-12-31, status ACTIVE.

**What to say**: *"Every batch gets a unique batch number. The system immediately serializes 100 individual units."*

**Expected**: Batch card showing `B2026-001 · 100 units · ACTIVE`.

---

### Step 3 — System Creates Serialized Unit

**Action (UI)**:
1. Click on batch `B2026-001` to expand.
2. Show unit list — scroll to `B2026-001-000001`.
3. Click QR icon for `B2026-001-000001`.

**Expected**: QR code rendered on screen.

**What to say**: *"Each unit has a unique ID and a QR code. The QR contains only the verification URL — no sensitive data."*

**Show**: QR content = `http://localhost:5173/verify/B2026-001-000001`

---

### Step 4 — Simulate Supply-Chain Movement

**Action (UI)**:
1. Show the supply-chain timeline for unit `B2026-001-000001` (from verification result or batch detail).

**Expected**: Timeline showing:
```
✓ MANUFACTURER  — ABC Pharma      — Mumbai      — 2026-01-15
✓ DISTRIBUTOR   — MedDist Pvt Ltd — Delhi       — 2026-01-20
✓ WHOLESALER    — PharmaTrade     — Kolkata     — 2026-01-25
✓ PHARMACY      — City Pharmacy   — Bangalore   — 2026-01-30
```

**What to say**: *"The unit has moved through the complete supply chain. Every step is recorded with organization, location, and an audit hash."*

---

### Step 5 — Patient Scans QR → VERIFIED

**Action (Window A)**:
1. Switch to the Public Verification screen.
2. Enter unit ID: `B2026-001-000001`
3. Click Verify.

**API call**: `GET /api/v1/verify/B2026-001-000001`

**Expected** (green result card):
```
✓  VERIFIED

Paracetamol 500 mg Tablet
Batch: B2026-001
Manufacturer: ABC Pharma

Manufactured: 2026-01-15    Expiry: 2027-12-31

Supply Chain
✓ Manufacturer  ABC Pharma       Mumbai     2026-01-15
✓ Distributor   MedDist Pvt Ltd  Delhi      2026-01-20
✓ Wholesaler    PharmaTrade      Kolkata    2026-01-25
✓ Pharmacy      City Pharmacy    Bangalore  2026-01-30

Risk Score: 0/100  [LOW]
```

**What to say**: *"The patient scans the QR. The system checks — unit exists, batch is valid, not expired, not recalled, not previously sold. VERIFIED."*

---

### Step 6 — Pharmacy Marks Unit Sold

**Action (API call or UI)**:

Option A (UI): Login as `pharmacy@demo.local`, navigate to unit `B2026-001-000001`, click "Mark as Sold".

Option B (direct API — quicker for demo):
```bash
curl -X POST http://localhost:3001/api/v1/sales \
  -H "Authorization: Bearer <pharmacy-token>" \
  -H "Content-Type: application/json" \
  -d '{"unitId": "B2026-001-000001"}'
```

**Expected**: `{ "success": true, "data": { "status": "SOLD" } }`

**What to say**: *"The pharmacist dispenses the medicine and marks it as sold. The unit status changes to SOLD in the system."*

---

### Step 7 — Same QR Scanned Again → SUSPICIOUS

**Action (Window A)**:
1. Enter the same unit ID: `B2026-001-000001`
2. Click Verify again.

> Add a simulated different location via URL: `http://localhost:5173/verify/B2026-001-000001?lat=22.5726&lng=88.3639`  
> (This simulates scanning from Kolkata, triggering impossible travel from Bangalore.)

**API call**: `GET /api/v1/verify/B2026-001-000001?lat=22.5726&lng=88.3639`

**Expected** (amber warning card):
```
⚠  SUSPICIOUS PRODUCT

Risk Score: 87/100  [CRITICAL]

Reasons:
• Medicine unit has already been sold
• Duplicate scan detected within short interval
• Physically impossible movement between scan locations

DO NOT DISPENSE — Contact your pharmacist immediately
```

**What to say**: *"Same QR, 60 seconds later, different city. The fraud engine fires three rules: already sold (+40), duplicate scan (+25), impossible travel (+30) — total 95, CRITICAL."*

---

### Step 8 — Regulator Sees Alert

**Action (Window B — Regulator)**:
1. Switch to the Regulator Dashboard.
2. Show the Fraud Alerts panel.

**Expected**: Alert card for unit `B2026-001-000001`:
```
[CRITICAL]   B2026-001-000001

⚠ Medicine unit has already been sold
⚠ Duplicate scan detected within short interval
⚠ Physically impossible movement between scan locations

Risk Score: 95/100
Delhi → Kolkata, 12 minutes apart

[Investigate]   [Recall Batch]
```

**What to say**: *"The regulator dashboard shows the alert in real time. They can see the risk score, the reasons, and the unit's full supply-chain history."*

---

### Step 9 — Regulator Investigates (Optional Detail)

**Action (Window B)**:
1. Click [Investigate] on the alert card.
2. Expand supply-chain history and audit hash chain.

**Expected**: Supply-chain timeline + audit events with hash values.

**What to say**: *"Every action is recorded in a tamper-evident hash chain. The regulator can verify the chain hasn't been altered."*

---

### Step 10 — Regulator Recalls Batch

**Action (Window B)**:
1. Click [Recall Batch] on the alert card for `B2026-001`.
2. Confirmation modal appears: "Are you sure you want to recall batch B2026-001? This will flag all 100 units."
3. Enter recall reason: *"Quality defect detected — batch B2026-001 withdrawn immediately."*
4. Click Confirm Recall.

**API call**: `POST /api/v1/recalls` with `{ batchId: "...", reason: "..." }`

**Expected**: Success message. Regulator dashboard shows "Active Recalls: 1".

**What to say**: *"The regulator issues a batch recall. All 100 units in this batch are instantly flagged as RECALLED across the entire supply chain."*

---

### Step 11 — Patient Scans Again → RECALLED

**Action (Window A)**:
1. Enter the same unit ID: `B2026-001-000001`
2. Click Verify.

**API call**: `GET /api/v1/verify/B2026-001-000001`

**Expected** (red critical card):
```
🚨  RECALLED PRODUCT

Batch B2026-001 has been recalled.

Reason: Quality defect detected — batch B2026-001 withdrawn immediately.

Risk Score: 100/100  [CRITICAL]

DO NOT USE — Return to pharmacy immediately
```

**What to say**: *"The same QR is scanned again. The system now shows RECALLED — DO NOT USE. The recall propagated instantly to every verification point."*

---

### Step 12 — Audit Chain Verification (Bonus)

**Action (API or Regulator UI)**:
```bash
GET http://localhost:3001/api/v1/audit/B2026-001-000001/verify
```

**Expected**:
```json
{
  "success": true,
  "data": {
    "entityId": "B2026-001-000001",
    "eventCount": 8,
    "chainValid": true
  }
}
```

**What to say**: *"The audit chain is intact — every event from creation to recall is cryptographically linked. This is what we mean by tamper-evident, blockchain-ready architecture."*

---

## Demo Summary Card

| Step | Action | Expected Result |
|---|---|---|
| 1 | Show medicine | Paracetamol 500 mg listed |
| 2 | Show batch | B2026-001, 100 units |
| 3 | Show QR | QR renders for B2026-001-000001 |
| 4 | Show supply chain | 4-node timeline with timestamps |
| 5 | First scan | ✅ VERIFIED (green) |
| 6 | Mark sold | Status → SOLD |
| 7 | Second scan (diff location) | ⚠ SUSPICIOUS, risk 87+, 3 reasons |
| 8 | Regulator sees alert | Alert card with CRITICAL badge |
| 9 | Investigate | Hash chain visible |
| 10 | Recall batch | 100 units marked RECALLED |
| 11 | Third scan | 🚨 RECALLED (red) |
| 12 | Audit verify | chainValid: true |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Unit shows VERIFIED after sale | Check `POST /api/v1/sales` returned 201; refresh verify |
| Impossible travel not triggered | Pass `?lat=22.5726&lng=88.3639` in the URL |
| Recall button not working | Check regulator JWT is valid (8-hour expiry); re-login |
| No alerts visible | Check `riskScore >= 30` threshold; check `FraudAlert` table in Prisma Studio |
| Hash chain invalid | Re-run seed; check `previousHash` linkage in AuditEvent table |

---

## Demo Environment Checklist

- [ ] Backend running on port 3001.
- [ ] Frontend running on port 5173.
- [ ] `npx prisma db seed` completed without error.
- [ ] `B2026-001-000001` exists and is `AT_PHARMACY`.
- [ ] `B2026-001-000002` exists and is `SOLD` (pre-seeded for quick suspicious demo).
- [ ] Regulator account `regulator@demo.local` / `Demo@1234` logs in successfully.
- [ ] Pharmacy account `pharmacy@demo.local` / `Demo@1234` logs in successfully.
- [ ] Two browser windows open and positioned side by side.
