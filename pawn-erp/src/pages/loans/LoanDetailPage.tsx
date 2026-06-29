import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { loansApi, type LoanDetail } from '../../api/loans';
import { useBranch } from '../../context/BranchContext';
import { useModuleSettings } from '../../context/ModuleSettingsContext';
import { LoanItemQr } from '../../components/LoanItemQr';
import { LoanRelatedTabs } from '../../components/loans/LoanRelatedTabs';
import { CloseLoanIcon, PaymentIcon, PrintIcon, RenewIcon } from '../../components/ui/icons';
import { formatAmountInWords } from '../../lib/amountInWords';
import { formatLoanConditionText } from '../../lib/loanConditionText';
import { formatDateIN } from '../../lib/formatDate';
import { localizedCommodity, localizedItemNames } from '../../lib/localizedItem';
import { cn } from '../../lib/cn';
import { PageHeader } from '../../components/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

function statusLabel(loan: LoanDetail, t: (key: string) => string) {
  const key = loan.settlementStatusLabel as 'open' | 'closed' | 'renewed';
  return t(`settlement.${key}`);
}

function billSettledLabel(isBillSettled: number, t: (key: string) => string) {
  if (isBillSettled === 1) return t('detail.bill_with_receipt');
  if (isBillSettled === 2) return t('detail.bill_without_receipt');
  return '—';
}

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const iconClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 ring-1 ring-zinc-950/10 transition hover:bg-zinc-950/5 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:pointer-events-none disabled:opacity-40';

