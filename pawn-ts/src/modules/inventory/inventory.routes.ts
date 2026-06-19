import { Router } from 'express';
import { z } from 'zod';
import { resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import { searchStockQuerySchema } from './inventory.schema.js';
import * as inventoryService from './inventory.service.js';

export const inventoryRouter = Router();

function branchFromQuery(req: Parameters<typeof resolveBranchId>[0]) {
  const raw = req.query.branchId;
  return resolveBranchId(
    req,
    raw ? z.coerce.number().int().positive().parse(raw) : undefined
  );
}

inventoryRouter.get('/search', async (req, res, next) => {
  try {
    const query = searchStockQuerySchema.parse(req.query);
    const branchId = branchFromQuery(req);
    const data = await inventoryService.searchStock({ ...query, branchId });
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/stock', async (req, res, next) => {
  try {
    const invoiceNo = z.coerce.number().int().positive().parse(req.query.invoiceNo);
    const branchId = branchFromQuery(req);
    const data = await inventoryService.checkStockByInvoice(invoiceNo, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/overdue', async (req, res, next) => {
  try {
    const page = z.coerce.number().int().positive().default(1).parse(req.query.page);
    const limit = z.coerce.number().int().positive().max(100).default(20).parse(req.query.limit);
    const branchId = branchFromQuery(req);
    const data = await inventoryService.listOverdueInventory(branchId, page, limit);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/barcode', async (req, res, next) => {
  try {
    const code = z.string().min(1).parse(req.query.code);
    const branchId = branchFromQuery(req);
    const data = await inventoryService.searchByBarcode(code, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

inventoryRouter.patch('/items/:itemId/meta', async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    const branchId = branchFromQuery(req);
    const body = z
      .object({
        barcode: z.string().max(50).optional(),
        qrCode: z.string().max(100).optional(),
        location: z.string().max(100).optional(),
        lockerNo: z.string().max(50).optional(),
        photoUrl: z.string().max(500).optional(),
        itemStatus: z.enum(['lost', 'damaged', 'transferred']).optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(req.body);
    const data = await inventoryService.updateItemMeta(itemId, branchId, body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

inventoryRouter.get('/:loanId', async (req, res, next) => {
  try {
    const loanId = Number(req.params.loanId);
    const branchId = branchFromQuery(req);
    const data = await inventoryService.getLoanInventoryDetail(loanId, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
