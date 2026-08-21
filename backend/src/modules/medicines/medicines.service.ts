import { prisma } from '../../db';
import { AppError } from '../../middleware/errorHandler';

export async function createMedicine(
  name: string, strength: string, form: string, manufacturerId: string
) {
  return prisma.medicine.create({
    data: { name, strength, form, manufacturerId },
    include: { manufacturer: true },
  });
}

export async function getMedicines(manufacturerId: string) {
  return prisma.medicine.findMany({
    where: { manufacturerId },
    include: { manufacturer: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMedicineById(id: string) {
  const med = await prisma.medicine.findUnique({ where: { id }, include: { manufacturer: true } });
  if (!med) throw new AppError(404, 'BATCH_NOT_FOUND', 'Medicine not found.');
  return med;
}
