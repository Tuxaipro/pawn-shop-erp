import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission, resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import * as payAdvanceService from './pay-advance.service.js';

export const payAdvanceRouter = Router();

payAdvanceRouter.use(authenticate);

payAdvanceRouter.get('/', async (req, res, next) => {
  try {
    const branchId = resolveBranchId(
      req,
      req.query.branchId ? z.coerce.number().int().positive().parse(req.query.branchId) : undefined
    );
    const status = req.query.status as string | undefined;
    const data = await payAdvanceService.listPayAdvances(branchId, status);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

payAdvanceRouter.post('/', requirePermission('pay_advance.write'), async (req, res, next) => {
  try {
    const branchId = resolveBranchId(req, req.body.branchId);
    const body = z
      .object({
        advanceType: z.enum(['employee', 'vendor', 'customer']),
        partyName: z.string().min(1),
        amount: z.number().positive(),
        advanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        purpose: z.string().optional(),
      })
      .parse(req.body);
    const data = await payAdvanceService.createPayAdvance(branchId, body, req.user?.sub);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

payAdvanceRouter.post('/:id/settle', requirePermission('pay_advance.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { settleAmount } = z.object({ settleAmount: z.number().positive() }).parse(req.body);
    const data = await payAdvanceService.settlePayAdvance(id, settleAmount);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

payAdvanceRouter.get('/:id/recoveries', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await payAdvanceService.getRecoveries(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
