import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { loginService, getMeService } from './auth.service';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/v1/auth/login
router.post('/login', validateBody(LoginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await loginService(req.body.email, req.body.password);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getMeService(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export { router as authRouter };
