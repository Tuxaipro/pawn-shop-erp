import { Router } from 'express';
import { z } from 'zod';
import { resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import * as dashboardService from './dashboard.service.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    const branchId = resolveBranchId(
      req,
      req.query.branchId ? z.coerce.number().int().positive().parse(req.query.branchId) : undefined
    );
    const includeAllBranches = req.user?.role === 'SUPER_ADMIN';
    const includeBranchRow =
      includeAllBranches || req.user?.role === 'BRANCH_MANAGER' || req.user?.role === 'ACCOUNTANT';
    const data = await dashboardService.getDashboardSummary(branchId, {
      includeAllBranches,
      includeBranchRow,
    });
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
