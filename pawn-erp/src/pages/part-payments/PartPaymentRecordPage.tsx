import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { interestApi } from '../../api/modules';
import { loansApi, type LoanDetail } from '../../api/loans';
import { useBranch } from '../../context/BranchContext';
import { formatAmountInWords } from '../../lib/amountInWords';
import { formatLoanConditionText } from '../../lib/loanConditionText';
import { formatDateIN } from '../../lib/formatDate';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { Section } from '../../components/ui/Section';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PartPaymentRecordPage() {
  const { t } = useTranslation(['partPayment', 'common']);
  const { t: tLoan } = useTranslation('loan');
  const { branchId } = useBranch();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const loanIdFromUrl = searchParams.get('loanId');
  const invoiceFromUrl = searchParams.get('invoiceNo');
  const [receiptNo, setReceiptNo] = useState(invoiceFromUrl ?? '');
  const [resolvedLoanId, setResolvedLoanId] = useState<number | null>(
    loanIdFromUrl ? Number(loanIdFromUrl) : null
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const id = searchParams.get('loanId');
    const invoice = searchParams.get('invoiceNo');
    if (id) setResolvedLoanId(Number(id));
    if (invoice) setReceiptNo(invoice);
  }, [searchParams]);

  const loanId = resolvedLoanId ?? 0;

  const { data: loan, isLoading: loanLoading, error: loanError, refetch: refetchLoan } = useQuery({
    queryKey: ['loans', branchId, loanId],
    queryFn: () => loansApi.get(loanId, branchId),
    enabled: loanId > 0,
  });

  const { data: interest, refetch: refetchInterest } = useQuery({
    queryKey: ['interest', branchId, loanId],
    queryFn: () => interestApi.forLoan(loanId, branchId),
    enabled: loanId > 0 && loan?.settlementStatus === 0,
  });

  useEffect(() => {
    if (loan?.invoiceNo) setReceiptNo(String(loan.invoiceNo));
  }, [loan?.invoiceNo]);

  const mutation = useMutation({
    mutationFn: () =>
      interestApi.addPartPayment(branchId, { loanId, amount: Number(amount), payDate }),
    onSuccess: () => {
      setAmount('');
      queryClient.invalidateQueries({ queryKey: ['interest', branchId, loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans', branchId, loanId] });
      queryClient.invalidateQueries({ queryKey: ['part-payments', branchId] });
      refetchLoan();
      refetchInterest();
    },
  });

  async function handleFetch() {
    setLookupError(null);
    setResolvedLoanId(null);

    if (loanIdFromUrl && !receiptNo) {
      setResolvedLoanId(Number(loanIdFromUrl));
      return;
    }

    const invoice = Number(receiptNo);
    if (!invoice || Number.isNaN(invoice)) {
      setLookupError(t('record.not_found'));
      return;
    }

    try {
      const result = await loansApi.list(branchId, {
        page: 1,
        limit: 1,
        settlementStatus: 0,
        invoiceNo: invoice,
      });
      const found = result.items[0];
      if (!found) {
        setLookupError(t('record.not_found'));
        return;
      }
      setResolvedLoanId(found.id);
    } catch (e) {
      setLookupError((e as Error).message);
    }
  }

  const isOpen = loan?.settlementStatus === 0;
  const hasBankDeposit = (loan?.bankDeposits?.length ?? 0) > 0;
  const canPay = isOpen && !hasBankDeposit;
  const conditionText = loan ? formatLoanConditionText(loan as LoanDetail, tLoan) : '';
  const showGoldNet = loan?.commodityTypeCode === 'gold' && (loan?.netWeightGold ?? 0) > 0;
  const showSilverNet = loan?.commodityTypeCode === 'silver' && (loan?.netWeightSilver ?? 0) > 0;

  const calc = interest?.calculation;
  const totalPayable = calc?.totalPayable ?? loan?.interestCalculation?.totalPayable ?? 0;
  const interestAmount = calc?.interestAmount ?? loan?.interestCalculation?.interestAmount ?? 0;
  const partPaymentTotal =
    calc?.partPaymentTotal ?? loan?.partPayments.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const amountToPay = calc?.netPayable ?? Math.max(0, totalPayable - partPaymentTotal);

  return (
    <div>
      <Section title={t('record.title')}>
        <p className="mb-4 text-sm text-zinc-500">{t('record.subtitle')}</p>
        <Card className="max-w-xl">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void handleFetch();
            }}
          >
            <Field label={t('record.receipt_no')}>
              <Input
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                placeholder="e.g. 1001"
              />
            </Field>
            <Button type="submit" disabled={!receiptNo && !loanIdFromUrl}>
              {loanLoading ? t('record.fetching') : t('record.fetch')}
            </Button>
          </form>
          {lookupError && (
            <div className="mt-4">
              <Alert>{lookupError}</Alert>
            </div>
          )}
        </Card>
      </Section>

      {loanError && (
        <div className="mb-6">
          <Alert>{(loanError as Error).message}</Alert>
        </div>
      )}
      {loanLoading && loanId > 0 && (
        <p className="text-sm/6 text-zinc-500">{t('common:loading')}</p>
      )}

      {loan && (
        <>
          {!isOpen && (
            <div className="mb-6">
              <Alert>{t('record.closed_loan')}</Alert>
            </div>
          )}
          {hasBankDeposit && (
            <div className="mb-6">
              <Alert>{t('record.bank_deposit')}</Alert>
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-center gap-3 mt-6">
            <h2 className="text-lg font-semibold text-zinc-950">
              {tLoan('columns.receipt')}
              <span className="ml-3">#{loan.invoiceNo}</span>
            </h2>
            <Badge variant={loan.settlementStatusLabel as 'open' | 'closed' | 'renewed'}>
              {tLoan(`settlement.${loan.settlementStatusLabel}`)}
            </Badge>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-3 lg:items-start">
            <Card className="h-full">
              <CardTitle>{t('detail.loan')}</CardTitle>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-zinc-500">{tLoan('fields.loan_date')}</dt>
                  <dd className="text-right font-medium">{formatDateIN(loan.loanDate)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-zinc-500">{tLoan('detail.renewal')}</dt>
                  <dd className="text-right font-medium">{loan.renewalDate}</dd>
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
                  <dd className="text-right font-medium">{loan.commodityTypeLabel}</dd>
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
              <CardTitle>{t('detail.customer')}</CardTitle>
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
              <CardTitle>{t('detail.interest')}</CardTitle>
              {loan.interestCalculation || interest?.calculation ? (
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-zinc-500">{tLoan('detail.interest_amount')}</dt>
                    <dd className="text-right font-medium">{formatMoney(interestAmount)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-zinc-500">{tLoan('detail.capital_interest')}</dt>
                    <dd className="text-right font-semibold">{formatMoney(totalPayable)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="shrink-0 text-zinc-500">{t('detail.amount_paid')}</dt>
                    <dd className="text-right font-medium">{formatMoney(partPaymentTotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-zinc-100 pt-2">
                    <dt className="shrink-0 font-medium text-zinc-700">{t('detail.amount_to_pay')}</dt>
                    <dd className="text-right text-lg font-semibold text-emerald-700">
                      {formatMoney(amountToPay)}
                    </dd>
                  </div>
                  {(calc?.totalMonths ?? loan.interestCalculation?.totalMonths) != null && (
                    <div className="flex justify-between gap-4">
                      <dt className="shrink-0 text-zinc-500">{tLoan('detail.total_months')}</dt>
                      <dd className="text-right font-medium">
                        {calc?.totalMonths ?? loan.interestCalculation?.totalMonths}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">—</p>
              )}
            </Card>
          </div>

          {loan.items.length > 0 && (
            <TableCard className="mb-6">
              <div className="border-b border-zinc-950/5 px-6 py-4">
                <CardTitle>{t('detail.items')}</CardTitle>
              </div>
              <DataTable>
                <THead>
                  <tr>
                    <TH>{tLoan('detail.sl_no')}</TH>
                    <TH>{tLoan('print.commodity_sub_type')}</TH>
                    <TH>{tLoan('print.item_division')}</TH>
                    <TH>{tLoan('print.purity')}</TH>
                    <TH>{tLoan('print.qty')}</TH>
                    <TH>{tLoan('print.net_weight')}</TH>
                  </tr>
                </THead>
                <TBody>
                  {loan.items.map((item, index) => (
                    <tr key={item.id}>
                      <TD>{index + 1}</TD>
                      <TD>{item.subCategoryName}</TD>
                      <TD>{item.itemName}</TD>
                      <TD>{item.purityName}</TD>
                      <TD>{item.noOfItems}</TD>
                      <TD>{item.netWeight}</TD>
                    </tr>
                  ))}
                </TBody>
              </DataTable>
              {conditionText && (
                <p className="border-t border-zinc-100 px-6 py-3 text-xs leading-relaxed text-zinc-600">
                  {conditionText}
                </p>
              )}
            </TableCard>
          )}

          {loan.partPayments.length > 0 && (
            <TableCard className="mb-6">
              <div className="border-b border-zinc-950/5 px-6 py-4">
                <CardTitle>{t('detail.existing_payments')}</CardTitle>
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

          {canPay && (
            <Card className="max-w-xl">
              <CardTitle>{t('detail.add_payment')}</CardTitle>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <Field label={t('fields.amount')}>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
                <Field label={t('fields.pay_date')}>
                  <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </Field>
                <Button
                  type="button"
                  onClick={() => mutation.mutate()}
                  disabled={!amount || mutation.isPending}
                >
                  {t('actions.save')}
                </Button>
              </div>
              {mutation.error && (
                <div className="mt-4">
                  <Alert>{(mutation.error as Error).message}</Alert>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
