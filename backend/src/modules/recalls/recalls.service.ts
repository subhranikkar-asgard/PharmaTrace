import { prisma } from '../../db';
import { AppError } from '../../middleware/errorHandler';
import { createAuditEvent } from '../../utils/hashChain';

export async function recallBatch(batchId: string, reason: string, initiatedBy: string, actorId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { _count: { select: { units: true } } },
  });
  if (!batch) throw new AppError(404, 'BATCH_NOT_FOUND', 'Batch not found.');
  if (batch.status === 'RECALLED') throw new AppError(400, 'BATCH_ALREADY_RECALLED', 'Batch has already been recalled.');

  const [recall] = await prisma.$transaction([
    prisma.recall.create({ data: { batchId, reason, initiatedBy } }),
    prisma.batch.update({ where: { id: batchId }, data: { status: 'RECALLED' } }),
    prisma.medicineUnit.updateMany({ where: { batchId }, data: { status: 'RECALLED' } }),
  ]);

  await createAuditEvent('BATCH_RECALLED', batchId, { batchNumber: batch.batchNumber, reason, initiatedBy }, actorId);

  return {
    recallId: recall.id,
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    affectedUnits: batch._count.units,
    recalledAt: recall.recalledAt.toISOString(),
    reason,
  };
}

export async function getRecalls() {
  return prisma.recall.findMany({
    include: { batch: { include: { medicine: true } } },
    orderBy: { recalledAt: 'desc' },
  });
}
