import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import {
  createUserSchema,
  loginSchema,
  setUserActiveSchema,
  updateUserSchema,
} from './auth.schema.js';
import * as authService from './auth.service.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const data = await authService.login(body.email, body.password);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const data = await authService.getMe(req.user!.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

authRouter.get('/roles', authenticate, requirePermission('users.write'), async (_req, res, next) => {
  try {
    const data = authService.listRoles();
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

authRouter.get('/users', authenticate, requirePermission('users.write'), async (_req, res, next) => {
  try {
    const data = await authService.listUsers();
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

authRouter.post('/users', authenticate, requirePermission('users.write'), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const data = await authService.createUser(body, req.user!.sub);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

authRouter.put('/users/:id', authenticate, requirePermission('users.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = updateUserSchema.parse(req.body);
    const data = await authService.updateUser(id, body, req.user!.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

authRouter.patch(
  '/users/:id/status',
  authenticate,
  requirePermission('users.write'),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const body = setUserActiveSchema.parse(req.body);
      const data = await authService.setUserActive(id, body.isActive, req.user!.sub);
      sendSuccess(res, data);
    } catch (e) {
      next(e);
    }
  }
);
