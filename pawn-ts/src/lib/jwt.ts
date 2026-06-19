import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AppUserRole } from './rbac.js';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '8h') as SignOptions['expiresIn'];

export interface JwtPayload {
  sub: number;
  email: string;
  role: AppUserRole;
  branchId: number | null;
  name: string;
}

export function signToken(payload: JwtPayload, expiresIn?: SignOptions['expiresIn']): string {
  return jwt.sign(payload, SECRET, { expiresIn: expiresIn ?? EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as unknown as JwtPayload;
}
