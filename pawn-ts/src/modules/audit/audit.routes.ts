import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/auth.js';
import { listAuditLogs } from '../../lib/audit.service.js';
import { sendSuccess } from '../../shared/response.js';

export const auditRouter = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  userId: z.coerce.number().int().positive().optional(),
  entity: z.string().max(100).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

auditRouter.get('/', requirePermission('users.write'), async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const data = await listAuditLogs(query);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
