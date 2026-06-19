import { AppError } from '../shared/errors.js';

export function assertSecurityPin(pin: string) {
  const expected = process.env.ADMIN_SECURITY_PIN;
  if (!expected) return;
  if (pin !== expected) {
    throw new AppError(400, 'INVALID_SECURITY_PIN', 'Invalid security PIN');
  }
}
