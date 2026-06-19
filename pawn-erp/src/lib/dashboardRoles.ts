export type DashboardRole =
  | 'SUPER_ADMIN'
  | 'BRANCH_MANAGER'
  | 'CASHIER'
  | 'ACCOUNTANT'
  | 'AUDITOR'
  | 'APPRAISER';

export type DashboardSection =
  | 'quickActions'
  | 'todayOps'
  | 'financial'
  | 'inventory'
  | 'portfolio'
  | 'bankRepledge'
  | 'auction'
  | 'charts'
  | 'branchPerformance'
  | 'alerts'
  | 'insights'
  | 'activity'
  | 'kpi'
  | 'branchMap';

const ALL: DashboardSection[] = [
  'quickActions',
  'todayOps',
  'financial',
  'inventory',
  'portfolio',
  'bankRepledge',
  'auction',
  'charts',
  'branchPerformance',
  'alerts',
  'insights',
  'activity',
  'kpi',
  'branchMap',
];

const ROLE_SECTIONS: Record<DashboardRole, DashboardSection[]> = {
  SUPER_ADMIN: ALL,
  BRANCH_MANAGER: [
    'quickActions',
    'todayOps',
    'inventory',
    'portfolio',
    'bankRepledge',
    'auction',
    'charts',
    'branchPerformance',
    'alerts',
    'insights',
    'activity',
    'kpi',
  ],
  CASHIER: ['quickActions', 'todayOps', 'activity', 'alerts'],
  ACCOUNTANT: [
    'quickActions',
    'financial',
    'charts',
    'bankRepledge',
    'kpi',
    'alerts',
    'activity',
  ],
  AUDITOR: ['alerts', 'portfolio', 'auction', 'bankRepledge', 'insights', 'branchPerformance'],
  APPRAISER: ['quickActions', 'inventory', 'portfolio', 'todayOps'],
};

export function canViewSection(role: string | undefined, section: DashboardSection): boolean {
  const sections = ROLE_SECTIONS[(role ?? 'CASHIER') as DashboardRole] ?? ROLE_SECTIONS.CASHIER;
  return sections.includes(section);
}

export function roleFocusLabel(role: string | undefined): string {
  const map: Record<string, string> = {
    CASHIER: "Today's collections",
    BRANCH_MANAGER: 'Branch performance',
    ACCOUNTANT: 'Cash flow',
    SUPER_ADMIN: 'Entire organization',
    AUDITOR: 'Exceptions',
    APPRAISER: 'Inventory & appraisals',
  };
  return map[role ?? ''] ?? 'Operations overview';
}
