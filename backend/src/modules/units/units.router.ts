import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { getUnit, getUnitQR } from './units.service';

const router = Router();

router.get('/:unitId', authenticate, authorize('MANUFACTURER', 'PHARMACY', 'REGULATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getUnit(req.params.unitId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

router.get('/:unitId/qr', authenticate, authorize('MANUFACTURER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getUnitQR(req.params.unitId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export { router as unitsRouter };
