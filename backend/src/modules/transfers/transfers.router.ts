import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { transferUnits } from './transfers.service';
import { prisma } from '../../db';

const router = Router();

const TransferSchema = z.object({
  unitIds: z.array(z.string()).min(1),
  toOrganizationId: z.string().min(1),
  location: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  notes: z.string().optional(),
});

router.post('/', authenticate, authorize('MANUFACTURER', 'DISTRIBUTOR', 'WHOLESALER'),
  validateBody(TransferSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const senderOrg = await prisma.organization.findUnique({ where: { id: req.user!.orgId } });
      if (!senderOrg) throw new Error('Sender org not found');

      const data = await transferUnits(
        req.body.unitIds,
        req.body.toOrganizationId,
        req.body.location,
        req.body.lat,
        req.body.lng,
        req.body.notes,
        req.user!.orgId,
        senderOrg.type,
        req.user!.userId
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export { router as transfersRouter };
