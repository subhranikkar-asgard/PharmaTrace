# CONTRACTS.md — PharmaTrace Component Interface Contracts

> Authority: derives from `MASTER.md §Contract Hierarchy`. `CONTRACTS.md` controls all component interfaces. If `API.md` or `DATABASE.md` contradicts this file, this file wins for interface definitions.
>
> **Frozen after Phase 2.** Changes require the Contract Change Rule (see `AGENT_RULES.md §Contract Change Rule`).

---

## 1. Shared TypeScript Types

File: `/shared/types/index.ts`  
Owner: **Lead** (coordinate before modifying)

### 1.1 Role Enum

```typescript
export enum Role {
  PUBLIC        = 'PUBLIC',
  MANUFACTURER  = 'MANUFACTURER',
  DISTRIBUTOR   = 'DISTRIBUTOR',
  WHOLESALER    = 'WHOLESALER',
  PHARMACY      = 'PHARMACY',
  REGULATOR     = 'REGULATOR',
}
```

### 1.2 Unit Status Enum

```typescript
export enum UnitStatus {
  REGISTERED      = 'REGISTERED',
  MANUFACTURED    = 'MANUFACTURED',
  IN_DISTRIBUTION = 'IN_DISTRIBUTION',
  AT_DISTRIBUTOR  = 'AT_DISTRIBUTOR',
  AT_WHOLESALER   = 'AT_WHOLESALER',
  AT_PHARMACY     = 'AT_PHARMACY',
  SOLD            = 'SOLD',
  RECALLED        = 'RECALLED',
  EXPIRED         = 'EXPIRED',
  SUSPICIOUS      = 'SUSPICIOUS',
  BLOCKED         = 'BLOCKED',
}
```

### 1.3 Risk Level Enum

```typescript
export enum RiskLevel {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}
```

### 1.4 Event Type Enum

```typescript
export enum EventType {
  UNIT_CREATED       = 'UNIT_CREATED',
  UNIT_TRANSFERRED   = 'UNIT_TRANSFERRED',
  UNIT_VERIFIED      = 'UNIT_VERIFIED',
  UNIT_SOLD          = 'UNIT_SOLD',
  UNIT_RECALLED      = 'UNIT_RECALLED',
  FRAUD_ALERT_RAISED = 'FRAUD_ALERT_RAISED',
  BATCH_RECALLED     = 'BATCH_RECALLED',
}
```

---

## 2. Standard API Envelope

### 2.1 Success Response

```typescript
interface ApiSuccess<T> {
  success: true;
  data: T;
}
```

### 2.2 Error Response

```typescript
interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}
```

### 2.3 Error Codes

```typescript
type ErrorCode =
  | 'UNIT_NOT_FOUND'
  | 'UNIT_ALREADY_SOLD'
  | 'UNIT_RECALLED'
  | 'UNIT_EXPIRED'
  | 'BATCH_NOT_FOUND'
  | 'BATCH_ALREADY_RECALLED'
  | 'INVALID_STATE_TRANSITION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';
```

---

## 3. Verification Contract

### Request

```
GET /api/v1/verify/:unitId
Authorization: none required
```

Optional query params for simulated location:
```
?lat=28.6139&lng=77.2090
```

### Response

```typescript
interface VerificationResponse {
  unitId:        string;
  status:        UnitStatus;
  riskScore:     number;         // 0–100
  riskLevel:     RiskLevel;
  reasons:       string[];       // human-readable
  medicine: {
    name:        string;
    strength:    string;
    form:        string;
  };
  batch: {
    batchNumber: string;
    expiryDate:  string;         // ISO 8601
    manufactureDate: string;
  };
  manufacturer:  string;        // org name
  supplyChain:   SupplyChainStep[];
  scanCount:     number;
  lastScannedAt: string | null; // ISO 8601
  recallReason:  string | null;
}

interface SupplyChainStep {
  stage:        string;         // e.g. "MANUFACTURER"
  organization: string;
  location:     string;
  timestamp:    string;         // ISO 8601
  auditHash:    string;
}
```

