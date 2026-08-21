# DATABASE.md — PharmaTrace Data Model

> Authority: derives from `MASTER.md`. Schema is owned by **Backend Agent**. Changes to this document must be coordinated with Lead.

---

## 0. Database Choice Note

**Preferred**: PostgreSQL (Prisma datasource `provider = "postgresql"`).  
**Fallback**: If PostgreSQL setup threatens the 8-hour deadline, switch to SQLite (`provider = "sqlite"`, `url = "file:./dev.db"`). Document the switch with a comment in `schema.prisma` and update `DATABASE_URL` in `.env.example`.

---

## 1. Entity Overview

| Entity | Purpose |
|---|---|
| `Organization` | Manufacturer, Distributor, Wholesaler, Pharmacy, Regulator orgs |
| `User` | Authenticated users with roles |
| `Medicine` | A medicine product definition |
| `Batch` | A production batch of a medicine |
| `MedicineUnit` | A single serialized medicine unit |
| `SupplyChainEvent` | Each movement/transfer step in the supply chain |
| `ScanEvent` | Every verification scan of a unit |
| `Sale` | Record of a unit being dispensed/sold |
| `Recall` | A batch recall event |
| `FraudAlert` | A raised fraud alert for a unit |
| `AuditEvent` | Tamper-evident hash-chain audit record |

---

## 2. Entity Definitions

### 2.1 Organization

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  type      OrgType
  city      String?
  lat       Float?
  lng       Float?
  createdAt DateTime @default(now())

  users         User[]
  batches       Batch[]
  unitsSent     SupplyChainEvent[] @relation("SenderOrg")
  unitsReceived SupplyChainEvent[] @relation("ReceiverOrg")
  sales         Sale[]

  @@index([type])
}

enum OrgType {
  MANUFACTURER
  DISTRIBUTOR
  WHOLESALER
  PHARMACY
  REGULATOR
}
```

---

### 2.2 User

```prisma
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String
  role           Role
  organizationId String
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id])
  auditEvents    AuditEvent[]

  @@index([email])
  @@index([organizationId])
}

enum Role {
  MANUFACTURER
  DISTRIBUTOR
  WHOLESALER
  PHARMACY
  REGULATOR
}
```

---

### 2.3 Medicine

```prisma
model Medicine {
  id             String   @id @default(cuid())
  name           String
  strength       String   // e.g. "500 mg"
  form           String   // e.g. "Tablet"
  manufacturerId String
  createdAt      DateTime @default(now())

  manufacturer   Organization @relation(fields: [manufacturerId], references: [id])
  batches        Batch[]

  @@index([manufacturerId])
}
```

---

### 2.4 Batch

```prisma
model Batch {
  id              String      @id @default(cuid())
  batchNumber     String      @unique
  medicineId      String
  organizationId  String      // owning manufacturer org
  quantity        Int
  manufactureDate DateTime
  expiryDate      DateTime
  status          BatchStatus @default(ACTIVE)
  createdAt       DateTime    @default(now())

  medicine        Medicine     @relation(fields: [medicineId], references: [id])
  organization    Organization @relation(fields: [organizationId], references: [id])
  units           MedicineUnit[]
  recalls         Recall[]

  @@index([batchNumber])
  @@index([medicineId])
  @@index([status])
}

enum BatchStatus {
  ACTIVE
  RECALLED
}
```

---

### 2.5 MedicineUnit

```prisma
model MedicineUnit {
  id        String     @id @default(cuid())
  unitId    String     @unique  // e.g. "B2026-001-000001"
  batchId   String
  status    UnitStatus @default(REGISTERED)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  batch          Batch              @relation(fields: [batchId], references: [id])
  supplyChain    SupplyChainEvent[]
  scans          ScanEvent[]
  sale           Sale?
  fraudAlerts    FraudAlert[]

  @@index([unitId])
  @@index([batchId])
  @@index([status])
}

