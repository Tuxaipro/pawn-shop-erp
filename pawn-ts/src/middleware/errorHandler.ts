import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors.js';
import { sendError } from '../shared/response.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }
  if (err instanceof ZodError) {
    return sendError(res, 422, 'VALIDATION_ERROR', 'Validation failed', err.flatten().fieldErrors);
  }
  console.error(err);
  return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
