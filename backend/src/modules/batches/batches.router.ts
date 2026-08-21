import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createBatch, getBatches, getBatchById, getAllBatches, deleteBatch } from './batches.service';

const router = Router();

const CreateBatchSchema = z.object({
  medicineId: z.string().min(1),
  batchNumber: z.string().min(1),
  quantity: z.number().int().min(1).max(10000),
  manufactureDate: z.string(),
  expiryDate: z.string(),
});

router.post('/', authenticate, authorize('MANUFACTURER'), validateBody(CreateBatchSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await createBatch(
        req.body.medicineId, req.body.batchNumber, req.body.quantity,
        req.body.manufactureDate, req.body.expiryDate,
        req.user!.orgId, req.user!.userId
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

router.get('/', authenticate, authorize('MANUFACTURER', 'REGULATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isRegulator = req.user!.role === 'REGULATOR';
      const data = isRegulator ? await getAllBatches() : await getBatches(req.user!.orgId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

router.get('/:batchId', authenticate, authorize('MANUFACTURER', 'REGULATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getBatchById(req.params.batchId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

router.delete('/:batchId', authenticate, authorize('MANUFACTURER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await deleteBatch(req.params.batchId, req.user!.orgId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export { router as batchesRouter };
