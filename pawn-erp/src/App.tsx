import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { OptionalModuleRoute } from './components/OptionalModuleRoute';
import { PageLoader } from './components/PageLoader';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BranchProvider } from './context/BranchContext';
import { ModuleSettingsProvider } from './context/ModuleSettingsContext';
import {
  AccountsPage,
  ApplicationSettingsPage,
  AuctionsPage,
  AuditLogPage,
  BankLoanBatchPage,
  BankLoanLayout,
  BankLoanListPage,
  BankLoanRecordPage,
  CommodityCategoryPage,
  CommoditySubCategoryPage,
  CommoditySubItemPage,
  CustomerCreatePage,
  CustomerDetailPage,
  CustomerEditPage,
  CustomerListPage,
  DashboardPage,
  EmployeeManagementPage,
  GlPage,
  InterestDeclarationPage,
  InventoryPage,
  InvestmentsPage,
  LoanBankLoanPage,
  LoanClosePage,
  LoanCreatePage,
  LoanDetailPage,
  LoanEditPage,
  LoanListPage,
  LoanPrintPage,
  LoginPage,
  MastersIndexRedirect,
  MastersLayout,
  NotificationsPage,
  OrganizationSettingsPage,
  PartPaymentLayout,
  PartPaymentListPage,
  PartPaymentRecordPage,
  PayAdvancesPage,
  RenewalLayout,
  RenewalListPage,
  RenewalRecordPage,
  ReportsPage,
  RolePermissionsPage,
  SecurityIndexRedirect,
  SecurityLayout,
  SettingsBranchesPage,
  SettingsIndexRedirect,
  SettingsLayout,
  UsersSettingsPage,
} from './lazyPages';

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <BranchProvider>
                <ModuleSettingsProvider>
                  <LoanPrintPage />
                </ModuleSettingsProvider>
              </BranchProvider>
            }
            path="loans/:id/print"
          />
          <Route
            element={
              <BranchProvider>
                <ModuleSettingsProvider>
                  <Layout />
                </ModuleSettingsProvider>
              </BranchProvider>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="customers/new" element={<CustomerCreatePage />} />
            <Route path="customers/:id/edit" element={<CustomerEditPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="loans" element={<LoanListPage />} />
            <Route path="loans/new" element={<LoanCreatePage />} />
            <Route path="loans/:id/edit" element={<LoanEditPage />} />
            <Route
              path="loans/:id/bank-loan"
              element={
                <OptionalModuleRoute module="bankLoans">
                  <LoanBankLoanPage />
                </OptionalModuleRoute>
              }
            />
            <Route path="loans/:id/close" element={<LoanClosePage />} />
            <Route path="loans/:id" element={<LoanDetailPage />} />
            <Route path="interest" element={<Navigate to="/part-payments" replace />} />
            <Route path="part-payments" element={<PartPaymentLayout />}>
              <Route index element={<PartPaymentListPage />} />
              <Route path="record" element={<PartPaymentRecordPage />} />
            </Route>
            <Route
              path="bank-loans"
              element={
                <OptionalModuleRoute module="bankLoans">
                  <BankLoanLayout />
                </OptionalModuleRoute>
              }
            >
              <Route index element={<BankLoanListPage />} />
              <Route path="record" element={<BankLoanRecordPage />} />
              <Route path="batch" element={<BankLoanBatchPage />} />
            </Route>
            <Route path="renewals" element={<RenewalLayout />}>
              <Route index element={<RenewalListPage />} />
              <Route path="record" element={<RenewalRecordPage />} />
            </Route>
            <Route
              path="repledges"
              element={
                <OptionalModuleRoute module="bankLoans">
                  <Navigate to="/bank-loans" replace />
                </OptionalModuleRoute>
              }
            />
            <Route
              path="auctions"
              element={
                <OptionalModuleRoute module="auctions">
                  <AuctionsPage />
                </OptionalModuleRoute>
              }
            />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route
              path="investments"
              element={
                <OptionalModuleRoute module="investments">
                  <InvestmentsPage />
                </OptionalModuleRoute>
              }
            />
            <Route
              path="gl"
              element={
                <OptionalModuleRoute module="gl">
                  <GlPage />
                </OptionalModuleRoute>
              }
            />
            <Route
              path="notifications"
              element={
                <OptionalModuleRoute module="notifications">
                  <NotificationsPage />
                </OptionalModuleRoute>
              }
            />
            <Route path="pay-advances" element={<PayAdvancesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="branches" element={<Navigate to="/settings/branches" replace />} />
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<SettingsIndexRedirect />} />
              <Route path="organization" element={<OrganizationSettingsPage />} />
              <Route path="branches" element={<SettingsBranchesPage />} />
              <Route path="preferences" element={<ApplicationSettingsPage />} />
              <Route path="security" element={<SecurityLayout />}>
                <Route index element={<SecurityIndexRedirect />} />
                <Route path="users" element={<UsersSettingsPage />} />
                <Route path="roles" element={<RolePermissionsPage />} />
                <Route path="audit" element={<AuditLogPage />} />
              </Route>
            </Route>
            <Route path="masters" element={<MastersLayout />}>
              <Route index element={<MastersIndexRedirect />} />
              <Route path="categories" element={<CommodityCategoryPage />} />
              <Route path="sub-categories" element={<CommoditySubCategoryPage />} />
              <Route path="sub-items" element={<CommoditySubItemPage />} />
              <Route path="interest-declarations" element={<InterestDeclarationPage />} />
              <Route path="employees" element={<EmployeeManagementPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
