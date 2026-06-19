import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission, resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import * as glService from './gl.service.js';

export const glRouter = Router();

glRouter.use(authenticate);

glRouter.get('/accounts', async (req, res, next) => {
  try {
    const branchId = resolveBranchId(
      req,
      req.query.branchId ? z.coerce.number().int().positive().parse(req.query.branchId) : undefined
    );
    const data = await glService.listAccounts(branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

glRouter.get('/journal', async (req, res, next) => {
  try {
    const branchId = resolveBranchId(
      req,
      req.query.branchId ? z.coerce.number().int().positive().parse(req.query.branchId) : undefined
    );
    const data = await glService.listJournalEntries(
      branchId,
      req.query.fromDate as string | undefined,
      req.query.toDate as string | undefined
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

glRouter.get('/trial-balance', async (req, res, next) => {
  try {
    const branchId = resolveBranchId(
      req,
      req.query.branchId ? z.coerce.number().int().positive().parse(req.query.branchId) : undefined
    );
    const data = await glService.trialBalance(branchId, req.query.asOf as string | undefined);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

glRouter.get('/sub-ledger', async (req, res, next) => {
  try {
    const branchId = resolveBranchId(
      req,
      req.query.branchId ? z.coerce.number().int().positive().parse(req.query.branchId) : undefined
    );
    const accountCode = z.string().min(1).parse(req.query.accountCode);
    const data = await glService.subLedger(
      branchId,
      accountCode,
      req.query.fromDate as string | undefined,
      req.query.toDate as string | undefined
    );
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

glRouter.post('/journal', requirePermission('gl.write'), async (req, res, next) => {
  try {
    const branchId = resolveBranchId(req, req.body.branchId);
    const body = z
      .object({
        entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().min(1),
        lines: z
          .array(
            z.object({
              accountCode: z.string(),
              debit: z.number().nonnegative().optional(),
              credit: z.number().nonnegative().optional(),
            })
          )
          .min(2),
      })
      .parse(req.body);
    const data = await glService.createManualEntry(
      branchId,
      body.entryDate,
      body.description,
      body.lines,
      req.user?.sub
    );
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});
