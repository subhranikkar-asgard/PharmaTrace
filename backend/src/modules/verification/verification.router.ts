import { Router, Request, Response, NextFunction } from 'express';
import { verifyUnit } from './verification.service';

const router = Router();

// GET /api/v1/verify/:unitId — PUBLIC, no authentication required
router.get('/:unitId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const data = await verifyUnit(
      req.params.unitId,
      lat,
      lng,
      req.ip,
      req.headers['user-agent']
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export { router as verificationRouter };
