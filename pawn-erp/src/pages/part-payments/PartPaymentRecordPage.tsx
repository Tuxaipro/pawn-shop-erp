import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { interestApi } from '../../api/modules';
import { loansApi } from '../../api/loans';
import { useBranch } from '../../context/BranchContext';
import { LoanRecordSummary, type SettlementRow } from '../../components/loans/LoanRecordSummary';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { Section } from '../../components/ui/Section';

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
  const calc = interest?.calculation;
  const totalPayable = calc?.totalPayable ?? loan?.interestCalculation?.totalPayable ?? 0;
  const interestAmount = calc?.interestAmount ?? loan?.interestCalculation?.interestAmount ?? 0;
  const partPaymentTotal =
    calc?.partPaymentTotal ?? loan?.partPayments.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const amountToPay = calc?.netPayable ?? Math.max(0, totalPayable - partPaymentTotal);
  const totalMonths = calc?.totalMonths ?? loan?.interestCalculation?.totalMonths ?? null;

  const settlementRows: SettlementRow[] =
    loan && (loan.interestCalculation || calc)
      ? [
          { label: tLoan('detail.interest_amount'), value: interestAmount },
          { label: tLoan('detail.capital_interest'), value: totalPayable, emphasize: 'semibold' },
          { label: t('detail.amount_paid'), value: partPaymentTotal },
          { label: t('detail.amount_to_pay'), value: amountToPay, emphasize: 'due', borderTop: true },
          ...(totalMonths != null
            ? [{ label: tLoan('detail.total_months'), value: totalMonths, raw: true }]
            : []),
        ]
      : [];

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

          <LoanRecordSummary
            loan={loan}
            settlementTitle={t('detail.interest')}
            settlementRows={settlementRows}
            showPartPayments
          />

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
