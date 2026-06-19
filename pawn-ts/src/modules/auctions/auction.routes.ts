import { Router } from 'express';
import { z } from 'zod';
import { resolveBranchId } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';
import {
  createAuctionNoticeSchema,
  listAuctionsQuerySchema,
  recordSaleSchema,
  updateAuctionNoticeSchema,
} from './auction.schema.js';
import * as auctionService from './auction.service.js';

export const auctionRouter = Router();

function branchFromQuery(req: Parameters<typeof resolveBranchId>[0]) {
  const raw = req.query.branchId;
  return resolveBranchId(
    req,
    raw ? z.coerce.number().int().positive().parse(raw) : undefined
  );
}

auctionRouter.get('/eligible-loans', async (req, res, next) => {
  try {
    const branchId = branchFromQuery(req);
    const data = await auctionService.listEligibleLoans(branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

auctionRouter.get('/', async (req, res, next) => {
  try {
    const query = listAuctionsQuerySchema.parse(req.query);
    const branchId = branchFromQuery(req);
    const data = await auctionService.listAuctionNotices({ ...query, branchId });
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

auctionRouter.post('/', async (req, res, next) => {
  try {
    const body = createAuctionNoticeSchema.parse(req.body);
    const branchId = resolveBranchId(req, req.body.branchId);
    const data = await auctionService.createAuctionNotice(branchId, body);
    sendSuccess(res, data, 201);
  } catch (e) {
    next(e);
  }
});

auctionRouter.get('/:id/settlement', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const branchId = branchFromQuery(req);
    const data = await auctionService.getAuctionSettlementPreview(id, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

auctionRouter.post('/:id/sale', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const branchId = branchFromQuery(req);
    const body = recordSaleSchema.parse(req.body);
    const data = await auctionService.recordAuctionSale(id, branchId, body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

auctionRouter.post('/:id/refund-paid', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const branchId = branchFromQuery(req);
    const data = await auctionService.markRefundPaid(id, branchId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

auctionRouter.post('/:id/complete', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const branchId = branchFromQuery(req);
    const data = await auctionService.completeAuction(id, branchId, req.user?.sub);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

auctionRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const branchId = branchFromQuery(req);
    const body = updateAuctionNoticeSchema.parse(req.body);
    const data = await auctionService.updateAuctionNotice(id, branchId, body);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
