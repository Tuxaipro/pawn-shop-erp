import { Router } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../shared/response.js';
import * as commodityService from './commodity.service.js';

export const commodityRouter = Router();

const commodityQuery = z.object({
  commodityType: z.enum(['gold', 'silver']),
});

const subItemsQuery = commodityQuery.extend({
  subCategoryId: z.coerce.number().int().positive(),
});

commodityRouter.get('/sub-categories', async (req, res, next) => {
  try {
    const { commodityType } = commodityQuery.parse(req.query);
    const data = await commodityService.listSubCategories(commodityType);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

commodityRouter.get('/sub-items', async (req, res, next) => {
  try {
    const { commodityType, subCategoryId } = subItemsQuery.parse(req.query);
    const data = await commodityService.listSubItems(subCategoryId, commodityType);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
