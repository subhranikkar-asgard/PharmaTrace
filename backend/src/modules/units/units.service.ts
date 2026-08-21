import { prisma } from '../../db';
import { AppError } from '../../middleware/errorHandler';
import { config } from '../../config';

export async function getUnit(unitId: string) {
  const unit = await prisma.medicineUnit.findUnique({
    where: { unitId },
    include: { batch: { include: { medicine: { include: { manufacturer: true } } } } },
  });
  if (!unit) throw new AppError(404, 'UNIT_NOT_FOUND', 'Medicine unit not found.');
  return {
    id: unit.id,
    unitId: unit.unitId,
    batchId: unit.batchId,
    status: unit.status,
    qrContent: `${config.frontendUrl}/verify/${unit.unitId}`,
    createdAt: unit.createdAt.toISOString(),
    batch: unit.batch,
  };
}

export async function getUnitQR(unitId: string) {
  const unit = await prisma.medicineUnit.findUnique({ where: { unitId } });
  if (!unit) throw new AppError(404, 'UNIT_NOT_FOUND', 'Medicine unit not found.');
  return {
    unitId: unit.unitId,
    qrContent: `${config.frontendUrl}/verify/${unit.unitId}`,
  };
}
