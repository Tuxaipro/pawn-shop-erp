import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';
import { accountsRouter } from '../modules/accounts/accounts.routes.js';
import { auditRouter } from '../modules/audit/audit.routes.js';
import { auctionRouter } from '../modules/auctions/auction.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { branchRouter } from '../modules/branches/branch.routes.js';
import { commodityRouter } from '../modules/commodities/commodity.routes.js';
import { customerRouter } from '../modules/customers/customer.routes.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js';
import { glRouter } from '../modules/gl/gl.routes.js';
import { interestRouter } from '../modules/interest/interest.routes.js';
import { inventoryRouter } from '../modules/inventory/inventory.routes.js';
import { investmentRouter } from '../modules/investments/investment.routes.js';
import { loanRouter } from '../modules/loans/loan.routes.js';
import { masterRouter } from '../modules/masters/master.routes.js';
import { notificationRouter } from '../modules/notifications/notification.routes.js';
import { payAdvanceRouter } from '../modules/pay-advances/pay-advance.routes.js';
import { renewalRouter } from '../modules/renewals/renewal.routes.js';
import { reportsRouter } from '../modules/reports/reports.routes.js';
import { repledgeRouter } from '../modules/repledges/repledge.routes.js';
import { settingsRouter } from '../modules/settings/settings.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', version: '2.0.0' } });
});

apiRouter.use('/auth', authRouter);

const protectedApi = Router();
protectedApi.use(authenticate);
protectedApi.use(auditMiddleware);

protectedApi.use('/dashboard', dashboardRouter);
protectedApi.use('/branches', branchRouter);
protectedApi.use('/settings', settingsRouter);
protectedApi.use('/audit-logs', auditRouter);
protectedApi.use('/customers', customerRouter);
protectedApi.use('/commodities', commodityRouter);
protectedApi.use('/masters', masterRouter);
protectedApi.use('/loans', loanRouter);
protectedApi.use('/interest', interestRouter);
protectedApi.use('/renewals', renewalRouter);
protectedApi.use('/repledges', repledgeRouter);
protectedApi.use('/auctions', auctionRouter);
protectedApi.use('/inventory', inventoryRouter);
protectedApi.use('/accounts', accountsRouter);
protectedApi.use('/reports', reportsRouter);
protectedApi.use('/investments', investmentRouter);
protectedApi.use('/pay-advances', payAdvanceRouter);
protectedApi.use('/gl', glRouter);
protectedApi.use('/notifications', notificationRouter);

apiRouter.use(protectedApi);
