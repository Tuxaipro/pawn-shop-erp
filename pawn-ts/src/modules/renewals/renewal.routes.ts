import { Router } from 'express';
import { z } from 'zod';
import { resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import { closeLoanSchema, markDefaultSchema, renewLoanSchema } from './renewal.schema.js';
import * as renewalService from './renewal.service.js';

export const renewalRouter = Router();

function branchFromQuery(req: Parameters<typeof resolveBranchId>[0]) {
  const raw = req.query.branchId;
  return resolveBranchId(
    req,
    raw ? z.coerce.number().int().positive().parse(raw) : undefined
  );
}

renewalRouter.get('/defaults', async (req, res, next) => {
  try {
    const page = z.coerce.number().int().positive().default(1).parse(req.query.page);
    const limit = z.coerce.number().int().positive().max(100).default(20).parse(req.query.limit);
    const branchId = branchFromQuery(req);
    const data = await renewalService.listDefaultLoans(branchId, page, limit);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

renewalRouter.get('/preview/:loanId', async (req, res, next) => {
  try {
    const loanId = Number(req.params.loanId);
    const branchId = branchFromQuery(req);
    const asOf = req.query.asOf as string | undefined;
    const data = await renewalService.getSettlementPreview(loanId, branchId, asOf);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

renewalRouter.post('/:loanId/close', async (req, res, next) => {
  try {
    const loanId = Number(req.params.loanId);
    const branchId = branchFromQuery(req);
    const body = closeLoanSchema.parse(req.body);
    const data = await renewalService.closeLoan(
      loanId,
      branchId,
      body.settledAmount,
      body.loanSettledDate,
      body.securityPin,
      body.interestDisAmt
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

renewalRouter.post('/:loanId/renew', async (req, res, next) => {
  try {
    const loanId = Number(req.params.loanId);
    const branchId = branchFromQuery(req);
    const body = renewLoanSchema.parse(req.body);
    const data = await renewalService.renewLoan(loanId, branchId, body, body.securityPin);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

renewalRouter.patch('/:loanId/default', async (req, res, next) => {
  try {
    const loanId = Number(req.params.loanId);
    const branchId = branchFromQuery(req);
    const body = markDefaultSchema.parse(req.body);
    const data = await renewalService.setDefaultStatus(loanId, branchId, body.defaultStatus);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
