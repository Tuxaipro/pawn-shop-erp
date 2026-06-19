import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import { createBranchSchema, updateBranchSchema } from './branch.schema.js';
import * as branchService from './branch.service.js';

export const branchRouter = Router();

branchRouter.use(authenticate);

branchRouter.get('/', async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const data = await branchService.listBranches(!includeInactive);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

branchRouter.post('/', requirePermission('branches.write'), async (req, res, next) => {
  try {
    const body = createBranchSchema.parse(req.body);
    const data = await branchService.createBranch(body);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

branchRouter.put('/:id', requirePermission('branches.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = updateBranchSchema.parse(req.body);
    const data = await branchService.updateBranch(id, body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
