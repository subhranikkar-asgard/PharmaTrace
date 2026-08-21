import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { sellUnit } from './sales.service';

const router = Router();

const SaleSchema = z.object({
  unitId: z.string().min(1),
  notes: z.string().optional(),
});

router.post('/', authenticate, authorize('PHARMACY'), validateBody(SaleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await sellUnit(req.body.unitId, req.user!.orgId, req.body.notes, req.user!.userId);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export { router as salesRouter };
