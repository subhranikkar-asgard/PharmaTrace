import { prisma } from '../../db';
import { AppError } from '../../middleware/errorHandler';
import { createAuditEvent } from '../../utils/hashChain';

export async function sellUnit(unitId: string, pharmacyOrgId: string, notes: string | undefined, actorId: string) {
  const unit = await prisma.medicineUnit.findUnique({
    where: { unitId },
    include: { sale: true },
  });
  if (!unit) throw new AppError(404, 'UNIT_NOT_FOUND', 'Medicine unit not found.');
  if (unit.sale) throw new AppError(400, 'UNIT_ALREADY_SOLD', 'This medicine unit has already been sold.');
  if (unit.status === 'RECALLED') throw new AppError(400, 'UNIT_RECALLED', 'Cannot sell a recalled unit.');
  if (unit.status !== 'AT_PHARMACY') throw new AppError(400, 'INVALID_STATE_TRANSITION', 'Unit must be at pharmacy before it can be sold.');

  const [sale] = await prisma.$transaction([
    prisma.sale.create({
      data: { unitId: unit.id, pharmacyOrgId, notes: notes ?? null },
    }),
    prisma.medicineUnit.update({
      where: { id: unit.id },
      data: { status: 'SOLD' },
    }),
  ]);

  await createAuditEvent('UNIT_SOLD', unit.unitId, { pharmacyOrgId, notes }, actorId);

  return { saleId: sale.id, unitId: unit.unitId, soldAt: sale.soldAt.toISOString(), status: 'SOLD' };
}
