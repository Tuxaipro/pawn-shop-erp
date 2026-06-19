import { Router } from 'express';
import { z } from 'zod';
import { processPendingNotifications } from '../../lib/notifications.js';
import { prisma } from '../../lib/prisma.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { sendSuccess } from '../../shared/response.js';

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get('/', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = z.coerce.number().int().positive().max(100).default(50).parse(req.query.limit);
    const rows = await prisma.notification.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdOn: 'desc' },
      take: limit,
    });
    sendSuccess(
      res,
      rows.map((n) => ({
        id: Number(n.id),
        channel: n.channel,
        language: n.language,
        recipient: n.recipient,
        subject: n.subject,
        body: n.body,
        status: n.status,
        templateKey: n.templateKey,
        createdOn: n.createdOn.toISOString(),
        sentOn: n.sentOn?.toISOString() ?? null,
      }))
    );
  } catch (e) {
    next(e);
  }
});

notificationRouter.get('/templates', async (_req, res, next) => {
  try {
    const rows = await prisma.notificationTemplate.findMany({ orderBy: { key: 'asc' } });
    sendSuccess(res, rows);
  } catch (e) {
    next(e);
  }
});

notificationRouter.post('/process', requirePermission('notifications.write'), async (_req, res, next) => {
  try {
    const data = await processPendingNotifications();
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
});
