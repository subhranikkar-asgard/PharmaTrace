/**
 * shared/types/index.ts
 *
 * Authoritative shared TypeScript types for PharmaTrace.
 * Owned by: Lead (see OWNERSHIP.md §3)
 * Reference: CONTRACTS.md §1
 *
 * DO NOT modify without coordinating with all agents.
 */

// ─── Role ─────────────────────────────────────────────────────────────────────

export enum Role {
  MANUFACTURER = 'MANUFACTURER',
  DISTRIBUTOR  = 'DISTRIBUTOR',
  WHOLESALER   = 'WHOLESALER',
  PHARMACY     = 'PHARMACY',
  REGULATOR    = 'REGULATOR',
}

// ─── Unit Status ──────────────────────────────────────────────────────────────

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

// ─── Batch Status ─────────────────────────────────────────────────────────────

export enum BatchStatus {
  ACTIVE   = 'ACTIVE',
  RECALLED = 'RECALLED',
}

// ─── Org Type ─────────────────────────────────────────────────────────────────

export enum OrgType {
  MANUFACTURER = 'MANUFACTURER',
  DISTRIBUTOR  = 'DISTRIBUTOR',
  WHOLESALER   = 'WHOLESALER',
  PHARMACY     = 'PHARMACY',
  REGULATOR    = 'REGULATOR',
}

// ─── Risk Level ───────────────────────────────────────────────────────────────

export enum RiskLevel {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ─── Event Type ───────────────────────────────────────────────────────────────

export enum EventType {
  UNIT_CREATED       = 'UNIT_CREATED',
  UNIT_TRANSFERRED   = 'UNIT_TRANSFERRED',
  UNIT_VERIFIED      = 'UNIT_VERIFIED',
  UNIT_SOLD          = 'UNIT_SOLD',
  UNIT_RECALLED      = 'UNIT_RECALLED',
  FRAUD_ALERT_RAISED = 'FRAUD_ALERT_RAISED',
  BATCH_RECALLED     = 'BATCH_RECALLED',
}

// ─── Error Codes ──────────────────────────────────────────────────────────────

export type ErrorCode =
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

// ─── API Envelope ─────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Supply Chain Step ────────────────────────────────────────────────────────

export interface SupplyChainStep {
  stage:        string;
  organization: string;
  location:     string;
  timestamp:    string;   // ISO 8601
  auditHash:    string;
}

// ─── Verification Response ────────────────────────────────────────────────────

export interface VerificationResponse {
  unitId:         string;
  status:         UnitStatus;
  riskScore:      number;        // 0–100
  riskLevel:      RiskLevel;
  reasons:        string[];
  medicine: {
    name:         string;
    strength:     string;
    form:         string;
  };
  batch: {
    batchNumber:      string;
    expiryDate:       string;
    manufactureDate:  string;
  };
  manufacturer:   string;
  supplyChain:    SupplyChainStep[];
  scanCount:      number;
  lastScannedAt:  string | null;
  recallReason:   string | null;
}

// ─── Alert Item ───────────────────────────────────────────────────────────────

export interface AlertItem {
  id:         string;
  unitId:     string;
  riskScore:  number;
  riskLevel:  RiskLevel;
  reasons:    string[];
  location:   string | null;
  resolvedAt: string | null;
  createdAt:  string;
  unit: {
    unitId:  string;
    status:  UnitStatus;
    batch: {
      batchNumber: string;
      medicine: {
        name: string;
      };
    };
  };
}

// ─── Recall Response ──────────────────────────────────────────────────────────

export interface RecallResponse {
  recallId:      string;
  batchId:       string;
  batchNumber:   string;
  affectedUnits: number;
  recalledAt:    string;
  reason:        string;
}

// ─── Login Response ───────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: {
    id:      string;
    email:   string;
    role:    Role;
    orgId:   string;
    orgName: string;
  };
}

// ─── Stats Response ───────────────────────────────────────────────────────────

export interface StatsResponse {
  totalUnits:        number;
  totalVerifications: number;
  suspiciousEvents:  number;
  activeRecalls:     number;
  criticalAlerts:    number;
}
