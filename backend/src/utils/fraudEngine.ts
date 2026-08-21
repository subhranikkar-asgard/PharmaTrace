import { config } from '../config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FraudInput {
  unit: {
    status: string;
    batch: {
      status: string;
      expiryDate: Date;
    };
  };
  sale: { id: string } | null;
  scanHistory: Array<{ scannedAt: Date; lat?: number | null; lng?: number | null }>;
  currentScan: { lat?: number; lng?: number; scannedAt: Date };
}

export interface FraudResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
}

// ─── Haversine Distance ───────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

// ─── Fraud Engine ─────────────────────────────────────────────────────────────

/**
 * Deterministic rule-based fraud engine.
 * All rules are additive, total is capped at 100.
 * Returns human-readable reasons for every flag raised.
 */
export function evaluateFraud(input: FraudInput): FraudResult {
  let score = 0;
  const reasons: string[] = [];

  const { unit, sale, scanHistory, currentScan } = input;
  const now = currentScan.scannedAt;

  // Rule 1: Batch recalled
  if (unit.batch.status === 'RECALLED' || unit.status === 'RECALLED') {
    score += 100;
    reasons.push('Batch has been recalled — do not dispense');
  }

  // Rule 2: Medicine expired
  if (new Date(unit.batch.expiryDate) < now) {
    score += 100;
    reasons.push('Medicine has passed its expiry date');
  }

  // Rule 3: Already sold
  if (sale || unit.status === 'SOLD') {
    score += 40;
    reasons.push('Medicine unit has already been sold');
  }

  // Rule 4: Duplicate scan (scan within configured window)
  const windowMs = config.duplicateScanWindowSeconds * 1000;
  const recentScans = scanHistory.filter(
    s => now.getTime() - new Date(s.scannedAt).getTime() < windowMs
  );
  if (recentScans.length > 0) {
    score += 25;
    reasons.push('Duplicate scan detected within short interval');
  }

  // Rule 5: Impossible travel
  if (currentScan.lat != null && currentScan.lng != null) {
    const lastWithCoords = [...scanHistory]
      .reverse()
      .find(s => s.lat != null && s.lng != null);

    if (lastWithCoords && lastWithCoords.lat != null && lastWithCoords.lng != null) {
      const distKm = haversineKm(
        lastWithCoords.lat,
        lastWithCoords.lng,
        currentScan.lat,
        currentScan.lng
      );
      const elapsedHours =
        (now.getTime() - new Date(lastWithCoords.scannedAt).getTime()) / 3600000;
      const requiredSpeed = elapsedHours > 0 ? distKm / elapsedHours : Infinity;

      if (requiredSpeed > config.impossibleTravelThresholdKmh) {
        score += 30;
        reasons.push(
          `Physically impossible movement between scan locations (${Math.round(requiredSpeed)} km/h required)`
        );
      }
    }
  }

  // Rule 6: Excessive scans
  if (scanHistory.length >= config.excessiveScanThreshold) {
    score += 20;
    reasons.push(`Abnormally high number of scans for this unit (${scanHistory.length} total)`);
  }

  const capped = Math.min(score, 100);
  return { riskScore: capped, riskLevel: getRiskLevel(capped), reasons };
}
