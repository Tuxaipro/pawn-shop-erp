import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { LoanDetail } from '../../api/loans';
import { formatAmountInWords } from '../../lib/amountInWords';
import { formatLoanConditionText } from '../../lib/loanConditionText';
import { formatDateIN } from '../../lib/formatDate';
import { localizedCommodity, localizedItemNames } from '../../lib/localizedItem';
import { Badge } from '../ui/Badge';
import { Card, CardTitle } from '../ui/Card';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../ui/Table';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type SettlementRow = {
  label: string;
  value: number | string;
  emphasize?: 'semibold' | 'due';
  borderTop?: boolean;
  /** Render the value as-is (e.g. a month count) instead of money. */
  raw?: boolean;
};

type Props = {
  loan: LoanDetail;
  settlementTitle: string;
  settlementRows: SettlementRow[];
  showLoanHistory?: boolean;
  showPartPayments?: boolean;
  extraBadges?: ReactNode;
};

export function LoanRecordSummary({
  loan,
  settlementTitle,
  settlementRows,
  showLoanHistory = false,
  showPartPayments = false,
  extraBadges,
}: Props) {
  const { t: tLoan, i18n } = useTranslation('loan');
  const conditionText = formatLoanConditionText(loan, tLoan);
  const showGoldNet = loan.commodityTypeCode === 'gold' && loan.netWeightGold > 0;
  const showSilverNet = loan.commodityTypeCode === 'silver' && loan.netWeightSilver > 0;

  return (
    <>
      <div className="mt-6 mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-zinc-950">
          {tLoan('columns.receipt')}
          <span className="ml-3">#{loan.invoiceNo}</span>
        </h2>
        <Badge variant={loan.settlementStatusLabel as 'open' | 'closed' | 'renewed'}>
          {tLoan(`settlement.${loan.settlementStatusLabel}`)}
        </Badge>
        {extraBadges}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3 lg:items-start">
        <Card className="h-full">
          <CardTitle>{tLoan('detail.loan')}</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{tLoan('fields.loan_date')}</dt>
              <dd className="text-right font-medium">{formatDateIN(loan.loanDate)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{tLoan('detail.renewal')}</dt>
              <dd className="text-right font-medium">{formatDateIN(loan.renewalDate)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{tLoan('detail.amount')}</dt>
              <dd className="text-right font-semibold">{formatMoney(loan.loanAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{tLoan('detail.interest')}</dt>
              <dd className="text-right font-medium">{loan.interest}%</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{tLoan('fields.commodity')}</dt>
              <dd className="text-right font-medium">
                {localizedCommodity(loan.commodityTypeCode, loan.commodityTypeLabel, i18n.language)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{tLoan('fields.customer_type')}</dt>
              <dd className="text-right font-medium">{loan.loanCustomerTypeLabel}</dd>
            </div>
            {showGoldNet && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-zinc-500">{tLoan('fields.gold_net_wt')}</dt>
                <dd className="text-right font-medium">{loan.netWeightGold}</dd>
              </div>
            )}
            {showSilverNet && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-zinc-500">{tLoan('fields.silver_net_wt')}</dt>
                <dd className="text-right font-medium">{loan.netWeightSilver}</dd>
              </div>
            )}
            {loan.loanAmountWords && (
              <div className="border-t border-zinc-100 pt-2">
                <dt className="text-zinc-500">{tLoan('fields.amount_words')}</dt>
                <dd className="mt-1 text-right font-medium">{formatAmountInWords(loan.loanAmountWords)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="h-full">
          <CardTitle>{tLoan('detail.customer')}</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{tLoan('columns.customer')}</dt>
              <dd className="text-right font-medium">{loan.customer.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{tLoan('print.father_address')}</dt>
              <dd className="text-right font-medium">{loan.customer.fatherHusbandName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{tLoan('print.address')}</dt>
              <dd className="text-right font-medium">{loan.customer.address1}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-zinc-500">{tLoan('print.name_mobile')}</dt>
              <dd className="text-right font-medium">{loan.customer.mobileNo || '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card className="h-full">
          <CardTitle>{settlementTitle}</CardTitle>
          {settlementRows.length > 0 ? (
            <dl className="mt-4 space-y-2 text-sm">
              {settlementRows.map((row) => (
                <div
                  key={row.label}
                  className={`flex items-baseline justify-between gap-3${row.borderTop ? ' border-t border-zinc-100 pt-2' : ''}`}
                >
                  <dt
                    className={`min-w-0 text-zinc-500${row.emphasize === 'due' ? ' font-medium text-zinc-700' : ''}`}
                  >
                    {row.label}
                  </dt>
                  <dd
                    className={`shrink-0 whitespace-nowrap text-right${
                      row.emphasize === 'due'
                        ? ' text-lg font-semibold text-emerald-700'
                        : row.emphasize === 'semibold'
                          ? ' font-semibold'
                          : ' font-medium'
                    }`}
                  >
                    {row.raw ? row.value : formatMoney(Number(row.value))}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">—</p>
          )}
        </Card>
      </div>

      {showLoanHistory && loan.loanHistory.length > 0 && (
        <TableCard className="mb-6">
          <div className="border-b border-zinc-950/5 px-6 py-4">
            <CardTitle>{tLoan('detail.loan_history')}</CardTitle>
          </div>
          <DataTable>
            <THead>
              <tr>
                <TH>{tLoan('detail.sl_no')}</TH>
                <TH>{tLoan('detail.history_paid')}</TH>
                <TH>{tLoan('detail.history_topup')}</TH>
                <TH>{tLoan('detail.history_date')}</TH>
              </tr>
            </THead>
            <TBody>
              {loan.loanHistory.map((entry, index) => (
                <tr key={entry.loanId}>
                  <TD>{index + 1}</TD>
                  <TD>{formatMoney(entry.paidAmount)}</TD>
                  <TD>{formatMoney(entry.topUpAmount)}</TD>
                  <TD>{entry.settledDate ? formatDateIN(entry.settledDate) : '—'}</TD>
                </tr>
              ))}
            </TBody>
          </DataTable>
        </TableCard>
      )}

      {loan.items.length > 0 && (
        <TableCard className="mb-6">
          <div className="border-b border-zinc-950/5 px-6 py-4">
            <CardTitle>{tLoan('sections.collateral')}</CardTitle>
          </div>
          <DataTable>
            <THead>
              <tr>
                <TH>{tLoan('detail.sl_no')}</TH>
                <TH>{tLoan('collateral.sub_category')}</TH>
                <TH>{tLoan('collateral.item')}</TH>
                <TH>{tLoan('collateral.purity')}</TH>
                <TH>{tLoan('collateral.qty')}</TH>
                <TH>{tLoan('collateral.net_wt')}</TH>
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
                        ? tLoan('collateral.purity_na')
                        : names.purity}
                    </TD>
                    <TD>{item.noOfItems}</TD>
                    <TD>{item.netWeight}</TD>
                  </tr>
                );
              })}
            </TBody>
          </DataTable>
          {conditionText && (
            <p className="border-t border-zinc-100 px-6 py-3 text-xs leading-relaxed text-zinc-600">
              {conditionText}
            </p>
          )}
        </TableCard>
      )}

      {!loan.items.length && conditionText && (
        <p className="mb-6 text-sm font-medium text-fuchsia-900">{conditionText}</p>
      )}

      {showPartPayments && loan.partPayments.length > 0 && (
        <TableCard className="mb-6">
          <div className="border-b border-zinc-950/5 px-6 py-4">
            <CardTitle>{tLoan('detail.amount_paid')}</CardTitle>
          </div>
          <DataTable>
            <THead>
              <tr>
                <TH>{tLoan('detail.sl_no')}</TH>
                <TH>{tLoan('detail.amount')}</TH>
                <TH>{tLoan('detail.pay_date')}</TH>
              </tr>
            </THead>
            <TBody>
              {loan.partPayments.map((p, index) => (
                <tr key={p.id}>
                  <TD>{index + 1}</TD>
                  <TD className="font-medium">{formatMoney(p.amount)}</TD>
                  <TD>{formatDateIN(p.payDate)}</TD>
                </tr>
              ))}
            </TBody>
          </DataTable>
        </TableCard>
      )}
    </>
  );
}
