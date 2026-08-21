// Shared TypeScript types — mirrored from /shared/types/index.ts
// See CONTRACTS.md for authoritative definitions

export enum Role {
  MANUFACTURER = 'MANUFACTURER',
  DISTRIBUTOR  = 'DISTRIBUTOR',
  WHOLESALER   = 'WHOLESALER',
  PHARMACY     = 'PHARMACY',
  REGULATOR    = 'REGULATOR',
}

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

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SupplyChainStep {
  stage:        string;
  organization: string;
  location:     string;
  timestamp:    string;
  auditHash:    string;
}

export interface VerificationResponse {
  unitId:         string;
  status:         string;
  riskScore:      number;
  riskLevel:      RiskLevel;
  reasons:        string[];
  medicine: {
    name:     string;
    strength: string;
    form:     string;
  };
  batch: {
    batchNumber:     string;
    expiryDate:      string;
    manufactureDate: string;
  };
  manufacturer:   string;
  supplyChain:    SupplyChainStep[];
  scanCount:      number;
  lastScannedAt:  string | null;
  recallReason:   string | null;
}

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
    status:  string;
    batch: {
      batchNumber: string;
      medicine: { name: string };
    };
  };
}

export interface StatsResponse {
  totalUnits:         number;
  totalVerifications: number;
  suspiciousEvents:   number;
  activeRecalls:      number;
  criticalAlerts:     number;
}

export interface LoginResponse {
  token: string;
  user: {
    id:      string;
    email:   string;
    role:    string;
    orgId:   string;
    orgName: string;
  };
}

export interface BatchItem {
  id:              string;
  batchNumber:     string;
  status:          string;
  quantity:        number;
  expiryDate:      string;
  manufactureDate: string;
  medicine:        { name: string; strength: string; form: string };
  organization?:   { name: string };
  _count?:         { units: number };
  units?:          UnitItem[];
}

export interface UnitItem {
  id:        string;
  unitId:    string;
  batchId:   string;
  status:    string;
  qrContent: string;
  createdAt: string;
}

export interface Organization {
  id:   string;
  name: string;
  type: string;
  city: string;
}

export interface RecallItem {
  id:          string;
  batchId:     string;
  reason:      string;
  recalledAt:  string;
  batch: {
    batchNumber: string;
    medicine:    { name: string };
  };
}
