import { Router } from 'express';
import { z } from 'zod';
import { resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import {
  batchBankDepositSchema,
  createBankDepositSchema,
  listBankDepositsQuerySchema,
  settleBankDepositSchema,
} from './repledge.schema.js';
import * as repledgeService from './repledge.service.js';

export const repledgeRouter = Router();

function branchFromQuery(req: Parameters<typeof resolveBranchId>[0]) {
  const raw = req.query.branchId;
  return resolveBranchId(
    req,
    raw ? z.coerce.number().int().positive().parse(raw) : undefined
  );
}

repledgeRouter.get('/eligible-loans', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const search = req.query.search as string | undefined;
    const page = z.coerce.number().int().positive().default(1).parse(req.query.page);
    const limit = z.coerce.number().int().positive().max(50).default(20).parse(req.query.limit);
    const data = await repledgeService.listEligibleLoans(branchId, search, page, limit);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

repledgeRouter.get('/', async (req, res, next) => {
  try {
    const query = listBankDepositsQuerySchema.parse(req.query);
    const branchId = branchFromQuery(req);
    const data = await repledgeService.listBankDeposits({ ...query, branchId });
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

repledgeRouter.post('/batch', async (req, res, next) => {
  try {
    const body = batchBankDepositSchema.parse(req.body);
    const branchId = resolveBranchId(req, req.body.branchId);
    const data = await repledgeService.createBankDepositBatch(body, branchId, req.user?.sub);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

repledgeRouter.post('/', async (req, res, next) => {
  try {
    const body = createBankDepositSchema.parse(req.body);
    const branchId = resolveBranchId(req, req.body.branchId);
    const data = await repledgeService.createBankDeposit(body, branchId, req.user?.sub);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

repledgeRouter.post('/:id/settle', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const branchId = branchFromQuery(req);
    const body = settleBankDepositSchema.parse(req.body);
    const data = await repledgeService.settleBankDeposit(
      id,
      branchId,
      body.closingDate,
      body.securityPin,
      req.user?.sub
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
