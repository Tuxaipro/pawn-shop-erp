import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { loansApi } from '../../api/loans';
import { renewalsApi } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { LoanRecordSummary } from '../../components/loans/LoanRecordSummary';
import { PageHeader } from '../../components/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { todayISOLocal } from '../../lib/formatDate';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LoanClosePage() {
  const { t } = useTranslation(['loan', 'renewal', 'common']);
  const { branchId } = useBranch();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const loanId = Number(id);
  const [settledAmount, setSettledAmount] = useState('');
  const [loanSettledDate, setLoanSettledDate] = useState(todayISOLocal());
  const [interestDisAmt, setInterestDisAmt] = useState('0');
  const [securityPin, setSecurityPin] = useState('');
  const [error, setError] = useState('');

  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['loans', branchId, loanId],
    queryFn: () => loansApi.get(loanId, branchId),
    enabled: !Number.isNaN(loanId),
  });

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['renewals', 'preview', branchId, loanId],
    queryFn: () => renewalsApi.preview(loanId, branchId),
    enabled: !Number.isNaN(loanId) && loan?.settlementStatus === 0,
  });

  const calc = preview?.calculation;
  const partPaymentTotal =
    preview?.partPaymentTotal ?? loan?.partPayments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const amountDue = calc?.netPayable ?? 0;
  const discount = Number(interestDisAmt) || 0;
  const dueAfterDiscount = Math.max(0, amountDue - discount);

  useEffect(() => {
    if (calc && !settledAmount) {
      setSettledAmount(String(calc.netPayable));
    }
  }, [calc, settledAmount]);

  const mutation = useMutation({
    mutationFn: () =>
      renewalsApi.close(loanId, branchId, {
        settledAmount: Number(settledAmount),
        loanSettledDate,
        interestDisAmt: Number(interestDisAmt) || 0,
        securityPin,
      }),
    onSuccess: () => navigate('/loans'),
    onError: (e: Error) => setError(e.message),
  });

  if (loanLoading || previewLoading) {
    return <p className="text-sm text-zinc-500">{t('common:loading')}</p>;
  }
  if (!loan) return <p>{t('not_found')}</p>;
  if (loan.settlementStatus !== 0) return <Alert>{t('only_open_editable')}</Alert>;

  const hasBankDeposit = loan.bankDeposits?.some((b) => !b.isBankSettled) ?? false;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!settledAmount || !securityPin) {
      setError(t('close_loan.errors.required'));
      return;
    }
    mutation.mutate();
  };

  const settlementRows = calc
    ? [
        { label: t('renewal:record.outstanding'), value: loan.loanAmount },
        { label: t('renewal:record.interest'), value: calc.interestAmount },
        { label: t('renewal:record.total_payable'), value: calc.totalPayable, emphasize: 'semibold' as const },
        { label: t('renewal:record.part_paid'), value: partPaymentTotal },
        { label: t('renewal:record.amount_due'), value: amountDue, emphasize: 'due' as const, borderTop: true },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title={t('close_loan.title')}
        subtitle={t('subtitle_edit_receipt', { invoiceNo: loan.invoiceNo })}
      />

      {hasBankDeposit && (
        <div className="mb-6">
          <Alert>{t('renewal:record.bank_deposit')}</Alert>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <LoanRecordSummary
        loan={loan}
        settlementTitle={t('renewal:record.settlement')}
        settlementRows={settlementRows}
        showLoanHistory
        showPartPayments
      />

      <Card className="max-w-2xl">
        <CardTitle>{t('close_loan.title')}</CardTitle>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Field label={t('close_loan.settled_amount')} required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={settledAmount}
              onChange={(e) => setSettledAmount(e.target.value)}
              placeholder={calc ? String(calc.netPayable) : ''}
              required
            />
          </Field>
          <Field label={t('close_loan.settled_date')} required>
            <Input
              type="date"
              value={loanSettledDate}
              onChange={(e) => setLoanSettledDate(e.target.value)}
              required
            />
          </Field>
          <Field label={t('detail.discount')}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={interestDisAmt}
              onChange={(e) => setInterestDisAmt(e.target.value)}
            />
          </Field>
          {calc && (
            <dl className="grid gap-2 rounded-lg bg-zinc-50 p-4 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
                <dt className="text-zinc-500">{t('renewal:record.due_after_discount')}</dt>
                <dd className="font-semibold">{formatMoney(dueAfterDiscount)}</dd>
              </div>
            </dl>
          )}
          <Field label={t('fields.security_pin')} required>
            <Input
              type="password"
              value={securityPin}
              onChange={(e) => setSecurityPin(e.target.value)}
              required
            />
          </Field>
          <p className="text-xs text-zinc-500">{t('fields.security_pin_hint')}</p>
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending || hasBankDeposit}>
              {t('close_loan.submit')}
            </Button>
            <Link to={`/loans/${loan.id}`} className="no-underline">
              <Button type="button" variant="secondary">
                {t('common:actions.cancel')}
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
