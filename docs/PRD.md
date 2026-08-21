# PRD.md — PharmaTrace Product Requirements

> Authority: derives from `MASTER.md`. See `MASTER.md §Contract Hierarchy`.

---

## 1. Problem Statement

Counterfeit and diverted medicines cause patient harm and undermine public trust in pharmaceutical supply chains. There is no accessible, unit-level verification mechanism for patients, pharmacies, or regulators to confirm that a dispensed medicine is authentic, unexpired, and unrecalled.

**PharmaTrace** is a hackathon prototype demonstrating how unit-level digital identity, QR verification, supply-chain traceability, and explainable fraud detection could address this problem.

---

## 2. Users and Roles

| Role | Description | Auth Required |
|---|---|---|
| **PUBLIC** | Patient / consumer scanning a QR code | No |
| **MANUFACTURER** | Creates medicines, batches, units; initiates supply chain | Yes (JWT) |
| **DISTRIBUTOR** | Receives and forwards units | Yes (JWT) |
| **WHOLESALER** | Receives and forwards units | Yes (JWT) |
| **PHARMACY** | Receives units, dispenses to patients, marks sold | Yes (JWT) |
| **REGULATOR** | Views all alerts; issues recalls | Yes (JWT) |
| **ADMIN** | Optional — do not spend time on this | Out of scope |

Demo accounts are seeded — no self-registration UI needed.

---

## 3. Functional Requirements

### 3.1 Medicine & Batch Management

| ID | Requirement | Priority |
|---|---|---|
| F-01 | Manufacturer can create a medicine with name, strength, form, manufacturer name | Must |
| F-02 | Manufacturer can create a batch with batch number, manufacture date, expiry date, quantity | Must |
| F-03 | System auto-generates serialized unit IDs in format `{batchNumber}-{6-digit-seq}` | Must |
| F-04 | QR code encodes verification URL or unit ID | Must |
| F-05 | Manufacturer can download/display QR for a unit | Must |

### 3.2 Supply-Chain Transfer

| ID | Requirement | Priority |
|---|---|---|
| F-10 | Authorized role can transfer a unit (or batch of units) to the next supply-chain node | Must |
| F-11 | Each transfer records: sender org, receiver org, timestamp, simulated location | Must |
| F-12 | Unit state advances on valid transfer | Must |
| F-13 | Invalid state transitions are rejected with error | Must |

### 3.3 Verification

| ID | Requirement | Priority |
|---|---|---|
| F-20 | Public endpoint verifies unit by ID — no login required | Must |
| F-21 | Verification checks: exists, batch exists, expiry, recall, sale, scan history | Must |
| F-22 | Verification returns `status`, `riskScore`, `riskLevel`, `reasons[]`, supply-chain timeline | Must |
| F-23 | Scan event is recorded on every verification call | Must |

### 3.4 Sales

| ID | Requirement | Priority |
|---|---|---|
| F-30 | Pharmacy can mark a unit as SOLD | Must |
| F-31 | After SOLD, verification of same unit raises SUSPICIOUS flag | Must |
| F-32 | Re-sale of an already-SOLD unit is blocked | Must |

### 3.5 Fraud Detection

| ID | Requirement | Priority |
|---|---|---|
| F-40 | Fraud engine runs deterministic rules on every scan event | Must |
| F-41 | Rules: already sold, duplicate scan, impossible travel, excessive scans, expired, recalled, invalid | Must |
| F-42 | Output includes `riskScore` (0–100), `riskLevel` (LOW/MEDIUM/HIGH/CRITICAL), `reasons[]` | Must |
| F-43 | FraudAlert record created when `riskScore ≥ 30` | Must |
| F-44 | Human-readable reasons must be returned in English | Must |

### 3.6 Recall Management

| ID | Requirement | Priority |
|---|---|---|
| F-50 | Regulator can recall a batch by batch ID | Must |
| F-51 | All units in batch are marked RECALLED immediately | Must |
| F-52 | Future verification of any recalled unit returns RECALLED status | Must |
| F-53 | Recall reason is recorded | Must |

### 3.7 Audit Log

| ID | Requirement | Priority |
|---|---|---|
| F-60 | Every significant action creates an AuditEvent | Must |
| F-61 | Each AuditEvent stores: type, entityId, data, previousHash, currentHash, timestamp, actorId | Must |
| F-62 | Current hash = SHA-256(canonicalData + previousHash + timestamp) | Must |
| F-63 | Audit verification endpoint confirms hash chain integrity | Should |

---

## 4. Non-Functional Requirements (Prototype-Scoped)

| ID | Requirement |
|---|---|
| NF-01 | Public verification endpoint responds in < 500ms on localhost |
| NF-02 | No sensitive data encoded in QR code |
| NF-03 | Passwords hashed (bcrypt) if stored |
| NF-04 | Secrets in `.env`, never committed |
| NF-05 | Basic CORS configured |
| NF-06 | Input validation on all write endpoints |

---

## 5. Out-of-Scope Features

The following are explicitly excluded from this prototype:

- Real blockchain integration of any kind
- ML / AI fraud detection
- Real geolocation or map services
- Native mobile apps
- Real email / SMS notifications
- IoT / hardware integration
- Microservices or container orchestration
- Complex org admin / user management UI
- Advanced analytics

---

## 6. Demo Data Requirements

Seed data must include:

| Entity | Value |
|---|---|
| Organization | ABC Pharma (MANUFACTURER) |
| Organization | MedDist Pvt Ltd (DISTRIBUTOR) |
| Organization | PharmaTrade (WHOLESALER) |
| Organization | City Pharmacy (PHARMACY) |
| Organization | CDSCO (REGULATOR) |
| Medicine | Paracetamol 500 mg Tablet |
| Batch | B2026-001 (expires 2027-12-31) |
| Unit (clean) | B2026-001-000001 — fully through chain, at pharmacy, not sold |
| Unit (sold) | B2026-001-000002 — sold, ready to trigger SUSPICIOUS |
| Unit (recalled) | B2026-001-000003 — in recalled batch B2026-002 |
| Users | manufacturer@demo.local · distributor@demo.local · wholesaler@demo.local · pharmacy@demo.local · regulator@demo.local |

All demo passwords: `Demo@1234` (hashed in seed; never commit plaintext).

---

## 7. Acceptance Criteria (Product Level)

The prototype is accepted when the Golden Demo from `DEMO.md` executes without error from step 1 through step 16 in front of an audience, with all three verification result states visible on screen.
