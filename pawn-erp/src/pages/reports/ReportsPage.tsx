import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportsApi } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { useModuleSettings } from '../../context/ModuleSettingsContext';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { formatDateIN, formatDateTimeIN } from '../../lib/formatDate';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

type ReportKey =
  | 'overdue'
  | 'loan-register'
  | 'daily-book'
  | 'collections'
  | 'renewals'
  | 'interest'
  | 'auctions'
  | 'bank-deposits'
  | 'pay-advance'
  | 'investment-ledger'
  | 'monthly-profit'
  | 'customer-growth';

const REPORTS: {
  key: ReportKey;
  labelKey: string;
  categoryKey: 'daily' | 'monthly';
  module?: 'bankLoans' | 'auctions' | 'investments';
}[] = [
  { key: 'daily-book', labelKey: 'types.daily_book', categoryKey: 'daily' },
  { key: 'collections', labelKey: 'types.collections', categoryKey: 'daily' },
  { key: 'loan-register', labelKey: 'types.loan_register', categoryKey: 'daily' },
  { key: 'renewals', labelKey: 'types.renewals', categoryKey: 'daily' },
  { key: 'interest', labelKey: 'types.interest', categoryKey: 'daily' },
  { key: 'auctions', labelKey: 'types.auctions', categoryKey: 'daily', module: 'auctions' },
  { key: 'overdue', labelKey: 'types.overdue', categoryKey: 'monthly' },
  { key: 'monthly-profit', labelKey: 'types.monthly_profit', categoryKey: 'monthly' },
  { key: 'investment-ledger', labelKey: 'types.investment_ledger', categoryKey: 'monthly', module: 'investments' },
  { key: 'customer-growth', labelKey: 'types.customer_growth', categoryKey: 'monthly' },
  { key: 'bank-deposits', labelKey: 'types.bank_deposits', categoryKey: 'monthly', module: 'bankLoans' },
  { key: 'pay-advance', labelKey: 'types.pay_advance', categoryKey: 'monthly' },
];

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

const DATE_TIME_KEYS = new Set(['dateTime', 'createdOn', 'updatedOn', 'timestamp']);

function formatReportCell(key: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && key.toLowerCase().includes('amount')) {
    return formatMoney(value);
  }
  const str = String(value);
  if (DATE_TIME_KEYS.has(key) || key.endsWith('At')) {
    return formatDateTimeIN(str);
  }
  if (key.endsWith('Date') && /^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return formatDateIN(str);
  }
  return str;
}

