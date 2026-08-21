import { prisma } from '../../db';
import { AppError } from '../../middleware/errorHandler';
import { evaluateFraud } from '../../utils/fraudEngine';
import { createAuditEvent } from '../../utils/hashChain';
import { config } from '../../config';

export async function verifyUnit(
  unitId: string,
  lat?: number,
  lng?: number,
  ipAddress?: string,
  userAgent?: string
) {
  // 1. Find the unit with all relations
  const unit = await prisma.medicineUnit.findUnique({
    where: { unitId },
    include: {
      batch: {
        include: {
          medicine: { include: { manufacturer: true } },
          recalls: { orderBy: { recalledAt: 'desc' }, take: 1 },
        },
      },
      supplyChain: {
        include: { senderOrg: true, receiverOrg: true },
        orderBy: { timestamp: 'asc' },
      },
      scans: { orderBy: { scannedAt: 'asc' } },
      sale: true,
      fraudAlerts: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!unit) throw new AppError(404, 'UNIT_NOT_FOUND', 'Medicine unit not found in the system.');

  const now = new Date();

  // 2. Record scan event
  await prisma.scanEvent.create({
    data: {
      unitId: unit.id,
      lat: lat ?? null,
      lng: lng ?? null,
      location: null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      scannedAt: now,
    },
  });

  // 3. Reload scans including the one just created
  const allScans = await prisma.scanEvent.findMany({
    where: { unitId: unit.id },
    orderBy: { scannedAt: 'asc' },
  });

  // 4. Run fraud engine
  const fraud = evaluateFraud({
    unit: { status: unit.status, batch: { status: unit.batch.status, expiryDate: unit.batch.expiryDate } },
    sale: unit.sale,
    scanHistory: allScans.slice(0, -1), // exclude current scan from history
    currentScan: { lat, lng, scannedAt: now },
  });

  // 5. Create fraud alert if needed
  if (fraud.riskScore >= 30) {
    await prisma.fraudAlert.create({
      data: {
        unitId: unit.id,
        riskScore: fraud.riskScore,
        riskLevel: fraud.riskLevel,
        reasons: JSON.stringify(fraud.reasons),
        lat: lat ?? null,
        lng: lng ?? null,
      },
    });
  }

  // 6. Create audit event
  const auditEvent = await createAuditEvent(
    'UNIT_VERIFIED',
    unit.unitId,
    { riskScore: fraud.riskScore, riskLevel: fraud.riskLevel, scanCount: allScans.length },
    undefined
  );

  // 7. Build supply chain timeline
  const supplyChain = buildTimeline(unit);

  // 8. Build recall reason
  const recallReason = unit.batch.recalls[0]?.reason ?? null;

  return {
    unitId: unit.unitId,
    status: unit.status,
    riskScore: fraud.riskScore,
    riskLevel: fraud.riskLevel,
    reasons: fraud.reasons,
    medicine: {
      name: unit.batch.medicine.name,
      strength: unit.batch.medicine.strength,
      form: unit.batch.medicine.form,
    },
    batch: {
      batchNumber: unit.batch.batchNumber,
      expiryDate: unit.batch.expiryDate.toISOString(),
      manufactureDate: unit.batch.manufactureDate.toISOString(),
    },
    manufacturer: unit.batch.medicine.manufacturer.name,
    supplyChain,
    scanCount: allScans.length,
    lastScannedAt: allScans.length > 1 ? allScans[allScans.length - 2].scannedAt.toISOString() : null,
    recallReason,
    auditHash: auditEvent.currentHash,
  };
}

function buildTimeline(unit: any) {
  const stageMap: Record<string, string> = {
    MANUFACTURER: 'MANUFACTURER',
    DISTRIBUTOR: 'DISTRIBUTOR',
    WHOLESALER: 'WHOLESALER',
    PHARMACY: 'PHARMACY',
  };

  // Step 1 is always the manufacturing origin
  const manufacturerStep = {
    stage: 'MANUFACTURER',
    organization: unit.batch.medicine.manufacturer.name,
    location: unit.batch.medicine.manufacturer.city ?? 'Manufacturing Facility',
    timestamp: unit.batch.manufactureDate.toISOString(),
    auditHash: '',
  };

  // Steps 2–N come from actual transfer events
  const transferSteps = unit.supplyChain.map((ev: any) => ({
    stage: stageMap[ev.receiverOrg?.type] ?? ev.eventType,
    organization: ev.receiverOrg?.name ?? 'Unknown',
    location: ev.location ?? ev.receiverOrg?.city ?? 'Unknown',
    timestamp: ev.timestamp.toISOString(),
    auditHash: ev.auditHash ?? '',
  }));

  return [manufacturerStep, ...transferSteps];
}
