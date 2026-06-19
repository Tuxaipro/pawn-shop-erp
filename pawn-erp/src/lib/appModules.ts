export type OptionalModuleKey =
  | 'bankLoans'
  | 'auctions'
  | 'investments'
  | 'gl'
  | 'notifications';

export type ModuleFlags = Record<OptionalModuleKey, boolean>;

export interface AppModule {
  path: string;
  labelKey: string;
  icon: string;
  optional?: OptionalModuleKey;
  adminOnly?: boolean;
}

/** Sidebar order — daily-use modules first, optional modules after reports. */
export const APP_MODULES: AppModule[] = [
  { path: '/', labelKey: 'nav.dashboard', icon: 'dashboard' },
  { path: '/customers', labelKey: 'nav.customers', icon: 'customers' },
  { path: '/loans', labelKey: 'nav.loans', icon: 'loans' },
  { path: '/part-payments', labelKey: 'nav.interest', icon: 'interest' },
  { path: '/renewals', labelKey: 'nav.renewals', icon: 'renewals' },
  { path: '/inventory', labelKey: 'nav.inventory', icon: 'inventory' },
  { path: '/accounts', labelKey: 'nav.accounts', icon: 'accounts' },
  { path: '/pay-advances', labelKey: 'nav.pay_advances', icon: 'pay_advances' },
  { path: '/reports', labelKey: 'nav.reports', icon: 'reports' },
  { path: '/bank-loans', labelKey: 'nav.bank_loan', icon: 'bank_loan', optional: 'bankLoans' },
  { path: '/auctions', labelKey: 'nav.auctions', icon: 'auctions', optional: 'auctions' },
  { path: '/investments', labelKey: 'nav.investments', icon: 'investments', optional: 'investments' },
  { path: '/gl', labelKey: 'nav.gl', icon: 'gl', optional: 'gl' },
  { path: '/notifications', labelKey: 'nav.notifications', icon: 'notifications', optional: 'notifications' },
  { path: '/masters', labelKey: 'nav.masters', icon: 'masters' },
  { path: '/settings', labelKey: 'nav.settings', icon: 'settings', adminOnly: true },
];

export const OPTIONAL_MODULE_KEYS: OptionalModuleKey[] = [
  'bankLoans',
  'auctions',
  'investments',
  'gl',
  'notifications',
];

export const DEFAULT_MODULE_FLAGS: ModuleFlags = {
  bankLoans: false,
  auctions: false,
  investments: false,
  gl: false,
  notifications: false,
};

export function isModulePathEnabled(path: string, modules: ModuleFlags): boolean {
  const mod = APP_MODULES.find((m) => m.path === path);
  if (!mod?.optional) return true;
  return modules[mod.optional];
}

export function filterNavModules(
  modules: ModuleFlags,
  isSuperAdmin: boolean
): AppModule[] {
  return APP_MODULES.filter((m) => {
    if (m.adminOnly && !isSuperAdmin) return false;
    if (m.optional && !modules[m.optional]) return false;
    return true;
  });
}

/** Map route prefix to optional module key for route guards. */
export const ROUTE_MODULE_MAP: Record<string, OptionalModuleKey> = {
  '/bank-loans': 'bankLoans',
  '/repledges': 'bankLoans',
  '/auctions': 'auctions',
  '/investments': 'investments',
  '/gl': 'gl',
  '/notifications': 'notifications',
};

export function moduleForPath(pathname: string): OptionalModuleKey | undefined {
  const entry = Object.entries(ROUTE_MODULE_MAP).find(([prefix]) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return entry?.[1];
}
