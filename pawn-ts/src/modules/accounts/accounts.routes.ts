import { Router } from 'express';
import { z } from 'zod';
import { resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import {
  cashTransferSchema,
  closeDaySchema,
  createEntrySchema,
  listEntriesQuerySchema,
  openingBalanceSchema,
  shopBankDepositSchema,
} from './accounts.schema.js';
import * as accountsService from './accounts.service.js';

export const accountsRouter = Router();

function branchFromQuery(req: Parameters<typeof resolveBranchId>[0]) {
  const raw = req.query.branchId;
  return resolveBranchId(
    req,
    raw ? z.coerce.number().int().positive().parse(raw) : undefined
  );
}

accountsRouter.get('/entries', async (req, res, next) => {
  try {
    const query = listEntriesQuerySchema.parse(req.query);
    const branchId = branchFromQuery(req);
    const data = await accountsService.listEntries({ ...query, branchId });
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

accountsRouter.get('/summary', async (req, res, next) => {
  try {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
    const branchId = branchFromQuery(req);
    const data = await accountsService.getDailySummary(date, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

accountsRouter.get('/cash-position', async (req, res, next) => {
  try {
    const date = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .parse(req.query.date ?? new Date().toISOString().slice(0, 10));
    const branchId = branchFromQuery(req);
    const data = await accountsService.getDailyBalance(date, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

accountsRouter.get('/transfers', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const data = await accountsService.listTransfers(branchId, fromDate, toDate);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

accountsRouter.get('/ledger', async (req, res, next) => {
  try {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
    const branchId = branchFromQuery(req);
    const data = await accountsService.getUnifiedLedger(date, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

accountsRouter.post('/entries', async (req, res, next) => {
  try {
    const body = createEntrySchema.parse(req.body);
    const branchId = resolveBranchId(req, body.branchId);
    const data = await accountsService.createEntry({ ...body, branchId }, req.user?.sub);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

accountsRouter.post('/opening-balance', async (req, res, next) => {
  try {
    const body = openingBalanceSchema.parse(req.body);
    const branchId = resolveBranchId(req, body.branchId);
    const data = await accountsService.setOpeningBalance(branchId, body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

accountsRouter.post('/close-day', async (req, res, next) => {
  try {
    const body = closeDaySchema.parse(req.body);
    const branchId = resolveBranchId(req, body.branchId);
    const data = await accountsService.closeDay(branchId, body, req.user?.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

accountsRouter.post('/transfers', async (req, res, next) => {
  try {
    const body = cashTransferSchema.parse(req.body);
    const branchId = resolveBranchId(req, body.branchId);
    const data = await accountsService.createTransfer(branchId, body, req.user?.sub);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

accountsRouter.get('/shop-deposits', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const data = await accountsService.listShopBankDeposits(branchId, fromDate, toDate);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

accountsRouter.post('/shop-deposits', async (req, res, next) => {
  try {
    const body = shopBankDepositSchema.parse(req.body);
    const branchId = resolveBranchId(req, body.branchId);
    const data = await accountsService.createShopBankDeposit(branchId, body, req.user?.sub);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});
