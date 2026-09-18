import accountRoutes from './account.routes';
import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getSessions,
} from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { authenticate } from '../middlewares/auth.middleware';
import { rateLimit } from '../middlewares/rateLimit.middleware';
import { requireTrustedOrigin } from '../middlewares/origin.middleware';

const router = Router();
router.use(accountRoutes);

router.post('/register', rateLimit('register', 10, 15 * 60_000), validate(registerSchema), register);
router.post('/login', rateLimit('login', 20, 15 * 60_000), validate(loginSchema), login);
router.post('/refresh-token', rateLimit('refresh', 60, 15 * 60_000), requireTrustedOrigin, refresh);
router.post('/logout', requireTrustedOrigin, logout);

// Protected Auth Endpoints
router.post('/logout-all', authenticate, requireTrustedOrigin, logoutAll);
router.get('/sessions', authenticate, getSessions);

export default router;
