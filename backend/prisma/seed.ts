/**
 * PharmaTrace Seed Data
 * Creates all demo data required by DEMO.md and PRD.md §6
 * Uses upsert — safe to run multiple times
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Hash chain helper (inline to avoid import issues during seed) ─────────────
async function seedAuditEvent(
  eventType: string,
  entityId: string,
  eventData: Record<string, unknown>,
  timestamp: Date,
  actorId?: string
) {
  const lastEvent = await prisma.auditEvent.findFirst({
    where: { entityId },
    orderBy: { timestamp: 'desc' },
  });
  const previousHash = lastEvent?.currentHash ?? '';
  const sortedData = Object.fromEntries(
    Object.entries({ ...eventData, entityId, eventType }).sort(([a], [b]) => a.localeCompare(b))
  );
  const payload = JSON.stringify(sortedData) + previousHash + timestamp.toISOString();
  const currentHash = crypto.createHash('sha256').update(payload).digest('hex');

  return prisma.auditEvent.create({
    data: { eventType, entityId, eventData: JSON.stringify(eventData), previousHash, currentHash, timestamp, actorId: actorId ?? null },
  });
}

async function main() {
  console.log('🌱 Seeding PharmaTrace demo data...');

  const passwordHash = await bcrypt.hash('Demo@1234', 10);

  // ─── Organizations ───────────────────────────────────────────────────────────
  const abcPharma = await prisma.organization.upsert({
    where: { id: 'org-abc-pharma' },
    update: {},
    create: { id: 'org-abc-pharma', name: 'ABC Pharma', type: 'MANUFACTURER', city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  });

  const medDist = await prisma.organization.upsert({
    where: { id: 'org-meddist' },
    update: {},
    create: { id: 'org-meddist', name: 'MedDist Pvt Ltd', type: 'DISTRIBUTOR', city: 'Delhi', lat: 28.6139, lng: 77.2090 },
  });

  const pharmaTrade = await prisma.organization.upsert({
    where: { id: 'org-pharmatrade' },
    update: {},
    create: { id: 'org-pharmatrade', name: 'PharmaTrade', type: 'WHOLESALER', city: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  });

  const cityPharmacy = await prisma.organization.upsert({
    where: { id: 'org-city-pharmacy' },
    update: {},
    create: { id: 'org-city-pharmacy', name: 'City Pharmacy', type: 'PHARMACY', city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  });

  const cdsco = await prisma.organization.upsert({
    where: { id: 'org-cdsco' },
    update: {},
    create: { id: 'org-cdsco', name: 'CDSCO', type: 'REGULATOR', city: 'New Delhi', lat: 28.6139, lng: 77.2090 },
  });

  console.log('  ✅ Organizations created');

  // ─── Users ───────────────────────────────────────────────────────────────────
  const mfgUser = await prisma.user.upsert({
    where: { email: 'manufacturer@demo.local' },
    update: {},
    create: { id: 'user-manufacturer', email: 'manufacturer@demo.local', passwordHash, role: 'MANUFACTURER', organizationId: abcPharma.id },
  });

  await prisma.user.upsert({
    where: { email: 'distributor@demo.local' },
    update: {},
    create: { id: 'user-distributor', email: 'distributor@demo.local', passwordHash, role: 'DISTRIBUTOR', organizationId: medDist.id },
  });

  await prisma.user.upsert({
    where: { email: 'wholesaler@demo.local' },
    update: {},
    create: { id: 'user-wholesaler', email: 'wholesaler@demo.local', passwordHash, role: 'WHOLESALER', organizationId: pharmaTrade.id },
  });

  const pharmacyUser = await prisma.user.upsert({
    where: { email: 'pharmacy@demo.local' },
    update: {},
    create: { id: 'user-pharmacy', email: 'pharmacy@demo.local', passwordHash, role: 'PHARMACY', organizationId: cityPharmacy.id },
  });

  await prisma.user.upsert({
    where: { email: 'regulator@demo.local' },
    update: {},
    create: { id: 'user-regulator', email: 'regulator@demo.local', passwordHash, role: 'REGULATOR', organizationId: cdsco.id },
  });

  console.log('  ✅ Users created (password: Demo@1234)');

  // ─── Medicine ─────────────────────────────────────────────────────────────────
  const paracetamol = await prisma.medicine.upsert({
    where: { id: 'med-paracetamol' },
    update: {},
    create: { id: 'med-paracetamol', name: 'Paracetamol', strength: '500 mg', form: 'Tablet', manufacturerId: abcPharma.id },
  });

  console.log('  ✅ Medicine created: Paracetamol 500mg Tablet');

  // ─── Batch B2026-001 (Active) ─────────────────────────────────────────────────
  const batch001 = await prisma.batch.upsert({
    where: { batchNumber: 'B2026-001' },
    update: {},
    create: {
      id: 'batch-b2026-001',
      batchNumber: 'B2026-001',
      medicineId: paracetamol.id,
      organizationId: abcPharma.id,
      quantity: 10,
      manufactureDate: new Date('2026-01-15'),
      expiryDate: new Date('2027-12-31'),
      status: 'ACTIVE',
    },
  });

  // Create units for B2026-001
  for (let i = 1; i <= 10; i++) {
    const unitId = `B2026-001-${String(i).padStart(6, '0')}`;
    await prisma.medicineUnit.upsert({
      where: { unitId },
      update: {},
      create: { unitId, batchId: batch001.id, status: 'AT_PHARMACY' },
    });
  }

  console.log('  ✅ Batch B2026-001 + 10 units created');

  // ─── Batch B2026-002 (Recalled) ───────────────────────────────────────────────
  const batch002 = await prisma.batch.upsert({
    where: { batchNumber: 'B2026-002' },
    update: {},
    create: {
      id: 'batch-b2026-002',
      batchNumber: 'B2026-002',
      medicineId: paracetamol.id,
      organizationId: abcPharma.id,
      quantity: 5,
      manufactureDate: new Date('2026-02-01'),
      expiryDate: new Date('2027-06-30'),
      status: 'RECALLED',
    },
  });

  for (let i = 1; i <= 5; i++) {
    const unitId = `B2026-002-${String(i).padStart(6, '0')}`;
    await prisma.medicineUnit.upsert({
      where: { unitId },
      update: {},
      create: { unitId, batchId: batch002.id, status: 'RECALLED' },
    });
  }

  // Create a recall record for B2026-002
  const existingRecall = await prisma.recall.findFirst({ where: { batchId: batch002.id } });
  if (!existingRecall) {
    await prisma.recall.create({
      data: {
        batchId: batch002.id,
        reason: 'Quality defect detected in batch B2026-002 — substandard dissolution profile.',
        initiatedBy: 'user-regulator',
        recalledAt: new Date('2026-03-01'),
      },
    });
  }

  console.log('  ✅ Batch B2026-002 + 5 recalled units created');

  // ─── Supply Chain Events for B2026-001-000001 (Clean Demo Unit) ────────────────
  const unit1 = await prisma.medicineUnit.findUnique({ where: { unitId: 'B2026-001-000001' } });
  if (unit1) {
    const existingSC = await prisma.supplyChainEvent.findFirst({ where: { unitId: unit1.id } });
    if (!existingSC) {
      // MANUFACTURER → DISTRIBUTOR
      await prisma.supplyChainEvent.create({
        data: {
          unitId: unit1.id, senderOrgId: abcPharma.id, receiverOrgId: medDist.id,
          eventType: 'TRANSFERRED', location: 'Mumbai', lat: 19.0760, lng: 72.8777,
          timestamp: new Date('2026-01-20T10:00:00Z'),
        },
      });
      // DISTRIBUTOR → WHOLESALER
      await prisma.supplyChainEvent.create({
        data: {
          unitId: unit1.id, senderOrgId: medDist.id, receiverOrgId: pharmaTrade.id,
          eventType: 'TRANSFERRED', location: 'Delhi', lat: 28.6139, lng: 77.2090,
          timestamp: new Date('2026-01-25T10:00:00Z'),
        },
      });
      // WHOLESALER → PHARMACY
      await prisma.supplyChainEvent.create({
        data: {
          unitId: unit1.id, senderOrgId: pharmaTrade.id, receiverOrgId: cityPharmacy.id,
          eventType: 'TRANSFERRED', location: 'Kolkata', lat: 22.5726, lng: 88.3639,
          timestamp: new Date('2026-01-30T10:00:00Z'),
        },
      });
    }

    // Audit events for B2026-001-000001
    const existingAudit = await prisma.auditEvent.findFirst({ where: { entityId: 'B2026-001-000001' } });
    if (!existingAudit) {
      await seedAuditEvent('UNIT_CREATED', 'B2026-001-000001', { batchNumber: 'B2026-001' }, new Date('2026-01-15T08:00:00Z'), mfgUser.id);
      await seedAuditEvent('UNIT_TRANSFERRED', 'B2026-001-000001', { from: 'MANUFACTURED', to: 'AT_DISTRIBUTOR', location: 'Mumbai' }, new Date('2026-01-20T10:00:00Z'), mfgUser.id);
      await seedAuditEvent('UNIT_TRANSFERRED', 'B2026-001-000001', { from: 'AT_DISTRIBUTOR', to: 'AT_WHOLESALER', location: 'Delhi' }, new Date('2026-01-25T10:00:00Z'), mfgUser.id);
      await seedAuditEvent('UNIT_TRANSFERRED', 'B2026-001-000001', { from: 'AT_WHOLESALER', to: 'AT_PHARMACY', location: 'Kolkata' }, new Date('2026-01-30T10:00:00Z'), mfgUser.id);
    }
  }

  // ─── B2026-001-000002 — Pre-sold unit (triggers SUSPICIOUS in demo) ────────────
  const unit2 = await prisma.medicineUnit.findUnique({ where: { unitId: 'B2026-001-000002' } });
  if (unit2) {
    // Mark as SOLD
    await prisma.medicineUnit.update({ where: { id: unit2.id }, data: { status: 'SOLD' } });

    const existingSale = await prisma.sale.findUnique({ where: { unitId: unit2.id } });
    if (!existingSale) {
      await prisma.sale.create({
        data: { unitId: unit2.id, pharmacyOrgId: cityPharmacy.id, soldAt: new Date('2026-08-20T10:00:00Z'), notes: 'Pre-sold demo unit' },
      });
    }

    // Add supply chain + scan events so impossible travel can fire
    const existingSC2 = await prisma.supplyChainEvent.findFirst({ where: { unitId: unit2.id } });
    if (!existingSC2) {
      await prisma.supplyChainEvent.create({
        data: {
          unitId: unit2.id, senderOrgId: abcPharma.id, receiverOrgId: medDist.id,
          eventType: 'TRANSFERRED', location: 'Mumbai', lat: 19.0760, lng: 72.8777,
          timestamp: new Date('2026-01-20T10:00:00Z'),
        },
      });
      await prisma.supplyChainEvent.create({
        data: {
          unitId: unit2.id, senderOrgId: medDist.id, receiverOrgId: pharmaTrade.id,
          eventType: 'TRANSFERRED', location: 'Delhi', lat: 28.6139, lng: 77.2090,
          timestamp: new Date('2026-01-25T10:00:00Z'),
        },
      });
      await prisma.supplyChainEvent.create({
        data: {
          unitId: unit2.id, senderOrgId: pharmaTrade.id, receiverOrgId: cityPharmacy.id,
          eventType: 'TRANSFERRED', location: 'Kolkata', lat: 22.5726, lng: 88.3639,
          timestamp: new Date('2026-01-30T10:00:00Z'),
        },
      });
    }

    // Add a past scan from Bangalore so next scan from Chennai triggers impossible travel
    const existingScan = await prisma.scanEvent.findFirst({ where: { unitId: unit2.id } });
    if (!existingScan) {
      await prisma.scanEvent.create({
        data: {
          unitId: unit2.id,
          lat: 12.9716, lng: 77.5946, // Bangalore
          location: 'Bangalore',
          scannedAt: new Date(Date.now() - 60 * 1000), // 60 seconds ago
        },
      });
    }
  }

  console.log('  ✅ B2026-001-000002 marked as SOLD with prior scan (ready for SUSPICIOUS demo)');

  // ─── Audit for recalled batch ─────────────────────────────────────────────────
  const existingRecallAudit = await prisma.auditEvent.findFirst({ where: { entityId: batch002.id } });
  if (!existingRecallAudit) {
    await seedAuditEvent(
      'BATCH_RECALLED', batch002.id,
      { batchNumber: 'B2026-002', reason: 'Quality defect detected' },
      new Date('2026-03-01T09:00:00Z'), 'user-regulator'
    );
  }

  console.log('  ✅ Audit chain events created');

  console.log('\n🎉 Seed complete! Demo accounts:');
  console.log('   manufacturer@demo.local / Demo@1234');
  console.log('   distributor@demo.local  / Demo@1234');
  console.log('   wholesaler@demo.local   / Demo@1234');
  console.log('   pharmacy@demo.local     / Demo@1234');
  console.log('   regulator@demo.local    / Demo@1234');
  console.log('\n📋 Demo units:');
  console.log('   B2026-001-000001 → AT_PHARMACY (clean) → scan = VERIFIED');
  console.log('   B2026-001-000002 → SOLD → scan = SUSPICIOUS');
  console.log('   B2026-002-000001 → RECALLED → scan = RECALLED');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
