import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { prisma } from '../../db';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

router.get('/', authenticate, authorize('REGULATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { riskLevel, resolved, limit = '50', offset = '0' } = req.query as Record<string, string>;
      const where: Record<string, unknown> = {};
      if (riskLevel) where.riskLevel = riskLevel;
      if (resolved === 'false') where.resolvedAt = null;
      if (resolved === 'true') where.resolvedAt = { not: null };

      const alerts = await prisma.fraudAlert.findMany({
        where,
        include: {
          unit: {
            include: {
              batch: { include: { medicine: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      const data = alerts.map(a => ({
        ...a,
        reasons: JSON.parse(a.reasons as string),
      }));

      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

router.get('/:alertId', authenticate, authorize('REGULATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.fraudAlert.findUnique({
        where: { id: req.params.alertId },
        include: { unit: { include: { batch: { include: { medicine: true } } } } },
      });
      if (!alert) throw new AppError(404, 'UNIT_NOT_FOUND', 'Alert not found.');
      res.json({ success: true, data: { ...alert, reasons: JSON.parse(alert.reasons as string) } });
    } catch (err) { next(err); }
  }
);

router.patch('/:alertId/resolve', authenticate, authorize('REGULATOR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.fraudAlert.update({
        where: { id: req.params.alertId },
        data: { resolvedAt: new Date() },
      });
      res.json({ success: true, data: { id: alert.id, resolvedAt: alert.resolvedAt } });
    } catch (err) { next(err); }
  }
);

export { router as alertsRouter };
