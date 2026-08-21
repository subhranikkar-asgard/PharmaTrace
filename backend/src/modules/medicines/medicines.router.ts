import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createMedicine, getMedicines } from './medicines.service';

const router = Router();

const CreateMedicineSchema = z.object({
  name: z.string().min(1),
  strength: z.string().min(1),
  form: z.string().min(1),
});

router.post('/', authenticate, authorize('MANUFACTURER'), validateBody(CreateMedicineSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await createMedicine(req.body.name, req.body.strength, req.body.form, req.user!.orgId);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

router.get('/', authenticate, authorize('MANUFACTURER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getMedicines(req.user!.orgId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export { router as medicinesRouter };