export function ReportsPage() {
  const { t } = useTranslation('reports');
  const { branchId } = useBranch();
  const { isModuleEnabled } = useModuleSettings();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;

  const visibleReports = useMemo(
    () => REPORTS.filter((r) => !r.module || isModuleEnabled(r.module)),
    [isModuleEnabled]
  );

  const [active, setActive] = useState<ReportKey>('daily-book');
  const [date, setDate] = useState(today);
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);

  useEffect(() => {
    if (!visibleReports.some((r) => r.key === active)) {
      setActive(visibleReports[0]?.key ?? 'daily-book');
    }
  }, [active, visibleReports]);

  const { data, isFetching } = useQuery({
    queryKey: ['reports', active, branchId, date, fromDate, toDate],
    queryFn: async () => {
      switch (active) {
        case 'overdue':
          return reportsApi.overdue(branchId);
        case 'loan-register':
          return reportsApi.loanRegister(branchId, fromDate, toDate);
        case 'daily-book':
          return reportsApi.dailyBook(date, branchId);
        case 'collections':
          return reportsApi.collections(branchId, fromDate, toDate);
        case 'renewals':
          return reportsApi.renewals(branchId, fromDate, toDate);
        case 'interest':
          return reportsApi.interest(branchId, fromDate, toDate);
        case 'auctions':
          return reportsApi.auctions(branchId, fromDate, toDate);
        case 'bank-deposits':
          return reportsApi.bankDeposits(branchId);
        case 'pay-advance':
          return reportsApi.payAdvance(branchId);
        case 'investment-ledger':
          return reportsApi.investmentLedger(branchId);
        case 'monthly-profit':
          return reportsApi.monthlyProfit(branchId);
        case 'customer-growth':
          return reportsApi.customerGrowth(branchId, fromDate, toDate);
        default:
          return null;
      }
    },
  });

  const report = data as Record<string, unknown> | undefined;
  const items = (report?.items as Array<Record<string, unknown>>) ?? (report?.ledger as Array<Record<string, unknown>>) ?? [];

  const categories = [...new Set(visibleReports.map((r) => r.categoryKey))];

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="mb-6 grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardTitle>{t('report_types')}</CardTitle>
          <div className="mt-4 space-y-4">
            {categories.map((cat) => (
              <div key={cat}>
                <p className="mb-2 text-xs font-medium uppercase text-zinc-500">{t(`categories.${cat}`)}</p>
                <div className="flex flex-col gap-2">
                  {visibleReports.filter((r) => r.categoryKey === cat).map((r) => (
                    <Button
                      key={r.key}
                      type="button"
                      variant={active === r.key ? 'primary' : 'secondary'}
                      className="w-full justify-start"
                      onClick={() => setActive(r.key)}
                    >
                      {t(r.labelKey)}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-3">
          <Card className="mb-4">
            <div className="flex flex-wrap gap-3">
              {active === 'daily-book' && (
                <Field label="Date">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
              )}
              {active !== 'daily-book' && active !== 'overdue' && active !== 'monthly-profit' && (
                <>
                  <Field label="From">
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                  </Field>
                  <Field label="To">
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                  </Field>
                </>
              )}
            </div>
          </Card>

          {isFetching ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <>
              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                {report?.count != null && (
                  <Card><CardTitle>Count</CardTitle><p className="mt-2 text-xl font-semibold">{String(report.count)}</p></Card>
                )}
                {report?.totalOutstanding != null && (
                  <Card><CardTitle>Outstanding</CardTitle><p className="mt-2 text-xl font-semibold">{formatMoney(Number(report.totalOutstanding))}</p></Card>
                )}
                {report?.total != null && (
                  <Card><CardTitle>Total</CardTitle><p className="mt-2 text-xl font-semibold">{formatMoney(Number(report.total))}</p></Card>
                )}
                {report?.profit != null && (
                  <Card><CardTitle>Profit</CardTitle><p className="mt-2 text-xl font-semibold">{formatMoney(Number(report.profit))}</p></Card>
                )}
                {report?.totalPending != null && (
                  <Card><CardTitle>Pending</CardTitle><p className="mt-2 text-xl font-semibold">{formatMoney(Number(report.totalPending))}</p></Card>
                )}
                {report?.newCustomers != null && (
                  <Card><CardTitle>New customers</CardTitle><p className="mt-2 text-xl font-semibold">{String(report.newCustomers)}</p></Card>
                )}
                {report && (report.balance as { cashInHand?: number })?.cashInHand != null && (
                  <Card><CardTitle>Cash in hand</CardTitle><p className="mt-2 text-xl font-semibold">{formatMoney(Number((report.balance as { cashInHand: number }).cashInHand))}</p></Card>
                )}
              </div>

              {items.length > 0 ? (
                <TableCard>
                  <DataTable>
                    <THead>
                      <tr>
                        {Object.keys(items[0])
                          .filter((k) => !['id', 'metadata'].includes(k))
                          .slice(0, 8)
                          .map((k) => (
                            <TH key={k}>{k}</TH>
                          ))}
                      </tr>
                    </THead>
                    <TBody>
                      {items.map((row, i) => (
                        <tr key={String(row.id ?? i)}>
                          {Object.keys(items[0])
                            .filter((k) => !['id', 'metadata'].includes(k))
                            .slice(0, 8)
                            .map((k) => (
                              <TD key={k} className={k === 'dateTime' ? 'whitespace-nowrap' : undefined}>
                                {formatReportCell(k, row[k])}
                              </TD>
                            ))}
                        </tr>
                      ))}
                    </TBody>
                  </DataTable>
                </TableCard>
              ) : (
                <p className="text-sm text-zinc-500">No detail rows for this report.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
