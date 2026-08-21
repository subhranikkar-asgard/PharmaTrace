import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { prisma } from '../../db';

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.organization.findMany({
      select: { id: true, name: true, type: true, city: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export { router as organizationsRouter };
