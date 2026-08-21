import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { prisma } from '../../db';
import { verifyAuditChain } from '../../utils/hashChain';

const router = Router();

router.get('/:entityId', authenticate, authorize('REGULATOR', 'MANUFACTURER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const events = await prisma.auditEvent.findMany({
        where: { entityId: req.params.entityId },
        orderBy: { timestamp: 'asc' },
      });
      const data = events.map(e => ({
        ...e,
        eventData: JSON.parse(e.eventData as string),
      }));
      res.json({ success: true, data: { entityId: req.params.entityId, eventCount: events.length, events: data } });
    } catch (err) { next(err); }
  }
);

router.get('/:entityId/verify', authenticate, authorize('REGULATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { events, chainValid } = await verifyAuditChain(req.params.entityId);
      const data = {
        entityId: req.params.entityId,
        eventCount: events.length,
        chainValid,
        events: events.map(e => ({ ...e, eventData: JSON.parse(e.eventData as string) })),
      };
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export { router as auditRouter };
