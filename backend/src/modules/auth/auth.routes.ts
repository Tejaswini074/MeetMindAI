import { Router } from 'express';
import { validate } from '@middlewares/validate.middleware';
import { authenticate } from '@middlewares/auth.middleware';
import { authRateLimiter } from '@middlewares/rateLimiter.middleware';
import { register, login, refresh, logout } from '@modules/auth/auth.controller';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '@modules/auth/auth.dto';

const router = Router();

router.use(authRateLimiter);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Created }
 */
router.post('/register', validate(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.post('/login', validate(loginSchema), login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Exchange a refresh token for a new access/refresh token pair
 *     tags: [Auth]
 *     responses:
 *       200: { description: OK }
 */
router.post('/refresh', validate(refreshSchema), refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke a refresh token
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/logout', authenticate, validate(logoutSchema), logout);

export default router;
