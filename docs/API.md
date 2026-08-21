# API.md — PharmaTrace Endpoint Reference

> Authority: derives from `MASTER.md` and `CONTRACTS.md`. All endpoints use prefix `/api/v1/`. Response shapes are defined in `CONTRACTS.md`. This file provides endpoint-level detail.
>
> **Frontend Agent**: consume only endpoints listed here. Do not call undocumented endpoints.  
> **Backend Agent**: implement exactly these endpoints. Do not invent new response shapes without updating `CONTRACTS.md`.

---

## Global Rules

- All responses are `application/json`.
- All successful responses: `{ "success": true, "data": { ... } }`
- All error responses: `{ "success": false, "error": { "code": "...", "message": "..." } }`
- Auth header (where required): `Authorization: Bearer <jwt>`
- Timestamps: ISO 8601 strings.
- API prefix: `/api/v1`

---

## 1. Auth

### `POST /api/v1/auth/login`

Authenticate and receive a JWT.

| Field | Value |
|---|---|
| Method | POST |
| Auth | None |
| Roles | Any |

**Request Body**
```json
{
  "email": "manufacturer@demo.local",
  "password": "Demo@1234"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "...",
      "email": "manufacturer@demo.local",
      "role": "MANUFACTURER",
      "orgId": "...",
      "orgName": "ABC Pharma"
    }
  }
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| `UNAUTHORIZED` | 401 | Wrong email or password |

---

### `GET /api/v1/auth/me`

Return current authenticated user.

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | Any authenticated |

**Response 200**: same user object as login.

---

## 2. Medicines

### `POST /api/v1/medicines`

Create a medicine.

| Field | Value |
|---|---|
| Method | POST |
| Auth | Required |
| Roles | MANUFACTURER |

**Request Body**
```json
{
  "name": "Paracetamol",
  "strength": "500 mg",
  "form": "Tablet"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Paracetamol",
    "strength": "500 mg",
    "form": "Tablet",
    "manufacturerId": "...",
    "createdAt": "2026-08-21T03:00:00.000Z"
  }
}
```

---

### `GET /api/v1/medicines`

List all medicines for the authenticated manufacturer.

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | MANUFACTURER |

**Response 200**: `{ "success": true, "data": [ MedicineObject, ... ] }`

---

## 3. Batches

### `POST /api/v1/batches`

Create a batch and auto-generate serialized units.

| Field | Value |
|---|---|
| Method | POST |
| Auth | Required |
| Roles | MANUFACTURER |

**Request Body**
```json
{
  "medicineId": "...",
  "batchNumber": "B2026-001",
  "quantity": 100,
  "manufactureDate": "2026-01-15",
  "expiryDate": "2027-12-31"
}
```

**Validation**
- `batchNumber` must be unique.
- `quantity` ∈ [1, 10000].
- `expiryDate` must be after `manufactureDate`.

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "batchNumber": "B2026-001",
    "medicineId": "...",
    "quantity": 100,
    "manufactureDate": "2026-01-15",
    "expiryDate": "2027-12-31",
    "status": "ACTIVE",
    "unitCount": 100,
    "createdAt": "..."
  }
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid fields |
| `BATCH_NOT_FOUND` | 404 | medicineId not found |

---

### `GET /api/v1/batches`

List batches for the authenticated organization.

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | MANUFACTURER, REGULATOR |

**Response 200**: `{ "success": true, "data": [ BatchObject, ... ] }`

---

### `GET /api/v1/batches/:batchId`

Get batch detail including units.

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | MANUFACTURER, REGULATOR |

**Response 200**: BatchObject with embedded `units[]` array.

---

## 4. Units

### `GET /api/v1/units/:unitId`

Get a specific unit by its unitId string (e.g., `B2026-001-000001`).

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | MANUFACTURER, PHARMACY, REGULATOR |

**Response 200**: UnitSummary object (see `CONTRACTS.md §5`).

---

### `GET /api/v1/units/:unitId/qr`

Return QR content (the URL to encode). Client generates the actual QR image.

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | MANUFACTURER |

**Response 200**
```json
{
  "success": true,
  "data": {
    "unitId": "B2026-001-000001",
    "qrContent": "http://localhost:5173/verify/B2026-001-000001"
  }
}
```

---

## 5. Transfers (Supply-Chain Movement)

### `POST /api/v1/transfers`

Transfer one or more units to the next supply-chain node.

| Field | Value |
|---|---|
| Method | POST |
| Auth | Required |
| Roles | MANUFACTURER, DISTRIBUTOR, WHOLESALER |

**Request Body**
```json
{
  "unitIds": ["B2026-001-000001", "B2026-001-000002"],
  "toOrganizationId": "...",
  "location": "Delhi",
  "lat": 28.6139,
  "lng": 77.2090,
  "notes": "Regular shipment"
}
```

**Validation**
- `toOrganizationId` must be the next valid node (MANUFACTURER → DISTRIBUTOR → WHOLESALER → PHARMACY).
- Each unit must be in a valid state for transfer.
- Caller's org type must match the expected sender.

**Response 200**
```json
{
  "success": true,
  "data": {
    "transferredCount": 2,
    "failedUnitIds": [],
    "newStatus": "AT_DISTRIBUTOR"
  }
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| `INVALID_STATE_TRANSITION` | 400 | Unit not in valid state for this transfer |
| `FORBIDDEN` | 403 | Caller's role cannot perform this transfer |
| `UNIT_NOT_FOUND` | 404 | A unitId does not exist |

---

## 6. Verification (Public)

### `GET /api/v1/verify/:unitId`

Verify a medicine unit. **No authentication required.**

Records a ScanEvent, runs the fraud engine, creates a FraudAlert if needed, creates an AuditEvent, and returns the full verification result.

| Field | Value |
|---|---|
| Method | GET |
| Auth | **None** |
| Roles | PUBLIC |

**Query Params** (optional, for simulated location)
```
?lat=22.5726&lng=88.3639
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "unitId": "B2026-001-000001",
    "status": "AT_PHARMACY",
    "riskScore": 0,
    "riskLevel": "LOW",
    "reasons": [],
    "medicine": {
      "name": "Paracetamol",
      "strength": "500 mg",
      "form": "Tablet"
    },
    "batch": {
      "batchNumber": "B2026-001",
      "expiryDate": "2027-12-31T00:00:00.000Z",
      "manufactureDate": "2026-01-15T00:00:00.000Z"
    },
    "manufacturer": "ABC Pharma",
    "supplyChain": [
      {
        "stage": "MANUFACTURER",
        "organization": "ABC Pharma",
        "location": "Mumbai",
        "timestamp": "2026-01-15T10:00:00.000Z",
        "auditHash": "a3f5..."
      },
      {
        "stage": "DISTRIBUTOR",
        "organization": "MedDist Pvt Ltd",
        "location": "Delhi",
        "timestamp": "2026-01-20T10:00:00.000Z",
        "auditHash": "b7c2..."
      }
    ],
    "scanCount": 1,
    "lastScannedAt": "2026-08-21T03:00:00.000Z",
    "recallReason": null
  }
}
```

**When unit is SUSPICIOUS (post-sale scan):**
```json
{
  "success": true,
  "data": {
    "unitId": "B2026-001-000002",
    "status": "SOLD",
    "riskScore": 87,
    "riskLevel": "CRITICAL",
    "reasons": [
      "Medicine unit has already been sold",
      "Duplicate scan detected within short interval",
      "Physically impossible movement between scan locations"
    ],
    ...
  }
}
```

**When unit is RECALLED:**
```json
{
  "success": true,
  "data": {
    "unitId": "B2026-001-000003",
    "status": "RECALLED",
    "riskScore": 100,
    "riskLevel": "CRITICAL",
    "reasons": ["Batch has been recalled — do not dispense"],
    "recallReason": "Quality defect detected in batch",
    ...
  }
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| `UNIT_NOT_FOUND` | 404 | unitId does not exist |

---

## 7. Sales

### `POST /api/v1/sales`

Mark a unit as sold.

| Field | Value |
|---|---|
| Method | POST |
| Auth | Required |
| Roles | PHARMACY |

**Request Body**
```json
{
  "unitId": "B2026-001-000001",
  "notes": "Dispensed to patient"
}
```

**Validation**
- Unit must be in `AT_PHARMACY` state.
- Unit must not already have a Sale record.

**Response 201**
```json
{
  "success": true,
  "data": {
    "saleId": "...",
    "unitId": "B2026-001-000001",
    "soldAt": "2026-08-21T04:30:00.000Z",
    "status": "SOLD"
  }
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| `UNIT_ALREADY_SOLD` | 400 | Unit already has a sale record |
| `INVALID_STATE_TRANSITION` | 400 | Unit not at pharmacy |
| `UNIT_RECALLED` | 400 | Unit is recalled |

---

## 8. Recalls

### `POST /api/v1/recalls`

Recall an entire batch.

| Field | Value |
|---|---|
| Method | POST |
| Auth | Required |
| Roles | REGULATOR |

**Request Body**
```json
{
  "batchId": "...",
  "reason": "Quality defect detected — batch B2026-001 withdrawn immediately."
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "recallId": "...",
    "batchId": "...",
    "batchNumber": "B2026-001",
    "affectedUnits": 100,
    "recalledAt": "2026-08-21T05:00:00.000Z",
    "reason": "Quality defect detected — batch B2026-001 withdrawn immediately."
  }
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| `BATCH_NOT_FOUND` | 404 | batchId not found |
| `BATCH_ALREADY_RECALLED` | 400 | Batch already recalled |

---

### `GET /api/v1/recalls`

List all recalls.

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | REGULATOR, MANUFACTURER |

**Response 200**: `{ "success": true, "data": [ RecallObject, ... ] }`

---

## 9. Alerts (Fraud)

### `GET /api/v1/alerts`

List all fraud alerts, most recent first.

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | REGULATOR |

**Query Params** (optional)
```
?riskLevel=CRITICAL&resolved=false&limit=50&offset=0
```

**Response 200**: `{ "success": true, "data": [ AlertItem, ... ] }`  
(See `CONTRACTS.md §9` for AlertItem shape.)

---

### `GET /api/v1/alerts/:alertId`

Get detail for a specific alert.

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | REGULATOR |

**Response 200**: single AlertItem.

---

### `PATCH /api/v1/alerts/:alertId/resolve`

Mark an alert as resolved.

| Field | Value |
|---|---|
| Method | PATCH |
| Auth | Required |
| Roles | REGULATOR |

**Response 200**
```json
{
  "success": true,
  "data": { "id": "...", "resolvedAt": "..." }
}
```

---

## 10. Audit

### `GET /api/v1/audit/:entityId`

Get the full audit hash chain for an entity (unit, batch, etc.).

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | REGULATOR, MANUFACTURER |

**Response 200**: AuditVerifyResponse (see `CONTRACTS.md §10`).

---

### `GET /api/v1/audit/:entityId/verify`

Verify the hash chain integrity for an entity.

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | REGULATOR |

**Response 200**
```json
{
  "success": true,
  "data": {
    "entityId": "B2026-001-000001",
    "eventCount": 6,
    "chainValid": true,
    "events": [ ... ]
  }
}
```

---

## 11. Dashboard / Stats

### `GET /api/v1/stats`

Return summary statistics for the regulator dashboard.

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | REGULATOR |

**Response 200**
```json
{
  "success": true,
  "data": {
    "totalUnits": 300,
    "totalVerifications": 42,
    "suspiciousEvents": 7,
    "activeRecalls": 1,
    "criticalAlerts": 3
  }
}
```

---

## 12. Organizations

### `GET /api/v1/organizations`

List all organizations (for transfer dropdowns).

| Field | Value |
|---|---|
| Method | GET |
| Auth | Required |
| Roles | Any authenticated |

**Response 200**: `{ "success": true, "data": [ { id, name, type, city } ] }`

---

## Error Reference

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 400 | `UNIT_ALREADY_SOLD` | Re-sale attempt |
| 400 | `BATCH_ALREADY_RECALLED` | Batch already recalled |
| 400 | `INVALID_STATE_TRANSITION` | Illegal state change |
| 401 | `UNAUTHORIZED` | Missing or invalid token / wrong credentials |
| 403 | `FORBIDDEN` | Insufficient role |
| 404 | `UNIT_NOT_FOUND` | Unit ID not found |
| 404 | `BATCH_NOT_FOUND` | Batch ID not found |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
