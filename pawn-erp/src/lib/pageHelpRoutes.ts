/** Maps URL paths to help content keys (see i18n help namespace). */

export interface HelpTopic {
  id: string;
  group: 'core' | 'operations' | 'finance' | 'admin' | 'masters';
}

export const HELP_TOPICS: HelpTopic[] = [
  { id: 'dashboard', group: 'core' },
  { id: 'customers-list', group: 'core' },
  { id: 'customers-new', group: 'core' },
  { id: 'customers-detail', group: 'core' },
  { id: 'customers-edit', group: 'core' },
  { id: 'loans-list', group: 'core' },
  { id: 'loans-new', group: 'core' },
  { id: 'loans-detail', group: 'core' },
  { id: 'loans-edit', group: 'core' },
  { id: 'loans-close', group: 'core' },
  { id: 'loans-print', group: 'core' },
  { id: 'part-payments-list', group: 'operations' },
  { id: 'part-payments-record', group: 'operations' },
  { id: 'renewals-list', group: 'operations' },
  { id: 'renewals-record', group: 'operations' },
  { id: 'bank-loans-list', group: 'operations' },
  { id: 'bank-loans-record', group: 'operations' },
  { id: 'bank-loans-batch', group: 'operations' },
  { id: 'auctions', group: 'operations' },
  { id: 'inventory', group: 'operations' },
  { id: 'accounts', group: 'finance' },
  { id: 'investments', group: 'finance' },
  { id: 'gl', group: 'finance' },
  { id: 'pay-advances', group: 'finance' },
  { id: 'reports', group: 'finance' },
  { id: 'notifications', group: 'admin' },
  { id: 'settings-organization', group: 'admin' },
  { id: 'settings-branches', group: 'admin' },
  { id: 'settings-preferences', group: 'admin' },
  { id: 'settings-users', group: 'admin' },
  { id: 'settings-roles', group: 'admin' },
  { id: 'settings-audit', group: 'admin' },
  { id: 'masters-categories', group: 'masters' },
  { id: 'masters-sub-categories', group: 'masters' },
  { id: 'masters-sub-items', group: 'masters' },
  { id: 'masters-interest', group: 'masters' },
  { id: 'masters-employees', group: 'masters' },
];

export function helpPageIdForPath(pathname: string): string {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';

  if (path === '/') return 'dashboard';
  if (path === '/login') return 'dashboard';

  if (path === '/customers/new') return 'customers-new';
  if (/^\/customers\/\d+\/edit$/.test(path)) return 'customers-edit';
  if (/^\/customers\/\d+$/.test(path)) return 'customers-detail';
  if (path === '/customers') return 'customers-list';

  if (path === '/loans/new') return 'loans-new';
  if (/^\/loans\/\d+\/edit$/.test(path)) return 'loans-edit';
  if (/^\/loans\/\d+\/close$/.test(path)) return 'loans-close';
  if (/^\/loans\/\d+\/print$/.test(path)) return 'loans-print';
  if (/^\/loans\/\d+$/.test(path)) return 'loans-detail';
  if (path === '/loans') return 'loans-list';

  if (path === '/part-payments/record') return 'part-payments-record';
  if (path.startsWith('/part-payments')) return 'part-payments-list';

  if (path === '/renewals/record') return 'renewals-record';
  if (path.startsWith('/renewals')) return 'renewals-list';

  if (path === '/bank-loans/record') return 'bank-loans-record';
  if (path === '/bank-loans/batch') return 'bank-loans-batch';
  if (path.startsWith('/bank-loans')) return 'bank-loans-list';

  if (path.startsWith('/auctions')) return 'auctions';
  if (path.startsWith('/inventory')) return 'inventory';
  if (path.startsWith('/accounts')) return 'accounts';
  if (path.startsWith('/investments')) return 'investments';
  if (path.startsWith('/gl')) return 'gl';
  if (path.startsWith('/notifications')) return 'notifications';
  if (path.startsWith('/pay-advances')) return 'pay-advances';
  if (path.startsWith('/reports')) return 'reports';

  if (path === '/settings/organization') return 'settings-organization';
  if (path === '/settings/branches' || path === '/branches') return 'settings-branches';
  if (path === '/settings/preferences') return 'settings-preferences';
  if (path === '/settings/security/users') return 'settings-users';
  if (path === '/settings/security/roles') return 'settings-roles';
  if (path === '/settings/security/audit') return 'settings-audit';
  if (path.startsWith('/settings')) return 'settings-organization';

  if (path === '/masters/categories') return 'masters-categories';
  if (path === '/masters/sub-categories') return 'masters-sub-categories';
  if (path === '/masters/sub-items') return 'masters-sub-items';
  if (path === '/masters/interest-declarations') return 'masters-interest';
  if (path === '/masters/employees') return 'masters-employees';
  if (path.startsWith('/masters')) return 'masters-categories';

  return 'dashboard';
}
