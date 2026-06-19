import { Router } from 'express';
import { z } from 'zod';
import { resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import * as reportsService from './reports.service.js';

export const reportsRouter = Router();

function branchFromQuery(req: Parameters<typeof resolveBranchId>[0]) {
  const raw = req.query.branchId;
  return resolveBranchId(
    req,
    raw ? z.coerce.number().int().positive().parse(raw) : undefined
  );
}

reportsRouter.get('/loan-register', async (req, res, next) => {
  try {
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const settlementStatus = req.query.settlementStatus
      ? z.coerce.number().int().min(0).max(2).parse(req.query.settlementStatus)
      : undefined;
    const branchId = branchFromQuery(req);
    const data = await reportsService.loanRegisterReport({
      fromDate,
      toDate,
      settlementStatus,
      branchId,
    });
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/overdue', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const data = await reportsService.overdueReport(branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/bank-deposits', async (req, res, next) => {
  try {
    const isSettled =
      req.query.isSettled === 'true'
        ? true
        : req.query.isSettled === 'false'
          ? false
          : undefined;
    const branchId = branchFromQuery(req);
    const data = await reportsService.bankDepositReport(branchId, isSettled);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/pay-advance', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const data = await reportsService.payAdvanceReport(branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/investment-ledger', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const data = await reportsService.investmentLedgerReport(branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/daily-book', async (req, res, next) => {
  try {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
    const branchId = branchFromQuery(req);
    const data = await reportsService.dailyBookReport(date, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/collections', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const data = await reportsService.collectionsReport(
      branchId,
      req.query.fromDate as string | undefined,
      req.query.toDate as string | undefined
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/renewals', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const data = await reportsService.renewalsReport(
      branchId,
      req.query.fromDate as string | undefined,
      req.query.toDate as string | undefined
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/interest', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const data = await reportsService.interestReport(
      branchId,
      req.query.fromDate as string | undefined,
      req.query.toDate as string | undefined
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/auctions', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const data = await reportsService.auctionReport(
      branchId,
      req.query.fromDate as string | undefined,
      req.query.toDate as string | undefined
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/monthly-profit', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const year = req.query.year ? z.coerce.number().int().parse(req.query.year) : undefined;
    const month = req.query.month ? z.coerce.number().int().min(1).max(12).parse(req.query.month) - 1 : undefined;
    const data = await reportsService.monthlyProfitReport(branchId, year, month);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

reportsRouter.get('/customer-growth', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const data = await reportsService.customerGrowthReport(
      branchId,
      req.query.fromDate as string | undefined,
      req.query.toDate as string | undefined
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
