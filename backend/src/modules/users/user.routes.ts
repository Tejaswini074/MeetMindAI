import { Router } from 'express';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validate.middleware';
import { GlobalRole } from '@prisma/client';
import {
  getMe,
  getUserById,
  updateProfile,
  listUsers,
  registerDeviceToken,
} from '@modules/users/user.controller';
import {
  updateProfileSchema,
  listUsersSchema,
  registerDeviceTokenSchema,
} from '@modules/users/user.dto';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Get the current authenticated user's profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/me', getMe);

/**
 * @openapi
 * /users/me:
 *   patch:
 *     summary: Update the current user's profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.patch('/me', validate(updateProfileSchema), updateProfile);

/**
 * @openapi
 * /users/me/device-token:
 *   post:
 *     summary: Register a device token for push notifications
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/me/device-token', validate(registerDeviceTokenSchema), registerDeviceToken);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List users (admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/', authorize(GlobalRole.ADMIN), validate(listUsersSchema), listUsers);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a user by id
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/:id', getUserById);

export default router;
