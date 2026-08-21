import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// Routers
import { authRouter } from './modules/auth/auth.router';
import { medicinesRouter } from './modules/medicines/medicines.router';
import { batchesRouter } from './modules/batches/batches.router';
import { unitsRouter } from './modules/units/units.router';
import { transfersRouter } from './modules/transfers/transfers.router';
import { organizationsRouter } from './modules/organizations/organizations.router';
import { verificationRouter } from './modules/verification/verification.router';
import { salesRouter } from './modules/sales/sales.router';
import { recallsRouter } from './modules/recalls/recalls.router';
import { alertsRouter } from './modules/alerts/alerts.router';
import { auditRouter } from './modules/audit/audit.router';
import { prisma } from './db';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
// CORS — allow all origins for hackathon demo (restrict in production)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://frontend-pearl-theta-17.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Also allow any vercel.app subdomain for preview deployments
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    return callback(null, true); // open for hackathon
  },
  credentials: true,
}));
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/medicines', medicinesRouter);
app.use('/api/v1/batches', batchesRouter);
app.use('/api/v1/units', unitsRouter);
app.use('/api/v1/transfers', transfersRouter);
app.use('/api/v1/organizations', organizationsRouter);
app.use('/api/v1/verify', verificationRouter);
app.use('/api/v1/sales', salesRouter);
app.use('/api/v1/recalls', recallsRouter);
app.use('/api/v1/alerts', alertsRouter);
app.use('/api/v1/audit', auditRouter);

// ─── Stats (inline — simple enough) ──────────────────────────────────────────
import { authenticate, authorize } from './middleware/auth';
import { Request, Response, NextFunction } from 'express';

app.get('/api/v1/stats', authenticate, authorize('REGULATOR'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [totalUnits, totalVerifications, suspiciousEvents, activeRecalls, criticalAlerts] =
        await Promise.all([
          prisma.medicineUnit.count(),
          prisma.scanEvent.count(),
          prisma.fraudAlert.count({ where: { resolvedAt: null } }),
          prisma.recall.count(),
          prisma.fraudAlert.count({ where: { riskLevel: 'CRITICAL', resolvedAt: null } }),
        ]);
      res.json({ success: true, data: { totalUnits, totalVerifications, suspiciousEvents, activeRecalls, criticalAlerts } });
    } catch (err) { next(err); }
  }
);

// ─── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`✅ PharmaTrace API running on http://localhost:${config.port}`);
  console.log(`   Frontend URL: ${config.frontendUrl}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
