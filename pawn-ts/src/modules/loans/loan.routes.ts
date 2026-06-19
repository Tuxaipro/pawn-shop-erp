import { Router } from 'express';
import { z } from 'zod';
import { resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import * as commodityService from '../commodities/commodity.service.js';
import {
  calculateInterestQuerySchema,
  checkInvoiceQuerySchema,
  createLoanSchema,
  deleteLoanSchema,
  listLoansQuerySchema,
  updateLoanSchema,
} from './loan.schema.js';
import * as loanService from './loan.service.js';
import * as reloanService from './reloan.service.js';

export const loanRouter = Router();

function branchFromQuery(req: Parameters<typeof resolveBranchId>[0]) {
  const raw = req.query.branchId;
  return resolveBranchId(
    req,
    raw ? z.coerce.number().int().positive().parse(raw) : undefined
  );
}

loanRouter.get('/reloan/:customerId', async (req, res, next) => {
  try {
    const customerId = Number(req.params.customerId);
    const branchId = branchFromQuery(req);
    const data = await reloanService.getReloanContext(customerId, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

loanRouter.post('/reloan', async (req, res, next) => {
  try {
    const body = createLoanSchema.parse(req.body);
    const branchId = resolveBranchId(req, req.body.branchId);
    const data = await reloanService.createReloan(body, branchId, req.user?.sub);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

loanRouter.get('/form-options', async (req, res, next) => {
  try {
    const commodityType = req.query.commodityType as 'gold' | 'silver' | undefined;
    const data = await commodityService.getFormOptions(commodityType);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

loanRouter.get('/calculate-interest', async (req, res, next) => {
  try {
    const query = calculateInterestQuerySchema.parse(req.query);
    const branchId = branchFromQuery(req);
    const data = await loanService.calculateInterest(
      query.loanAmount,
      query.commodityType,
      query.loanCustomerType,
      branchId
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

loanRouter.get('/check-invoice/:invoiceNo', async (req, res, next) => {
  try {
    const invoiceNo = Number(req.params.invoiceNo);
    const branchId = branchFromQuery(req);
    const { excludeLoanId } = checkInvoiceQuerySchema.parse(req.query);
    const data = await loanService.checkInvoice(invoiceNo, branchId, excludeLoanId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

loanRouter.get('/', async (req, res, next) => {
  try {
    const query = listLoansQuerySchema.parse(req.query);
    const branchId = branchFromQuery(req);
    const data = await loanService.listLoans({ ...query, branchId });
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

loanRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const branchId = branchFromQuery(req);
    const data = await loanService.getLoanById(id, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

loanRouter.post('/', async (req, res, next) => {
  try {
    const body = createLoanSchema.parse(req.body);
    const branchId = resolveBranchId(req, req.body.branchId);
    const data = await loanService.createLoan(body, branchId, req.user?.sub);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

loanRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = updateLoanSchema.parse(req.body);
    const branchId = resolveBranchId(req, req.body.branchId);
    const data = await loanService.updateLoan(id, body, branchId, req.user?.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

loanRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = deleteLoanSchema.parse(req.body);
    const branchId = branchFromQuery(req);
    const data = await loanService.deleteLoan(id, body.securityPin, branchId, req.user?.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
