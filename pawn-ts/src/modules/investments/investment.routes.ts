import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission, resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import * as investmentService from './investment.service.js';

export const investmentRouter = Router();

investmentRouter.use(authenticate);

investmentRouter.get('/', async (req, res, next) => {
  try {
    const branchId = resolveBranchId(
      req,
      req.query.branchId ? z.coerce.number().int().positive().parse(req.query.branchId) : undefined
    );
    const data = await investmentService.listInvestments(branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

investmentRouter.get('/summary', async (req, res, next) => {
  try {
    const branchId = resolveBranchId(
      req,
      req.query.branchId ? z.coerce.number().int().positive().parse(req.query.branchId) : undefined
    );
    const data = await investmentService.getSummary(branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

investmentRouter.post('/', requirePermission('investments.write'), async (req, res, next) => {
  try {
    const branchId = resolveBranchId(req, req.body.branchId);
    const body = z
      .object({
        investorType: z.enum(['owner', 'partner', 'other']),
        investorName: z.string().min(1),
        amount: z.number().positive(),
        investmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        purpose: z.string().optional(),
        profitSharePct: z.number().min(0).max(100).optional(),
      })
      .parse(req.body);
    const data = await investmentService.createInvestment(branchId, body, req.user?.sub);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

investmentRouter.post('/:id/withdraw', requirePermission('investments.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await investmentService.withdrawInvestment(id, req.user?.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

investmentRouter.get('/:id/ledger', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await investmentService.getInvestmentLedger(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

investmentRouter.post('/:id/profit-share', requirePermission('investments.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = z
      .object({
        amount: z.number().positive(),
        txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().optional(),
      })
      .parse(req.body);
    const data = await investmentService.recordProfitShare(id, body);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});
