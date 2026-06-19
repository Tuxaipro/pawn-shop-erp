import { describe, expect, it } from 'vitest';
import { hasPermission } from '../src/lib/rbac.js';

describe('RBAC', () => {
  it('grants super admin all permissions', () => {
    expect(hasPermission('SUPER_ADMIN', 'users.write')).toBe(true);
    expect(hasPermission('SUPER_ADMIN', 'gl.write')).toBe(true);
  });

  it('restricts cashier from GL write', () => {
    expect(hasPermission('CASHIER', 'gl.write')).toBe(false);
    expect(hasPermission('CASHIER', 'loans.write')).toBe(true);
  });

  it('allows accountant GL access', () => {
    expect(hasPermission('ACCOUNTANT', 'gl.write')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'loans.write')).toBe(false);
  });
});
