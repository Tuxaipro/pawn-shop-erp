import type { NextFunction, Request, Response } from 'express';
import { logAudit } from '../lib/audit.service.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function entityFromPath(path: string): string {
  const segment = path.replace(/^\/api\/v1\/?/, '').split('/')[0];
  return segment || 'unknown';
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode < 400 && req.user) {
      const entity = entityFromPath(req.originalUrl ?? req.path);
      void logAudit(req.user.sub, req.method, entity, undefined, {
        path: req.originalUrl ?? req.path,
        method: req.method,
        body: sanitizeBody(req.body),
      }).catch(() => {});
    }
    return originalJson(body);
  };

  next();
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const copy = { ...(body as Record<string, unknown>) };
  if ('password' in copy) copy.password = '[redacted]';
  if ('passwordHash' in copy) copy.passwordHash = '[redacted]';
  return copy;
}
