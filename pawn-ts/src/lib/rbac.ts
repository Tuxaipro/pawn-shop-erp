export type AppUserRole =
  | 'SUPER_ADMIN'
  | 'BRANCH_MANAGER'
  | 'CASHIER'
  | 'APPRAISER'
  | 'ACCOUNTANT'
  | 'AUDITOR';

export type Permission =
  | 'dashboard.read'
  | 'customers.read'
  | 'customers.write'
  | 'loans.read'
  | 'loans.write'
  | 'interest.write'
  | 'renewals.write'
  | 'repledges.write'
  | 'auctions.write'
  | 'inventory.read'
  | 'accounts.write'
  | 'reports.read'
  | 'branches.write'
  | 'users.write'
  | 'investments.write'
  | 'gl.write'
  | 'notifications.write'
  | 'pay_advance.write'
  | 'masters.read'
  | 'masters.write';

const ROLE_PERMISSIONS: Record<AppUserRole, Permission[] | ['*']> = {
  SUPER_ADMIN: ['*'],
  BRANCH_MANAGER: [
    'dashboard.read',
    'customers.read',
    'customers.write',
    'loans.read',
    'loans.write',
    'interest.write',
    'renewals.write',
    'repledges.write',
    'auctions.write',
    'inventory.read',
    'accounts.write',
    'reports.read',
    'investments.write',
    'gl.write',
    'notifications.write',
    'pay_advance.write',
    'masters.read',
    'masters.write',
  ],
  CASHIER: [
    'dashboard.read',
    'customers.read',
    'customers.write',
    'loans.read',
    'loans.write',
    'interest.write',
    'renewals.write',
    'inventory.read',
    'accounts.write',
    'reports.read',
    'notifications.write',
    'masters.read',
  ],
  APPRAISER: [
    'dashboard.read',
    'customers.read',
    'loans.read',
    'loans.write',
    'inventory.read',
    'masters.read',
  ],
  ACCOUNTANT: [
    'dashboard.read',
    'customers.read',
    'loans.read',
    'accounts.write',
    'reports.read',
    'investments.write',
    'gl.write',
    'pay_advance.write',
    'notifications.write',
  ],
  AUDITOR: [
    'dashboard.read',
    'customers.read',
    'loans.read',
    'reports.read',
    'inventory.read',
    'gl.write',
    'masters.read',
  ],
};

export function hasPermission(role: AppUserRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] as readonly string[];
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.read',
  'customers.read',
  'customers.write',
  'loans.read',
  'loans.write',
  'interest.write',
  'renewals.write',
  'repledges.write',
  'auctions.write',
  'inventory.read',
  'accounts.write',
  'reports.read',
  'branches.write',
  'users.write',
  'investments.write',
  'gl.write',
  'notifications.write',
  'pay_advance.write',
  'masters.read',
  'masters.write',
];

export const ROLE_LABELS: Record<AppUserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  BRANCH_MANAGER: 'Branch Manager',
  CASHIER: 'Cashier',
  APPRAISER: 'Appraiser',
  ACCOUNTANT: 'Accountant',
  AUDITOR: 'Auditor',
};

export function getRolePermissionsMatrix() {
  return (Object.keys(ROLE_PERMISSIONS) as AppUserRole[]).map((role) => ({
    role,
    label: ROLE_LABELS[role],
    permissions: ROLE_PERMISSIONS[role],
  }));
}
