import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';
import { hasPermission, type Permission } from '../lib/rbac.js';
import { AppError } from '../shared/errors.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    next(new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token'));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(header.slice(7));
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    if (!hasPermission(req.user.role, permission)) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }
    next();
  };
}

export function resolveBranchId(req: Request, queryBranchId?: number): number {
  if (req.user?.role === 'SUPER_ADMIN' && queryBranchId) return queryBranchId;
  if (req.user?.branchId) return req.user.branchId;
  return queryBranchId ?? 1;
}
