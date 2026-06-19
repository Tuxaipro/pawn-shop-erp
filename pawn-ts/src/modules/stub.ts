import { Router } from 'express';
import { sendError } from '../shared/response.js';

export function createStubRouter(moduleName: string): Router {
  const router = Router();
  router.use((_req, res) => {
    sendError(res, 501, 'NOT_IMPLEMENTED', `${moduleName} module is not yet implemented`);
  });
  return router;
}
