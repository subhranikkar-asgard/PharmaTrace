import { prisma } from '../../db';
import { AppError } from '../../middleware/errorHandler';
import { createAuditEvent } from '../../utils/hashChain';

export async function createBatch(
  medicineId: string,
  batchNumber: string,
  quantity: number,
  manufactureDate: string,
  expiryDate: string,
  organizationId: string,
  actorId: string
) {
  // Validate medicine belongs to this org
  const medicine = await prisma.medicine.findFirst({
    where: { id: medicineId, manufacturerId: organizationId },
  });
  if (!medicine) throw new AppError(404, 'BATCH_NOT_FOUND', 'Medicine not found or does not belong to your organization.');

  // Check batch number uniqueness
  const existing = await prisma.batch.findUnique({ where: { batchNumber } });
  if (existing) throw new AppError(400, 'VALIDATION_ERROR', `Batch number '${batchNumber}' already exists.`);

  const mfgDate = new Date(manufactureDate);
  const expDate = new Date(expiryDate);
  if (expDate <= mfgDate) throw new AppError(400, 'VALIDATION_ERROR', 'Expiry date must be after manufacture date.');

  // Create batch + units in a single transaction
  const batch = await prisma.$transaction(async (tx) => {
    const newBatch = await tx.batch.create({
      data: { batchNumber, medicineId, organizationId, quantity, manufactureDate: mfgDate, expiryDate: expDate },
    });

    const units = Array.from({ length: quantity }, (_, i) => ({
      unitId: `${batchNumber}-${String(i + 1).padStart(6, '0')}`,
      batchId: newBatch.id,
      status: 'MANUFACTURED',
    }));

    await tx.medicineUnit.createMany({ data: units });
    return newBatch;
  });

  await createAuditEvent('UNIT_CREATED', batch.id, { batchNumber, quantity, medicineId }, actorId);

  return getBatchById(batch.id);
}

export async function getBatches(organizationId: string) {
  return prisma.batch.findMany({
    where: { organizationId },
    include: {
      medicine: true,
      _count: { select: { units: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBatchById(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      medicine: { include: { manufacturer: true } },
      units: { orderBy: { unitId: 'asc' }, take: 100 },
      _count: { select: { units: true } },
    },
  });
  if (!batch) throw new AppError(404, 'BATCH_NOT_FOUND', 'Batch not found.');
  return batch;
}

export async function getAllBatches() {
  return prisma.batch.findMany({
    include: {
      medicine: { include: { manufacturer: true } },
      organization: true,
      _count: { select: { units: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
