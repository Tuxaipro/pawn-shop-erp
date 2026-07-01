import { lazy, type ComponentType } from 'react';

function lazyNamed<T extends Record<string, ComponentType<unknown>>>(
  factory: () => Promise<T>,
  exportName: keyof T
) {
  return lazy(() =>
    factory().then((module) => ({ default: module[exportName] as ComponentType<unknown> }))
  );
}

export const LoginPage = lazyNamed(() => import('./pages/LoginPage'), 'LoginPage');
export const DashboardPage = lazyNamed(() => import('./pages/DashboardPage'), 'DashboardPage');
export const CustomerListPage = lazyNamed(
  () => import('./pages/customers/CustomerListPage'),
  'CustomerListPage'
);
export const CustomerCreatePage = lazyNamed(
  () => import('./pages/customers/CustomerCreatePage'),
  'CustomerCreatePage'
);
export const CustomerEditPage = lazyNamed(
  () => import('./pages/customers/CustomerEditPage'),
  'CustomerEditPage'
);
export const CustomerDetailPage = lazyNamed(
  () => import('./pages/customers/CustomerDetailPage'),
  'CustomerDetailPage'
);
export const LoanListPage = lazyNamed(() => import('./pages/loans/LoanListPage'), 'LoanListPage');
export const LoanCreatePage = lazyNamed(() => import('./pages/loans/LoanCreatePage'), 'LoanCreatePage');
export const LoanEditPage = lazyNamed(() => import('./pages/loans/LoanEditPage'), 'LoanEditPage');
export const LoanDetailPage = lazyNamed(() => import('./pages/loans/LoanDetailPage'), 'LoanDetailPage');
export const LoanClosePage = lazyNamed(() => import('./pages/loans/LoanClosePage'), 'LoanClosePage');
export const LoanBankLoanPage = lazyNamed(
  () => import('./pages/loans/LoanBankLoanPage'),
  'LoanBankLoanPage'
);
export const LoanPrintPage = lazyNamed(() => import('./pages/loans/LoanPrintPage'), 'LoanPrintPage');
export const PartPaymentLayout = lazyNamed(
  () => import('./pages/part-payments/PartPaymentLayout'),
  'PartPaymentLayout'
);
export const PartPaymentListPage = lazyNamed(
  () => import('./pages/part-payments/PartPaymentListPage'),
  'PartPaymentListPage'
);
export const PartPaymentRecordPage = lazyNamed(
  () => import('./pages/part-payments/PartPaymentRecordPage'),
  'PartPaymentRecordPage'
);
export const BankLoanLayout = lazyNamed(
  () => import('./pages/bank-loans/BankLoanLayout'),
  'BankLoanLayout'
);
export const BankLoanListPage = lazyNamed(
  () => import('./pages/bank-loans/BankLoanListPage'),
  'BankLoanListPage'
);
export const BankLoanRecordPage = lazyNamed(
  () => import('./pages/bank-loans/BankLoanRecordPage'),
  'BankLoanRecordPage'
);
export const BankLoanBatchPage = lazyNamed(
  () => import('./pages/bank-loans/BankLoanBatchPage'),
  'BankLoanBatchPage'
);
export const RenewalLayout = lazyNamed(
  () => import('./pages/renewals/RenewalLayout'),
  'RenewalLayout'
);
export const RenewalListPage = lazyNamed(
  () => import('./pages/renewals/RenewalListPage'),
  'RenewalListPage'
);
export const RenewalRecordPage = lazyNamed(
  () => import('./pages/renewals/RenewalRecordPage'),
  'RenewalRecordPage'
);
export const AuctionsPage = lazyNamed(() => import('./pages/auctions/AuctionsPage'), 'AuctionsPage');
export const InventoryPage = lazyNamed(
  () => import('./pages/inventory/InventoryPage'),
  'InventoryPage'
);
export const AccountsPage = lazyNamed(() => import('./pages/accounts/AccountsPage'), 'AccountsPage');
export const InvestmentsPage = lazyNamed(
  () => import('./pages/investments/InvestmentsPage'),
  'InvestmentsPage'
);
export const GlPage = lazyNamed(() => import('./pages/gl/GlPage'), 'GlPage');
export const NotificationsPage = lazyNamed(
  () => import('./pages/notifications/NotificationsPage'),
  'NotificationsPage'
);
export const PayAdvancesPage = lazyNamed(
  () => import('./pages/pay-advances/PayAdvancesPage'),
  'PayAdvancesPage'
);
export const ReportsPage = lazyNamed(() => import('./pages/reports/ReportsPage'), 'ReportsPage');
export const SettingsLayout = lazyNamed(
  () => import('./pages/settings/SettingsLayout'),
  'SettingsLayout'
);
export const SettingsIndexRedirect = lazyNamed(
  () => import('./pages/settings/SettingsLayout'),
  'SettingsIndexRedirect'
);
export const OrganizationSettingsPage = lazyNamed(
  () => import('./pages/settings/OrganizationSettingsPage'),
  'OrganizationSettingsPage'
);
export const SettingsBranchesPage = lazyNamed(
  () => import('./pages/settings/SettingsBranchesPage'),
  'SettingsBranchesPage'
);
export const ApplicationSettingsPage = lazyNamed(
  () => import('./pages/settings/ApplicationSettingsPage'),
  'ApplicationSettingsPage'
);
export const SecurityLayout = lazyNamed(
  () => import('./pages/settings/SecurityLayout'),
  'SecurityLayout'
);
export const SecurityIndexRedirect = lazyNamed(
  () => import('./pages/settings/SecurityLayout'),
  'SecurityIndexRedirect'
);
export const UsersSettingsPage = lazyNamed(
  () => import('./pages/settings/UsersSettingsPage'),
  'UsersSettingsPage'
);
export const RolePermissionsPage = lazyNamed(
  () => import('./pages/settings/RolePermissionsPage'),
  'RolePermissionsPage'
);
export const AuditLogPage = lazyNamed(
  () => import('./pages/settings/AuditLogPage'),
  'AuditLogPage'
);
export const MastersLayout = lazyNamed(
  () => import('./pages/masters/MastersLayout'),
  'MastersLayout'
);
export const MastersIndexRedirect = lazyNamed(
  () => import('./pages/masters/MastersLayout'),
  'MastersIndexRedirect'
);
export const CommodityCategoryPage = lazyNamed(
  () => import('./pages/masters/CommodityCategoryPage'),
  'CommodityCategoryPage'
);
export const CommoditySubCategoryPage = lazyNamed(
  () => import('./pages/masters/CommoditySubCategoryPage'),
  'CommoditySubCategoryPage'
);
export const CommoditySubItemPage = lazyNamed(
  () => import('./pages/masters/CommoditySubItemPage'),
  'CommoditySubItemPage'
);
export const InterestDeclarationPage = lazyNamed(
  () => import('./pages/masters/InterestDeclarationPage'),
  'InterestDeclarationPage'
);
export const EmployeeManagementPage = lazyNamed(
  () => import('./pages/masters/EmployeeManagementPage'),
  'EmployeeManagementPage'
);
