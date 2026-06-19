import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { reportsApi } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { useModuleSettings } from '../../context/ModuleSettingsContext';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
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

const REPORTS: { key: ReportKey; label: string; category: string; module?: 'bankLoans' | 'auctions' | 'investments' }[] = [
  { key: 'daily-book', label: 'Daily book', category: 'Daily' },
  { key: 'collections', label: 'Collections', category: 'Daily' },
  { key: 'loan-register', label: 'Loan register', category: 'Daily' },
  { key: 'renewals', label: 'Renewals', category: 'Daily' },
  { key: 'interest', label: 'Interest collections', category: 'Daily' },
  { key: 'auctions', label: 'Auctions', category: 'Daily', module: 'auctions' },
  { key: 'overdue', label: 'Overdue loans', category: 'Monthly' },
  { key: 'monthly-profit', label: 'Monthly profit', category: 'Monthly' },
  { key: 'investment-ledger', label: 'Investment ledger', category: 'Monthly', module: 'investments' },
  { key: 'customer-growth', label: 'Customer growth', category: 'Monthly' },
  { key: 'bank-deposits', label: 'Bank deposits', category: 'Monthly', module: 'bankLoans' },
  { key: 'pay-advance', label: 'Pay advances', category: 'Monthly' },
];

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function ReportsPage() {
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

  const categories = [...new Set(visibleReports.map((r) => r.category))];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Daily, monthly & operational reports" />

      <div className="mb-6 grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardTitle>Report types</CardTitle>
          <div className="mt-4 space-y-4">
            {categories.map((cat) => (
              <div key={cat}>
                <p className="mb-2 text-xs font-medium uppercase text-zinc-500">{cat}</p>
                <div className="flex flex-col gap-2">
                  {visibleReports.filter((r) => r.category === cat).map((r) => (
                    <Button
                      key={r.key}
                      type="button"
                      variant={active === r.key ? 'primary' : 'secondary'}
                      className="w-full justify-start"
                      onClick={() => setActive(r.key)}
                    >
                      {r.label}
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
                              <TD key={k}>
                                {typeof row[k] === 'number' && k.toLowerCase().includes('amount')
                                  ? formatMoney(row[k] as number)
                                  : String(row[k] ?? '—')}
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
