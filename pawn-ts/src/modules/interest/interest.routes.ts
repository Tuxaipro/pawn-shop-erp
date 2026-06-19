import { Router } from 'express';
import { z } from 'zod';
import { resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import {
  createPartPaymentSchema,
  listPartPaymentsQuerySchema,
  loanIdParamSchema,
  partPaymentIdParamSchema,
  updatePartPaymentSchema,
} from './interest.schema.js';
import * as interestService from './interest.service.js';

export const interestRouter = Router();

function branchFromQuery(req: Parameters<typeof resolveBranchId>[0]) {
  const raw = req.query.branchId;
  return resolveBranchId(
    req,
    raw ? z.coerce.number().int().positive().parse(raw) : undefined
  );
}

interestRouter.get('/loan/:loanId', async (req, res, next) => {
  try {
    const { loanId } = loanIdParamSchema.parse(req.params);
    const branchId = branchFromQuery(req);
    const asOf = req.query.asOf as string | undefined;
    const data = await interestService.getLoanInterest(loanId, branchId, asOf);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

interestRouter.get('/part-payments', async (req, res, next) => {
  try {
    const query = listPartPaymentsQuerySchema.parse(req.query);
    const branchId = branchFromQuery(req);
    if (query.loanId) {
      const data = await interestService.listPartPayments(query.loanId, branchId);
      sendSuccess(res, data);
      return;
    }
    const data = await interestService.listBranchPartPayments(branchId, {
      page: query.page,
      limit: query.limit,
      fromDate: query.fromDate,
      toDate: query.toDate,
      search: query.search,
    });
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

interestRouter.put('/part-payments/:id', async (req, res, next) => {
  try {
    const { id } = partPaymentIdParamSchema.parse(req.params);
    const body = updatePartPaymentSchema.parse(req.body);
    const branchId = resolveBranchId(req, req.body.branchId);
    const data = await interestService.updatePartPayment(id, branchId, body.amount, body.payDate);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

interestRouter.delete('/part-payments/:id', async (req, res, next) => {
  try {
    const { id } = partPaymentIdParamSchema.parse(req.params);
    const branchId = branchFromQuery(req);
    const data = await interestService.deletePartPayment(id, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

interestRouter.post('/part-payments', async (req, res, next) => {
  try {
    const body = createPartPaymentSchema.parse(req.body);
    const branchId = resolveBranchId(req, req.body.branchId);
    const data = await interestService.createPartPayment(
      body.loanId,
      branchId,
      body.amount,
      body.payDate,
      req.user?.sub
    );
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});