export function LoanDetailPage() {
  const { t, i18n } = useTranslation(['loan', 'common']);
  const { branchId } = useBranch();
  const { qrCodesEnabled } = useModuleSettings();
  const { id } = useParams<{ id: string }>();
  const loanId = Number(id);

  const { data: loan, isLoading, error } = useQuery({
    queryKey: ['loans', branchId, loanId],
    queryFn: () => loansApi.get(loanId, branchId),
    enabled: !Number.isNaN(loanId),
  });

  if (isLoading) return <p className="text-sm/6 text-zinc-500">{t('loading')}</p>;
  if (error || !loan) return <p className="text-red-600">{(error as Error)?.message ?? t('not_found')}</p>;

  const conditionText = formatLoanConditionText(loan, t);
  const showGoldNet = loan.commodityTypeCode === 'gold' && loan.netWeightGold > 0;
  const showSilverNet = loan.commodityTypeCode === 'silver' && loan.netWeightSilver > 0;
  const breakdown = loan.settlementBreakdown;
  const calc = loan.interestCalculation;
  const partPaymentTotal =
    calc?.partPaymentTotal ?? loan.partPayments.reduce((sum, p) => sum + p.amount, 0);
  const amountToPay =
    calc?.netPayable ??
    (calc ? Math.max(0, calc.totalPayable - partPaymentTotal) : 0);
  const isOpen = loan.settlementStatus === 0;
  const perms = loan.permissions;

  return (
    <div>
      <PageHeader
        title={`${t('columns.receipt')} #${loan.invoiceNo}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>{loan.customer.name}</span>
            <Badge variant={loan.settlementStatusLabel as 'open' | 'closed' | 'renewed'}>
              {statusLabel(loan, t)}
            </Badge>
          </span>
        }
        aside={
          qrCodesEnabled && loan.qrCode ? (
            <LoanItemQr value={loan.qrCode} size={96} className="shrink-0" />
          ) : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-1">
            <a
              href={`/loans/${loan.id}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className={iconClass}
              title={t('detail.print')}
              aria-label={t('detail.print')}
            >
              <PrintIcon />
            </a>
            {isOpen && perms?.canRenew && (
              <Link
                to={`/renewals/record?loanId=${loan.id}`}
                className={iconClass}
                title={t('list_actions.renew')}
                aria-label={t('list_actions.renew')}
              >
                <RenewIcon />
              </Link>
            )}
            {isOpen && perms?.canClose && (
              <Link
                to={`/loans/${loan.id}/close`}
                className={iconClass}
                title={t('list_actions.close')}
                aria-label={t('list_actions.close')}
              >
                <CloseLoanIcon />
              </Link>
            )}
            {isOpen && perms?.canPartialPay && (
              <Link
                to={`/part-payments/record?loanId=${loan.id}`}
                className={cn(iconClass, loan.bankDepositStatus ? 'pointer-events-none opacity-40' : '')}
                title={t('list_actions.part_payment')}
                aria-label={t('list_actions.part_payment')}
              >
                <PaymentIcon />
              </Link>
            )}
          </div>
        }
      />

      {loan.loanHistory.length > 0 && (
        <TableCard className="mb-6">
          <div className="border-b border-zinc-950/5 px-6 py-4">
            <CardTitle>{t('detail.loan_history')}</CardTitle>
          </div>
          <DataTable>
            <THead>
              <tr>
                <TH>{t('detail.sl_no')}</TH>
                <TH>{t('detail.history_paid')}</TH>
                <TH>{t('detail.history_topup')}</TH>
                <TH>{t('detail.history_date')}</TH>
              </tr>
            </THead>
            <TBody>
              {loan.loanHistory.map((entry, index) => (
                <tr key={entry.loanId}>
                  <TD>{index + 1}</TD>
                  <TD className="font-medium">{formatMoney(entry.paidAmount)}</TD>
                  <TD className="font-medium">{formatMoney(entry.topUpAmount)}</TD>
                  <TD>{formatDateIN(entry.settledDate)}</TD>
                </tr>
              ))}
            </TBody>
          </DataTable>
        </TableCard>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardTitle>{t('detail.loan')}</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">{t('fields.loan_date')}</dt>
              <dd className="font-medium">{formatDateIN(loan.loanDate)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">{t('detail.renewal')}</dt>
              <dd className="font-medium">{formatDateIN(loan.renewalDate)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">{t('detail.amount')}</dt>
              <dd className="font-semibold text-zinc-900">{formatMoney(loan.loanAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">{t('detail.interest')}</dt>
              <dd className="font-medium">{loan.interest}%</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">{t('fields.commodity')}</dt>
              <dd className="font-medium">
                {localizedCommodity(loan.commodityTypeCode, loan.commodityTypeLabel, i18n.language)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">{t('fields.customer_type')}</dt>
              <dd className="font-medium">{loan.loanCustomerTypeLabel}</dd>
            </div>
            {showGoldNet && (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">{t('fields.gold_net_wt')}</dt>
                <dd className="font-medium">{loan.netWeightGold}</dd>
              </div>
            )}
            {showSilverNet && (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">{t('fields.silver_net_wt')}</dt>
                <dd className="font-medium">{loan.netWeightSilver}</dd>
              </div>
            )}
            {loan.loanAmountWords && (
              <div className="border-t border-zinc-100 pt-2">
                <dt className="text-zinc-500">{t('fields.amount_words')}</dt>
                <dd className="mt-1 font-medium">{formatAmountInWords(loan.loanAmountWords)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardTitle>{t('detail.customer')}</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{t('detail.name')}</dt>
              <dd className="text-right font-medium">{loan.customer.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{t('detail.customer_id')}</dt>
              <dd className="font-medium">#{loan.customer.customerId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{t('detail.father_husband')}</dt>
              <dd className="text-right font-medium">{loan.customer.fatherHusbandName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">{t('detail.mobile')}</dt>
              <dd className="font-medium">{loan.customer.mobileNo || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{t('detail.address')}</dt>
              <dd className="text-right font-medium">{loan.customer.address1}</dd>
            </div>
          </dl>
        </Card>

        {calc ? (
          <Card className="bg-zinc-50">
            <CardTitle>{t('detail.interest_today')}</CardTitle>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">{t('detail.interest_amount')}</dt>
                <dd className="font-semibold text-zinc-950">{formatMoney(calc.interestAmount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">{t('detail.capital_interest')}</dt>
                <dd className="font-semibold text-zinc-950">{formatMoney(calc.totalPayable)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">{t('detail.amount_paid')}</dt>
                <dd className="font-medium">{formatMoney(partPaymentTotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2">
                <dt className="font-medium text-zinc-700">{t('detail.amount_to_pay')}</dt>
                <dd className="text-lg font-semibold text-emerald-700">{formatMoney(amountToPay)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">{t('detail.total_months')}</dt>
                <dd className="font-medium">{calc.totalMonths}</dd>
              </div>
              <div className="text-xs text-zinc-500">{calc.dateBreakdown}</div>
            </dl>
          </Card>
        ) : breakdown ? (
          <Card className="bg-zinc-50">
            <CardTitle>{t('detail.settlement_summary')}</CardTitle>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">{t('detail.interest_amount')}</dt>
                <dd className="font-medium">{formatMoney(breakdown.interestAmount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">{t('detail.total_months')}</dt>
                <dd className="font-medium">{breakdown.totalMonths}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">{t('detail.total_payable')}</dt>
                <dd className="font-semibold">{formatMoney(breakdown.totalPayable)}</dd>
              </div>
              {breakdown.discount > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{t('detail.discount')}</dt>
                  <dd className="font-medium text-emerald-700">{formatMoney(breakdown.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2">
                <dt className="font-medium text-zinc-700">{t('detail.net_payable')}</dt>
                <dd className="text-lg font-semibold text-emerald-700">{formatMoney(breakdown.netPayable)}</dd>
              </div>
              {loan.settlementStatus === 2 && breakdown.topUpAmount > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{t('detail.renewal_topup')}</dt>
                  <dd className="font-medium">{formatMoney(breakdown.topUpAmount)}</dd>
                </div>
              )}
              {(loan.isBillSettled === 1 || loan.isBillSettled === 2) && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{t('detail.bill_settled')}</dt>
                  <dd className="font-medium">{billSettledLabel(loan.isBillSettled, t)}</dd>
                </div>
              )}
              {loan.loanSettledDate && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{t('detail.settled_date')}</dt>
                  <dd className="font-medium">{formatDateIN(loan.loanSettledDate)}</dd>
                </div>
              )}
            </dl>
          </Card>
        ) : !isOpen && loan.settledAmount > 0 ? (
          <Card className="bg-zinc-50">
            <CardTitle>{t('detail.settlement_summary')}</CardTitle>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">{t('detail.settled_amount')}</dt>
                <dd className="font-semibold">{formatMoney(loan.settledAmount)}</dd>
              </div>
              {loan.loanSettledDate && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{t('detail.settled_date')}</dt>
                  <dd className="font-medium">{formatDateIN(loan.loanSettledDate)}</dd>
                </div>
              )}
              {(loan.isBillSettled === 1 || loan.isBillSettled === 2) && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{t('detail.bill_settled')}</dt>
                  <dd className="font-medium">{billSettledLabel(loan.isBillSettled, t)}</dd>
                </div>
              )}
            </dl>
          </Card>
        ) : (
          <Card className="bg-zinc-50">
            <CardTitle>{t('detail.interest_today')}</CardTitle>
            <p className="mt-4 text-sm text-zinc-500">—</p>
          </Card>
        )}
      </div>

      <TableCard className="mb-6">
        <div className="border-b border-zinc-950/5 px-6 py-4">
          <CardTitle>{t('sections.collateral')}</CardTitle>
        </div>
        <DataTable>
          <THead>
            <tr>
              <TH>{t('detail.sl_no')}</TH>
              <TH>{t('collateral.sub_category')}</TH>
              <TH>{t('collateral.item')}</TH>
              <TH>{t('collateral.purity')}</TH>
              <TH>{t('collateral.qty')}</TH>
              <TH>{t('collateral.net_wt')}</TH>
            </tr>
          </THead>
          <TBody>
            {loan.items.map((item, index) => {
              const names = localizedItemNames(item, i18n.language);
              return (
                <tr key={item.id}>
                  <TD>{index + 1}</TD>
                  <TD>{names.subCategory}</TD>
                  <TD>{names.item}</TD>
                  <TD>
                    {loan.commodityTypeCode === 'silver'
                      ? t('collateral.purity_na')
                      : names.purity}
                  </TD>
                  <TD>{item.noOfItems}</TD>
                  <TD>{item.netWeight}</TD>
                </tr>
              );
            })}
          </TBody>
        </DataTable>
      </TableCard>

      <LoanRelatedTabs loan={loan} />

      <Card className="mb-6">
        <CardTitle>{t('detail.condition')}</CardTitle>
        <p className="mt-3 text-sm font-semibold text-fuchsia-700">{conditionText}</p>
      </Card>

      <div className="flex items-center justify-between">
        <Link to="/loans" className="text-sm/6 font-medium text-zinc-500 no-underline hover:text-zinc-950 hover:underline">
          ← {t('detail.back')}
        </Link>
        {loan.settlementStatus === 0 && (
          <Link to={`/loans/${loan.id}/edit`} className="no-underline">
            <Button>{t('detail.edit')}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