enum UnitStatus {
  REGISTERED
  MANUFACTURED
  IN_DISTRIBUTION
  AT_DISTRIBUTOR
  AT_WHOLESALER
  AT_PHARMACY
  SOLD
  RECALLED
  EXPIRED
  SUSPICIOUS
  BLOCKED
}
```

---

### 2.6 SupplyChainEvent

```prisma
model SupplyChainEvent {
  id               String   @id @default(cuid())
  unitId           String
  senderOrgId      String?
  receiverOrgId    String
  eventType        String   // e.g. "MANUFACTURED", "TRANSFERRED", "RECEIVED"
  location         String?
  lat              Float?
  lng              Float?
  notes            String?
  auditHash        String?
  timestamp        DateTime @default(now())

  unit             MedicineUnit @relation(fields: [unitId], references: [id])
  senderOrg        Organization? @relation("SenderOrg", fields: [senderOrgId], references: [id])
  receiverOrg      Organization  @relation("ReceiverOrg", fields: [receiverOrgId], references: [id])

  @@index([unitId])
  @@index([timestamp])
}
```

---

### 2.7 ScanEvent

```prisma
model ScanEvent {
  id        String   @id @default(cuid())
  unitId    String
  scannedAt DateTime @default(now())
  lat       Float?
  lng       Float?
  location  String?
  ipAddress String?
  userAgent String?

  unit      MedicineUnit @relation(fields: [unitId], references: [id])

  @@index([unitId])
  @@index([scannedAt])
}
```

---

### 2.8 Sale

```prisma
model Sale {
  id             String   @id @default(cuid())
  unitId         String   @unique   // one sale per unit
  pharmacyOrgId  String
  soldAt         DateTime @default(now())
  notes          String?

  unit           MedicineUnit @relation(fields: [unitId], references: [id])
  pharmacy       Organization @relation(fields: [pharmacyOrgId], references: [id])

  @@index([unitId])
}
```

---

### 2.9 Recall

```prisma
model Recall {
  id          String   @id @default(cuid())
  batchId     String
  reason      String
  initiatedBy String?
  recalledAt  DateTime @default(now())

  batch       Batch @relation(fields: [batchId], references: [id])

  @@index([batchId])
}
```

---

### 2.10 FraudAlert

```prisma
model FraudAlert {
  id           String    @id @default(cuid())
  unitId       String
  riskScore    Int
  riskLevel    RiskLevel
  reasons      Json      // string[]
  location     String?
  lat          Float?
  lng          Float?
  resolvedAt   DateTime?
  createdAt    DateTime  @default(now())

  unit         MedicineUnit @relation(fields: [unitId], references: [id])

  @@index([unitId])
  @@index([riskLevel])
  @@index([createdAt])
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

---

### 2.11 AuditEvent

```prisma
model AuditEvent {
  id           String    @id @default(cuid())
  eventType    EventType
  entityId     String    // the ID of the entity this event is about
  eventData    Json
  previousHash String    // empty string for the first event
  currentHash  String
  timestamp    DateTime  @default(now())
  actorId      String?

  actor        User? @relation(fields: [actorId], references: [id])

  @@index([entityId])
  @@index([timestamp])
}

enum EventType {
  UNIT_CREATED
  UNIT_TRANSFERRED
  UNIT_VERIFIED
  UNIT_SOLD
  UNIT_RECALLED
  FRAUD_ALERT_RAISED
  BATCH_RECALLED
}
```

---

## 3. State Machine

### 3.1 Valid Transitions

| From | To | Triggering Action | Permitted Role |
|---|---|---|---|
| `REGISTERED` | `MANUFACTURED` | Manufacturer initiates unit | MANUFACTURER |
| `MANUFACTURED` | `IN_DISTRIBUTION` | Manufacturer ships | MANUFACTURER |
| `IN_DISTRIBUTION` | `AT_DISTRIBUTOR` | Distributor receives | DISTRIBUTOR |
| `AT_DISTRIBUTOR` | `AT_WHOLESALER` | Distributor ships to wholesaler | DISTRIBUTOR |
| `AT_WHOLESALER` | `AT_PHARMACY` | Wholesaler ships to pharmacy | WHOLESALER |
| `AT_PHARMACY` | `SOLD` | Pharmacy marks sold | PHARMACY |
| `AT_PHARMACY` | `RECALLED` | Regulator recalls batch | REGULATOR |
| `SOLD` | `RECALLED` | Regulator recalls batch | REGULATOR |
| `ANY` | `RECALLED` | Regulator recalls batch | REGULATOR |
| `AT_PHARMACY` | `SUSPICIOUS` | System (fraud engine) flags | SYSTEM |

### 3.2 Invalid Transitions (Reject with `INVALID_STATE_TRANSITION`)

- Any backward movement (e.g., `AT_PHARMACY` → `AT_DISTRIBUTOR`)
- `SOLD` → `SOLD` (re-sale attempt)
- `RECALLED` → any forward state
- `EXPIRED` → any forward state
- Skipping states (e.g., `MANUFACTURED` → `AT_PHARMACY`)

### 3.3 State Transition Validation (pseudocode)

```typescript
const VALID_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  REGISTERED:      ['MANUFACTURED'],
  MANUFACTURED:    ['IN_DISTRIBUTION'],
  IN_DISTRIBUTION: ['AT_DISTRIBUTOR'],
  AT_DISTRIBUTOR:  ['AT_WHOLESALER'],
  AT_WHOLESALER:   ['AT_PHARMACY'],
  AT_PHARMACY:     ['SOLD', 'RECALLED', 'SUSPICIOUS'],
  SOLD:            ['RECALLED'],
  // exception states have no forward transitions except RECALLED
  SUSPICIOUS:      ['RECALLED'],
  RECALLED:        [],
  EXPIRED:         [],
  BLOCKED:         [],
};
```

---

## 4. Serialization Format

Unit ID format: `{batchNumber}-{6-digit-zero-padded-sequence}`

Example:
```
Batch: B2026-001
Units: B2026-001-000001, B2026-001-000002, ..., B2026-001-000100
```

Generation: when a batch with `quantity = N` is created, the system generates N `MedicineUnit` records in a single transaction.

---

## 5. Indexes Summary

| Table | Indexed Columns |
|---|---|
| Organization | type |
| User | email, organizationId |
| Medicine | manufacturerId |
| Batch | batchNumber (unique), medicineId, status |
| MedicineUnit | unitId (unique), batchId, status |
| SupplyChainEvent | unitId, timestamp |
| ScanEvent | unitId, scannedAt |
| Sale | unitId (unique) |
| Recall | batchId |
| FraudAlert | unitId, riskLevel, createdAt |
| AuditEvent | entityId, timestamp |

---

## 6. Seed Data

See `PRD.md §6 Demo Data Requirements`. The seed script at `/backend/prisma/seed.ts` must create all required organizations, users, medicine, batch, and units deterministically. It must be idempotent (safe to run multiple times using `upsert`).
