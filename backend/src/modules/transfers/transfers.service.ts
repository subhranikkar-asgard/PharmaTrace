import { prisma } from '../../db';
import { AppError } from '../../middleware/errorHandler';
import { isValidTransition, ORG_TYPE_TO_STATUS } from '../../utils/stateMachine';
import { createAuditEvent } from '../../utils/hashChain';

export async function transferUnits(
  unitIds: string[],
  toOrganizationId: string,
  location: string,
  lat: number,
  lng: number,
  notes: string | undefined,
  senderOrgId: string,
  senderOrgType: string,
  actorId: string
) {
  const toOrg = await prisma.organization.findUnique({ where: { id: toOrganizationId } });
  if (!toOrg) throw new AppError(404, 'BATCH_NOT_FOUND', 'Destination organization not found.');

  const newStatus = ORG_TYPE_TO_STATUS[senderOrgType];
  if (!newStatus) throw new AppError(403, 'FORBIDDEN', 'Your role cannot perform transfers.');

  const failed: string[] = [];
  let transferred = 0;

  for (const unitId of unitIds) {
    const unit = await prisma.medicineUnit.findUnique({ where: { unitId } });
    if (!unit) { failed.push(unitId); continue; }

    if (!isValidTransition(unit.status, newStatus)) { failed.push(unitId); continue; }

    // Determine the intermediate "IN_DISTRIBUTION" step for manufacturer
    const statusesToApply: string[] = [];
    if (senderOrgType === 'MANUFACTURER') {
      statusesToApply.push('IN_DISTRIBUTION', 'AT_DISTRIBUTOR');
    } else {
      statusesToApply.push(newStatus);
    }

    await prisma.medicineUnit.update({
      where: { unitId },
      data: { status: statusesToApply[statusesToApply.length - 1] },
    });

    await prisma.supplyChainEvent.create({
      data: {
        unitId: unit.id,
        senderOrgId,
        receiverOrgId: toOrganizationId,
        eventType: 'TRANSFERRED',
        location,
        lat,
        lng,
        notes,
      },
    });

    await createAuditEvent(
      'UNIT_TRANSFERRED',
      unit.unitId,
      { from: unit.status, to: statusesToApply[statusesToApply.length - 1], location, toOrgName: toOrg.name },
      actorId
    );

    transferred++;
  }

  return { transferredCount: transferred, failedUnitIds: failed, newStatus };
}
