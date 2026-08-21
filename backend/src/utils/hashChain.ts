import crypto from 'crypto';
import { prisma } from '../db';

/**
 * Creates a tamper-evident audit event linked to the previous event's hash.
 * Hash formula: SHA256(sortedEventData + previousHash + timestamp)
 */
export async function createAuditEvent(
  eventType: string,
  entityId: string,
  eventData: Record<string, unknown>,
  actorId?: string
) {
  const lastEvent = await prisma.auditEvent.findFirst({
    where: { entityId },
    orderBy: { timestamp: 'desc' },
  });

  const previousHash = lastEvent?.currentHash ?? '';
  const timestamp = new Date();

  // Canonical, deterministic serialization (sorted keys)
  const sortedData = Object.fromEntries(
    Object.entries({ ...eventData, entityId, eventType }).sort(([a], [b]) => a.localeCompare(b))
  );
  const payload = JSON.stringify(sortedData) + previousHash + timestamp.toISOString();
  const currentHash = crypto.createHash('sha256').update(payload).digest('hex');

  return prisma.auditEvent.create({
    data: {
      eventType,
      entityId,
      eventData: JSON.stringify(eventData),
      previousHash,
      currentHash,
      timestamp,
      actorId: actorId ?? null,
    },
  });
}

/**
 * Verifies the integrity of the hash chain for a given entityId.
 * Returns chainValid=true only if every hash re-computes correctly
 * and each previousHash matches the prior event's currentHash.
 */
export async function verifyAuditChain(entityId: string) {
  const events = await prisma.auditEvent.findMany({
    where: { entityId },
    orderBy: { timestamp: 'asc' },
  });

  let chainValid = true;
  let previousHash = '';

  for (const event of events) {
    const eventData = JSON.parse(event.eventData as string);
    const sortedData = Object.fromEntries(
      Object.entries({ ...eventData, entityId: event.entityId, eventType: event.eventType })
        .sort(([a], [b]) => a.localeCompare(b))
    );
    const payload =
      JSON.stringify(sortedData) + event.previousHash + new Date(event.timestamp).toISOString();
    const expectedHash = crypto.createHash('sha256').update(payload).digest('hex');

    if (event.currentHash !== expectedHash || event.previousHash !== previousHash) {
      chainValid = false;
      break;
    }
    previousHash = event.currentHash;
  }

  return { events, chainValid };
}
