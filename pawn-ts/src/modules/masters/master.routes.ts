import { Router } from 'express';
import { z } from 'zod';
import { requirePermission, resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import {
  categoryBodySchema,
  categoryUpdateSchema,
  interestRateUpdateSchema,
  listSlabsQuery,
  listSubCategoriesQuery,
  listSubItemsQuery,
  nextMinQuery,
  slabBodySchema,
  subCategoryBodySchema,
  subCategoryUpdateSchema,
  subItemBodySchema,
  subItemUpdateSchema,
} from './master.schema.js';
import * as masterService from './master.service.js';
import * as employeeService from './employee.service.js';
import { employeeBodySchema, employeeUpdateSchema } from './employee.schema.js';

export const masterRouter = Router();

function branchFromQuery(req: Parameters<typeof resolveBranchId>[0]) {
  const raw = req.query.branchId;
  return resolveBranchId(
    req,
    raw ? z.coerce.number().int().positive().parse(raw) : undefined
  );
}

// ─── Commodity Category ─────────────────────────────────────────────────────

masterRouter.get('/categories', async (_req, res, next) => {
  try {
    const data = await masterService.listCategories(true);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.post('/categories', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const body = categoryBodySchema.parse(req.body);
    const data = await masterService.createCategory(body);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

masterRouter.put('/categories/:id', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = categoryUpdateSchema.parse(req.body);
    const data = await masterService.updateCategory(id, body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.patch('/categories/:id/status', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await masterService.toggleCategoryStatus(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.delete('/categories/:id', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await masterService.deleteCategory(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

// ─── Commodity Sub Category ─────────────────────────────────────────────────

masterRouter.get('/sub-categories', async (req, res, next) => {
  try {
    const query = listSubCategoriesQuery.parse(req.query);
    const data = await masterService.listSubCategories(query);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.post('/sub-categories', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const body = subCategoryBodySchema.parse(req.body);
    const data = await masterService.createSubCategory(body.commodityTypeId, body);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

masterRouter.put('/sub-categories/:id', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = subCategoryUpdateSchema.parse(req.body);
    const data = await masterService.updateSubCategory(id, body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.patch('/sub-categories/:id/status', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await masterService.toggleSubCategoryStatus(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.delete('/sub-categories/:id', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await masterService.deleteSubCategory(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

// ─── Commodity Sub Item ─────────────────────────────────────────────────────

masterRouter.get('/sub-items', async (req, res, next) => {
  try {
    const query = listSubItemsQuery.parse(req.query);
    const data = await masterService.listSubItems(query);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.post('/sub-items', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const body = subItemBodySchema.parse(req.body);
    const data = await masterService.createSubItem(
      body.commodityTypeId,
      body.subCategoryId,
      body
    );
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

masterRouter.put('/sub-items/:id', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = subItemUpdateSchema.parse(req.body);
    const data = await masterService.updateSubItem(id, body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.patch('/sub-items/:id/status', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await masterService.toggleSubItemStatus(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.delete('/sub-items/:id', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await masterService.deleteSubItem(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

// ─── Interest Declaration ───────────────────────────────────────────────────

masterRouter.get('/interest-declarations', async (req, res, next) => {
  try {
    const { commodityTypeId } = listSlabsQuery.parse(req.query);
    const branchId = branchFromQuery(req);
    const data = await masterService.listSlabs(branchId, commodityTypeId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.get('/interest-declarations/next-min', async (req, res, next) => {
  try {
    const { commodityTypeId } = nextMinQuery.parse(req.query);
    const branchId = branchFromQuery(req);
    const data = await masterService.getNextMinAmount(branchId, commodityTypeId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.post('/interest-declarations', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const body = slabBodySchema.parse(req.body);
    const branchId = resolveBranchId(req, req.body.branchId);
    const data = await masterService.createSlab({ ...body, branchId });
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

masterRouter.put('/interest-declarations/:id', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const branchId = branchFromQuery(req);
    const body = interestRateUpdateSchema.parse(req.body);
    const data = await masterService.updateInterestRates(id, branchId, body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

// ─── Employees ────────────────────────────────────────────────────────────

masterRouter.get('/employees', async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const data = await employeeService.listEmployees(includeInactive);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.post('/employees', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const body = employeeBodySchema.parse(req.body);
    const data = await employeeService.createEmployee(body);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

masterRouter.put('/employees/:id', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = employeeUpdateSchema.parse(req.body);
    const data = await employeeService.updateEmployee(id, body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.patch('/employees/:id/status', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await employeeService.toggleEmployeeStatus(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

masterRouter.delete('/employees/:id', requirePermission('masters.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await employeeService.deleteEmployee(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
