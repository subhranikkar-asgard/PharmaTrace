import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { recallBatch, getRecalls } from './recalls.service';

const router = Router();

const RecallSchema = z.object({
  batchId: z.string().min(1),
  reason: z.string().min(1),
});

router.post('/', authenticate, authorize('REGULATOR'), validateBody(RecallSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await recallBatch(req.body.batchId, req.body.reason, req.user!.userId, req.user!.userId);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

router.get('/', authenticate, authorize('REGULATOR', 'MANUFACTURER'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getRecalls();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export { router as recallsRouter };
