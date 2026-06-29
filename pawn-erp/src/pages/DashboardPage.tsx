import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/modules';
import {
  BarChart,
  DonutChart,
  HorizontalBarChart,
  KpiBar,
  LineChart,
  PieChart,
} from '../components/dashboard/DashboardCharts';
import { PageHeader } from '../components/PageHeader';
import { Card, CardTitle } from '../components/ui/Card';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../components/ui/Table';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { useModuleSettings } from '../context/ModuleSettingsContext';
import { canViewSection, roleFocusLabel } from '../lib/dashboardRoles';
import { formatWeight, formatWeightGrams } from '../lib/formatNumber';

function formatMoney(value: number, compact = false) {
  if (compact && value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
  if (compact && value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function Delta({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-600'}`}>
      {up ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 border-b border-zinc-200 pb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
      {children}
    </h2>
  );
}

function MetricCard({
  label,
  value,
  sub,
  delta,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number | null;
  href?: string;
  accent?: string;
}) {
  const inner = (
    <Card className={`${accent ?? ''} ${href ? 'transition hover:ring-2 hover:ring-zinc-950/10' : ''}`}>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {sub && <span className="text-xs text-zinc-500">{sub}</span>}
        {delta !== undefined && <Delta pct={delta ?? null} />}
      </div>
    </Card>
  );
  if (href) return <Link to={href} className="no-underline">{inner}</Link>;
  return inner;
}

const QUICK_ACTIONS = [
  { key: 'new_loan', href: '/loans/new', color: 'bg-blue-50 text-blue-900 ring-blue-200' },
  { key: 'renew_loan', href: '/renewals/record', color: 'bg-violet-50 text-violet-900 ring-violet-200' },
  { key: 'interest', href: '/part-payments', color: 'bg-purple-50 text-purple-900 ring-purple-200' },
  { key: 'close_loan', href: '/loans', color: 'bg-emerald-50 text-emerald-900 ring-emerald-200' },
  { key: 'bank', href: '/bank-loans/batch', color: 'bg-amber-50 text-amber-900 ring-amber-200', module: 'bankLoans' as const },
  { key: 'auction', href: '/auctions', color: 'bg-rose-50 text-rose-900 ring-rose-200', module: 'auctions' as const },
  { key: 'customer', href: '/customers/new', color: 'bg-sky-50 text-sky-900 ring-sky-200' },
] as const;

const ALERT_ICONS: Record<string, string> = {
  critical: '🔴',
  warning: '🟠',
  caution: '🟡',
  info: '🔵',
};

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function AutoRefreshInfo({ message, updating }: { message: string; updating?: boolean }) {
  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        className="flex cursor-default items-center justify-center rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-950/5"
        aria-label={message}
      >
        <InfoIcon className={`text-zinc-400 ${updating ? 'animate-pulse' : ''}`} />
      </button>
      <p className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-max max-w-[220px] rounded-lg bg-zinc-50 px-3 py-2 text-left text-xs leading-relaxed text-zinc-500 shadow-md ring-1 ring-zinc-950/10 group-hover:block group-focus-within:block">
        {message}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { branchId } = useBranch();
  const { user } = useAuth();
  const { dashboardRefreshSeconds, isModuleEnabled } = useModuleSettings();
  const role = user?.role;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard', branchId],
    queryFn: () => dashboardApi.summary(branchId),
    refetchInterval: dashboardRefreshSeconds * 1000,
  });

  if (isLoading && !data) return <p className="text-sm text-zinc-500">{t('loading')}</p>;
  if (!data?.enterprise) return null;

  const e = data.enterprise;
  const show = (section: Parameters<typeof canViewSection>[1]) => canViewSection(role, section);
  const quickActions = QUICK_ACTIONS.filter(
    (a) => !('module' in a) || isModuleEnabled(a.module)
  );

  return (
    <div className="space-y-10 pb-8">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={`${t('dashboard.subtitle')} · ${roleFocusLabel(role)}`}
        actions={
          <AutoRefreshInfo
            message={t('dashboard.auto_refresh_info', { seconds: dashboardRefreshSeconds })}
            updating={isFetching}
          />
        }
      />

      {/* Row 1: Quick Actions */}
      {show('quickActions') && (
        <section>
          <SectionTitle>{t('dashboard.sections.quick_actions')}</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {quickActions.map((a) => (
              <Link
                key={a.key}
                to={a.href}
                className={`flex min-h-[72px] flex-col items-center justify-center rounded-xl px-2 py-3 text-center text-sm font-medium no-underline ring-1 ring-inset transition hover:scale-[1.02] ${a.color}`}
              >
                <span className="text-lg leading-none">+</span>
                {t(`dashboard.actions.${a.key}`)}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Row 2: Today's Operations */}
      {show('todayOps') && (
        <section>
          <SectionTitle>{t('dashboard.sections.today_ops')}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label={t('dashboard.new_customers')}
              value={e.today.newCustomers}
              delta={e.today.newCustomersDeltaPct}
              href="/customers"
            />
            <MetricCard
              label={t('dashboard.new_loans')}
              value={e.today.newLoans}
              sub={formatMoney(e.today.newLoansAmount)}
              delta={e.today.newLoansDeltaPct}
              href="/loans"
            />
            <MetricCard
              label={t('dashboard.interest_collection')}
              value={formatMoney(e.today.interestCollected)}
              delta={e.today.interestDeltaPct}
              href="/part-payments"
              accent="ring-1 ring-purple-100"
            />
            <MetricCard
              label={t('dashboard.partial_payments')}
              value={e.today.partialPayments}
              sub={formatMoney(e.today.partialPaymentsAmount)}
              href="/part-payments"
            />
            <MetricCard
              label={t('dashboard.released_loans')}
              value={e.today.releasedLoans}
              sub={formatMoney(e.today.releasedAmount)}
              href="/inventory?status=released"
            />
            <MetricCard
              label={t('dashboard.today_expense')}
              value={formatMoney(e.today.expenses)}
              href="/accounts"
            />
          </div>
        </section>
      )}

      {/* Row 3: Financial Snapshot */}
      {show('financial') && (
        <section>
          <SectionTitle>{t('dashboard.sections.financial')}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label={t('dashboard.cash_in_hand')}
              value={formatMoney(e.financial.cashInHand)}
              sub={
                e.financial.cashOverLimit
                  ? `Over limit by ${formatMoney(e.financial.excessCash)}`
                  : e.financial.cashChange >= 0
                    ? `▲ ${formatMoney(e.financial.cashChange)}`
                    : `▼ ${formatMoney(Math.abs(e.financial.cashChange))}`
              }
              href="/accounts"
              accent={
                e.financial.cashOverLimit
                  ? 'bg-amber-50/80 ring-1 ring-amber-200'
                  : 'bg-emerald-50/50 ring-1 ring-emerald-100'
              }
            />
            <MetricCard
              label={t('dashboard.cash_limit')}
              value={formatMoney(e.financial.cashLimit)}
              sub={
                e.financial.cashOverLimit
                  ? t('dashboard.deposit_to_bank')
                  : t('dashboard.within_limit')
              }
              href="/accounts"
            />
            <MetricCard
              label={t('dashboard.bank_repledge_balance')}
              value={formatMoney(e.financial.bankBalance, true)}
              href={isModuleEnabled('bankLoans') ? '/bank-loans' : undefined}
              accent="bg-orange-50/50 ring-1 ring-orange-100"
            />
            <MetricCard
              label={t('dashboard.outstanding')}
              value={formatMoney(e.financial.outstandingLoans, true)}
              href="/loans"
              accent="bg-blue-50/50 ring-1 ring-blue-100"
            />
            {isModuleEnabled('investments') && (
              <MetricCard
                label={t('dashboard.investments')}
                value={formatMoney(e.financial.investments, true)}
                href="/investments"
              />
            )}
            <MetricCard
              label={t('dashboard.profit')}
              value={formatMoney(e.financial.monthlyProfit, true)}
              href="/reports"
              accent="bg-teal-50/50 ring-1 ring-teal-100"
            />
            <MetricCard
              label={t('dashboard.today_net')}
              value={formatMoney(e.financial.todayNet)}
              href="/accounts"
            />
          </div>
        </section>
      )}

      {/* Row 4: Inventory + Portfolio + Bank + Auction */}
      <div className="grid gap-8 xl:grid-cols-2">
        {show('inventory') && (
          <section>
            <SectionTitle>{t('dashboard.sections.inventory')}</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label={t('dashboard.gold_stock')} value={formatWeightGrams(e.inventory.gold.weight)} sub={`${e.inventory.gold.loans} ${t('dashboard.loans')}`} href="/inventory?commodityType=gold" accent="bg-amber-50/60 ring-amber-100 ring-1" />
              <MetricCard label={t('dashboard.silver_stock')} value={formatWeightGrams(e.inventory.silver.weight)} sub={`${e.inventory.silver.loans} ${t('dashboard.loans')}`} href="/inventory?commodityType=silver" />
              {isModuleEnabled('bankLoans') && (
                <MetricCard label={t('dashboard.bank_pledged_stock')} value={formatWeightGrams(e.inventory.bankPledged.weight)} sub={`${e.inventory.bankPledged.loans} ${t('dashboard.loans')}`} href="/bank-loans" accent="bg-orange-50/50 ring-1 ring-orange-100" />
              )}
              {isModuleEnabled('auctions') && (
                <MetricCard label={t('dashboard.auction_stock')} value={formatWeightGrams(e.inventory.auctionStock.weight)} sub={`${e.inventory.auctionStock.loans} ${t('dashboard.loans')}`} href="/auctions" accent="bg-red-50/50 ring-1 ring-red-100" />
              )}
              <MetricCard label={t('dashboard.released_stock')} value={formatWeightGrams(e.inventory.released.weight)} href="/inventory?status=released" />
            </div>
          </section>
        )}

        {show('portfolio') && (
          <section>
            <SectionTitle>{t('dashboard.sections.portfolio')}</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetricCard label={t('dashboard.open_loans')} value={e.portfolio.openLoans} href="/loans" />
              <MetricCard label={t('dashboard.due_today')} value={e.portfolio.dueToday} href="/renewals" />
              <MetricCard label={t('dashboard.overdue')} value={e.portfolio.overdue} href="/renewals" />
              <MetricCard label={t('dashboard.renewal_due')} value={e.portfolio.renewalDue} href="/renewals" />
              <MetricCard label={t('dashboard.npa')} value={e.portfolio.npa} href="/renewals" />
              {isModuleEnabled('auctions') && (
                <MetricCard label={t('dashboard.auction_eligible')} value={e.portfolio.auctionEligible} href="/auctions" />
              )}
            </div>
          </section>
        )}

        {show('bankRepledge') && isModuleEnabled('bankLoans') && (
          <section>
            <SectionTitle>{t('dashboard.sections.bank_repledge')}</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetricCard label={t('dashboard.active_banks')} value={e.bankRepledge.activeBanks} href="/bank-loans" />
              <MetricCard label={t('dashboard.batches')} value={e.bankRepledge.batches} href="/bank-loans" />
              <MetricCard label={t('dashboard.bank_outstanding')} value={formatMoney(e.bankRepledge.outstanding, true)} href="/bank-loans" />
              <MetricCard label={t('dashboard.maturity_month')} value={formatMoney(e.bankRepledge.maturityThisMonth, true)} href="/bank-loans" />
              <MetricCard label={t('dashboard.bank_overdue')} value={e.bankRepledge.overdue} href="/bank-loans" />
            </div>
          </section>
        )}

        {show('auction') && isModuleEnabled('auctions') && (
          <section>
            <SectionTitle>{t('dashboard.sections.auction_mgmt')}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label={t('dashboard.auction_notices')} value={e.auction.notices} href="/auctions" />
              <MetricCard label={t('dashboard.legal_waiting')} value={e.auction.legalWaiting} href="/auctions" />
              <MetricCard label={t('dashboard.auction_scheduled')} value={e.auction.scheduled} href="/auctions" />
              <MetricCard label={t('dashboard.auction_completed')} value={e.auction.completed} href="/auctions" />
            </div>
          </section>
        )}
      </div>

      {/* Row 5: Charts */}
      {show('charts') && (
        <section>
          <SectionTitle>{t('dashboard.sections.charts')}</SectionTitle>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardTitle>{t('dashboard.chart.daily_collections')}</CardTitle>
              <div className="mt-4">
                <BarChart
                  data={e.charts.dailyCollections}
                  valueKey="amount"
                  labelKey="label"
                  color="bg-blue-500"
                  formatValue={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
              </div>
            </Card>
            <Card>
              <CardTitle>{t('dashboard.chart.loan_trend')}</CardTitle>
              <div className="mt-4">
                <LineChart data={e.charts.loanTrend} valueKey="count" labelKey="label" />
              </div>
            </Card>
            <Card>
              <CardTitle>{t('dashboard.chart.gold_silver')}</CardTitle>
              <div className="mt-4">
                <HorizontalBarChart
                  items={[
                    { label: t('dashboard.gold_stock'), value: e.charts.goldVsSilver.gold },
                    { label: t('dashboard.silver_stock'), value: e.charts.goldVsSilver.silver },
                  ]}
                  colors={['bg-amber-500', 'bg-zinc-400']}
                  formatValue={formatWeight}
                />
              </div>
            </Card>
            <Card>
              <CardTitle>{t('dashboard.chart.income_expense')}</CardTitle>
              <div className="mt-4">
                <HorizontalBarChart
                  items={[
                    { label: t('dashboard.revenue'), value: e.charts.incomeVsExpense.income },
                    { label: t('dashboard.today_expense'), value: e.charts.incomeVsExpense.expense },
                  ]}
                  colors={['bg-emerald-500', 'bg-red-400']}
                />
              </div>
            </Card>
            {e.charts.branchComparison.length > 0 && (
              <Card>
                <CardTitle>{t('dashboard.chart.branch_compare')}</CardTitle>
                <div className="mt-4">
                  <HorizontalBarChart
                    items={e.charts.branchComparison.map((b) => ({ label: b.name, value: b.value }))}
                  />
                </div>
              </Card>
            )}
            <Card>
              <CardTitle>{t('dashboard.chart.loan_status')}</CardTitle>
              <div className="mt-4">
                <PieChart slices={e.charts.loanStatus} />
              </div>
            </Card>
            <Card>
              <CardTitle>{t('dashboard.chart.item_dist')}</CardTitle>
              <div className="mt-4">
                <DonutChart slices={e.charts.itemDistribution} />
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Row 6: Branch + Activity + Insights + KPI + Alerts */}
      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
        {show('branchPerformance') && data.branchPerformance && data.branchPerformance.length > 0 && (
          <section className="xl:col-span-2">
            <SectionTitle>{t('dashboard.branch_performance')}</SectionTitle>
            <TableCard>
              <DataTable>
                <THead>
                  <tr>
                    <TH>{t('dashboard.col.branch')}</TH>
                    <TH>{t('dashboard.col.loans')}</TH>
                    <TH>{t('dashboard.col.interest')}</TH>
                    <TH>{t('dashboard.col.cash')}</TH>
                    <TH>{t('dashboard.col.outstanding')}</TH>
                  </tr>
                </THead>
                <TBody>
                  {data.branchPerformance.map((b) => (
                    <tr key={b.branchId}>
                      <TD className="font-medium">{b.branchName}</TD>
                      <TD>{b.loansToday}</TD>
                      <TD>{formatMoney(b.interestToday)}</TD>
                      <TD>{formatMoney(b.cashInHand)}</TD>
                      <TD>{formatMoney(b.outstanding)}</TD>
                    </tr>
                  ))}
                </TBody>
              </DataTable>
            </TableCard>
          </section>
        )}

        {show('alerts') && e.alerts.length > 0 && (
          <section>
            <SectionTitle>{t('dashboard.sections.alerts')}</SectionTitle>
            <ul className="space-y-2">
              {e.alerts.map((a) => (
                <li key={a.message}>
                  <Link to={a.href} className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 text-sm no-underline ring-1 ring-amber-100 hover:bg-amber-100">
                    <span>{ALERT_ICONS[a.level] ?? '•'} {a.message}</span>
                    <span className="font-semibold">{a.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {show('insights') && e.insights.length > 0 && (
          <section>
            <SectionTitle>{t('dashboard.sections.insights')}</SectionTitle>
            <Card>
              <CardTitle>{t('dashboard.insights_title')}</CardTitle>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-600">
                {e.insights.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {show('activity') && e.activity.length > 0 && (
          <section>
            <SectionTitle>{t('dashboard.sections.activity')}</SectionTitle>
            <Card>
              <ul className="space-y-3 text-sm">
                {e.activity.map((a, i) => (
                  <li key={i} className="flex gap-3 border-b border-zinc-100 pb-2 last:border-0">
                    <span className="shrink-0 font-mono text-xs text-zinc-400">{a.time}</span>
                    <span>{a.message}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {show('kpi') && (
          <section>
            <SectionTitle>{t('dashboard.sections.kpi')}</SectionTitle>
            <Card className="space-y-4">
              {e.kpi.map((k) => (
                <KpiBar key={k.label} label={t(`dashboard.kpi.${k.label}`)} pct={k.pct} />
              ))}
            </Card>
          </section>
        )}

        {show('branchMap') && e.branchMap.length > 1 && (
          <section>
            <SectionTitle>{t('dashboard.sections.branch_map')}</SectionTitle>
            <div className="grid gap-2">
              {e.branchMap.map((b) => (
                <div key={b.name} className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
                  <span>📍 {b.name}</span>
                  <span className="font-semibold">{formatMoney(b.outstanding, true)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile summary strip */}
      <div className="fixed bottom-0 left-0 right-0 z-10 flex gap-2 overflow-x-auto border-t border-zinc-200 bg-white/95 p-2 text-xs backdrop-blur md:hidden">
        <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1">{t('dashboard.cash_in_hand')}: {formatMoney(e.financial.cashInHand, true)}</span>
        <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1">{t('dashboard.new_loans')}: {e.today.newLoans}</span>
        <span className="shrink-0 rounded-full bg-purple-100 px-3 py-1">{t('dashboard.interest_collection')}: {formatMoney(e.today.interestCollected, true)}</span>
        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1">{t('dashboard.gold_stock')}: {formatWeightGrams(e.inventory.gold.weight)}</span>
        {e.alerts[0] && (
          <span className="shrink-0 rounded-full bg-red-100 px-3 py-1">{t('dashboard.sections.alerts')}: {e.alerts.reduce((s, a) => s + a.count, 0)}</span>
        )}
      </div>
    </div>
  );
}