---

## 4. Batch Contract

### Create Batch Request

```typescript
interface CreateBatchRequest {
  medicineId:      string;
  batchNumber:     string;   // must be unique
  quantity:        number;   // 1–10000
  manufactureDate: string;   // ISO 8601 date
  expiryDate:      string;   // ISO 8601 date; must be after manufactureDate
}
```

### Create Batch Response

```typescript
interface BatchResponse {
  id:              string;
  batchNumber:     string;
  medicineId:      string;
  quantity:        number;
  manufactureDate: string;
  expiryDate:      string;
  status:          'ACTIVE' | 'RECALLED';
  unitCount:       number;
  createdAt:       string;
}
```

---

## 5. Unit Contract

### Unit Summary

```typescript
interface UnitSummary {
  id:          string;
  unitId:      string;   // e.g. "B2026-001-000001"
  batchId:     string;
  status:      UnitStatus;
  qrContent:   string;   // full verify URL
  createdAt:   string;
}
```

---

## 6. Transfer Contract

### Transfer Request

```typescript
interface TransferRequest {
  unitIds:        string[];   // array of unitId strings
  toOrganizationId: string;
  location:       string;     // city/place name
  lat:            number;
  lng:            number;
  notes?:         string;
}
```

### Transfer Response

```typescript
interface TransferResponse {
  transferredCount: number;
  failedUnitIds:    string[];
  newStatus:        UnitStatus;
}
```

---

## 7. Sale Contract

### Sale Request

```typescript
interface SaleRequest {
  unitId:       string;
  pharmacyOrgId?: string;   // defaults to authenticated org
  notes?:       string;
}
```

### Sale Response

```typescript
interface SaleResponse {
  saleId:     string;
  unitId:     string;
  soldAt:     string;
  status:     'SOLD';
}
```

---

## 8. Recall Contract

### Recall Request

```typescript
interface RecallRequest {
  batchId:   string;
  reason:    string;
  initiatedBy?: string;   // defaults to authenticated user
}
```

### Recall Response

```typescript
interface RecallResponse {
  recallId:       string;
  batchId:        string;
  batchNumber:    string;
  affectedUnits:  number;
  recalledAt:     string;
  reason:         string;
}
```

---

## 9. Alert Contract

### Alert Item

```typescript
interface AlertItem {
  id:          string;
  unitId:      string;
  riskScore:   number;
  riskLevel:   RiskLevel;
  reasons:     string[];
  location:    string | null;
  resolvedAt:  string | null;
  createdAt:   string;
  unit: {
    unitId:    string;
    status:    UnitStatus;
    batch: {
      batchNumber: string;
      medicine: {
        name: string;
      };
    };
  };
}
```

---

## 10. Audit Contract

### Audit Event Item

```typescript
interface AuditEventItem {
  id:           string;
  eventType:    EventType;
  entityId:     string;
  eventData:    Record<string, unknown>;
  previousHash: string;
  currentHash:  string;
  timestamp:    string;
  actorId:      string | null;
}
```

### Audit Verify Response

```typescript
interface AuditVerifyResponse {
  entityId:    string;
  eventCount:  number;
  chainValid:  boolean;
  events:      AuditEventItem[];
}
```

---

## 11. Auth Contract

### Login Request

```typescript
interface LoginRequest {
  email:    string;
  password: string;
}
```

### Login Response

```typescript
interface LoginResponse {
  token: string;
  user: {
    id:    string;
    email: string;
    role:  Role;
    orgId: string;
    orgName: string;
  };
}
```

---

## 12. Contract Change Rule

If any agent needs to change a contract defined in this file:

1. Stop implementing. Do not make the change silently.
2. Document the proposed change (what, why, impact).
3. Identify all agents and files affected.
4. Get acknowledgement from Lead (or coordinate in the PR).
5. Update **this file** as the single authoritative source.
6. Update all dependent implementations simultaneously.
7. Run integration tests before merging.

**No silent breaking changes. Ever.**
