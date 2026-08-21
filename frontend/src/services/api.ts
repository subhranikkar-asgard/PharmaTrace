import axios from 'axios';
import type {
  VerificationResponse, LoginResponse, BatchItem,
  UnitItem, AlertItem, StatsResponse, Organization, RecallItem,
} from '../types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

const client = axios.create({ baseURL: BASE });

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('pharmatrace_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string): Promise<LoginResponse> =>
  client.post('/auth/login', { email, password }).then(r => r.data.data);

export const getMe = () =>
  client.get('/auth/me').then(r => r.data.data);

// ── Verification (public — no token) ─────────────────────────────────────────
export const verifyUnit = (
  unitId: string, lat?: number, lng?: number
): Promise<VerificationResponse> => {
  const params = (lat != null && lng != null) ? `?lat=${lat}&lng=${lng}` : '';
  return client.get(`/verify/${encodeURIComponent(unitId)}${params}`).then(r => r.data.data);
};

// ── Medicines ─────────────────────────────────────────────────────────────────
export const getMedicines = () =>
  client.get('/medicines').then(r => r.data.data);

export const createMedicine = (data: { name: string; strength: string; form: string }) =>
  client.post('/medicines', data).then(r => r.data.data);

// ── Batches ───────────────────────────────────────────────────────────────────
export const getBatches = (): Promise<BatchItem[]> =>
  client.get('/batches').then(r => r.data.data);

export const getBatch = (batchId: string): Promise<BatchItem> =>
  client.get(`/batches/${batchId}`).then(r => r.data.data);

export const deleteBatch = (batchId: string): Promise<{ deleted: boolean; unitsDeleted: number }> =>
  client.delete(`/batches/${batchId}`).then(r => r.data.data);

export const createBatch = (data: {
  medicineId: string; batchNumber: string;
  quantity: number; manufactureDate: string; expiryDate: string;
}): Promise<BatchItem> => client.post('/batches', data).then(r => r.data.data);

// ── Units ─────────────────────────────────────────────────────────────────────
export const getUnit = (unitId: string): Promise<UnitItem> =>
  client.get(`/units/${unitId}`).then(r => r.data.data);

export const getUnitQR = (unitId: string): Promise<{ unitId: string; qrContent: string }> =>
  client.get(`/units/${unitId}/qr`).then(r => r.data.data);

// ── Transfers ─────────────────────────────────────────────────────────────────
export const createTransfer = (data: {
  unitIds: string[]; toOrganizationId: string;
  location: string; lat: number; lng: number; notes?: string;
}) => client.post('/transfers', data).then(r => r.data.data);

// ── Sales ─────────────────────────────────────────────────────────────────────
export const sellUnit = (unitId: string, notes?: string) =>
  client.post('/sales', { unitId, notes }).then(r => r.data.data);

// ── Recalls ───────────────────────────────────────────────────────────────────
export const recallBatch = (batchId: string, reason: string): Promise<{ recallId: string; affectedUnits: number }> =>
  client.post('/recalls', { batchId, reason }).then(r => r.data.data);

export const getRecalls = (): Promise<RecallItem[]> =>
  client.get('/recalls').then(r => r.data.data);

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts = (params?: { riskLevel?: string; resolved?: boolean }): Promise<AlertItem[]> =>
  client.get('/alerts', { params }).then(r => r.data.data);

export const resolveAlert = (alertId: string) =>
  client.patch(`/alerts/${alertId}/resolve`).then(r => r.data.data);

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = (): Promise<StatsResponse> =>
  client.get('/stats').then(r => r.data.data);

// ── Organizations ─────────────────────────────────────────────────────────────
export const getOrganizations = (): Promise<Organization[]> =>
  client.get('/organizations').then(r => r.data.data);
