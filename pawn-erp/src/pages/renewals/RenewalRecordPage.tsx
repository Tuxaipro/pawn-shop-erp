import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { loansApi } from '../../api/loans';
import { renewalsApi, type RenewLoanResult } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { amountInWords } from '../../lib/amountInWords';
import { LoanRecordSummary, type SettlementRow } from '../../components/loans/LoanRecordSummary';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { Section } from '../../components/ui/Section';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RenewalRecordPage() {
  const { t } = useTranslation(['renewal', 'common']);
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

  const [loanDate, setLoanDate] = useState(new Date().toISOString().slice(0, 10));
  const [newInvoiceNo, setNewInvoiceNo] = useState('');
  const [newLoanAmount, setNewLoanAmount] = useState('');
  const [loanAmountWords, setLoanAmountWords] = useState('');
  const [interestDisAmt, setInterestDisAmt] = useState('0');
  const [securityPin, setSecurityPin] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState<RenewLoanResult | null>(null);

  useEffect(() => {
    const id = searchParams.get('loanId');
    const invoice = searchParams.get('invoiceNo');
    if (id) setResolvedLoanId(Number(id));
    if (invoice) setReceiptNo(invoice);
    setSuccess(null);
  }, [searchParams]);

  const loanId = resolvedLoanId ?? 0;

  const { data: loan, isLoading: loanLoading, error: loanError } = useQuery({
    queryKey: ['loans', branchId, loanId],
    queryFn: () => loansApi.get(loanId, branchId),
    enabled: loanId > 0 && !success,
  });

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['renewals', 'preview', branchId, loanId, loanDate],
    queryFn: () => renewalsApi.preview(loanId, branchId, loanDate),
    enabled: loanId > 0 && loan?.settlementStatus === 0 && !success,
  });

  useEffect(() => {
    if (!loan || success) return;
    setNewLoanAmount(String(loan.loanAmount));
    setLoanAmountWords(amountInWords(loan.loanAmount));
  }, [loan?.id, loan?.loanAmount, success]);

  useEffect(() => {
    const amount = Number(newLoanAmount);
    if (amount > 0) {
      setLoanAmountWords(amountInWords(amount));
    }
  }, [newLoanAmount]);

  const renewMutation = useMutation({
    mutationFn: () =>
      renewalsApi.renew(loanId, branchId, {
        newInvoiceNo: Number(newInvoiceNo),
        newLoanAmount: Number(newLoanAmount),
        loanAmountWords,
        loanDate,
        interestDisAmt: Number(interestDisAmt) || 0,
        securityPin,
      }),
    onSuccess: (result) => {
      setSuccess(result);
      queryClient.invalidateQueries({ queryKey: ['renewals'] });
      queryClient.invalidateQueries({ queryKey: ['loans', branchId] });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  async function handleFetch() {
    setLookupError(null);
    setSuccess(null);
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
  const hasBankDeposit = loan?.bankDeposits?.some((b) => !b.isBankSettled) ?? false;
  const canRenew = isOpen && !hasBankDeposit && preview?.canRenew !== false;
  const calc = preview?.calculation;
  const partPaymentTotal = preview?.partPaymentTotal ?? loan?.partPayments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const amountDue = calc?.netPayable ?? 0;
  const discount = Number(interestDisAmt) || 0;
  const dueAfterDiscount = Math.max(0, amountDue - discount);
  const newAmount = Number(newLoanAmount) || 0;
  const oldAmount = loan?.loanAmount ?? 0;
  const topUp = Math.max(0, newAmount - oldAmount);
  const cashFromCustomer = Math.max(0, dueAfterDiscount - newAmount);
  const cashToCustomer = Math.max(0, newAmount - dueAfterDiscount);

  const isOverdue = useMemo(() => {
    if (!loan?.renewalDate) return false;
    const renewal = new Date(loan.renewalDate);
    renewal.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return renewal < today;
  }, [loan?.renewalDate]);

  const settlementRows: SettlementRow[] = calc
    ? [
        { label: t('record.outstanding'), value: oldAmount },
        { label: t('record.interest'), value: calc.interestAmount },
        { label: t('record.total_payable'), value: calc.totalPayable, emphasize: 'semibold' },
        { label: t('record.part_paid'), value: partPaymentTotal },
        { label: t('record.amount_due'), value: amountDue, emphasize: 'due', borderTop: true },
        ...(calc.totalMonths != null
          ? [{ label: tLoan('detail.total_months'), value: calc.totalMonths, raw: true }]
          : []),
      ]
    : [];

  function resetWizard() {
    setSuccess(null);
    setResolvedLoanId(null);
    setReceiptNo('');
    setNewInvoiceNo('');
    setSecurityPin('');
    setFormError('');
    setLookupError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!newInvoiceNo || !newLoanAmount || !loanDate || !securityPin) {
      setFormError(t('record.errors.required'));
      return;
    }
    if (Number(newLoanAmount) <= 0) {
      setFormError(t('record.errors.invalid_amount'));
      return;
    }
    try {
      const check = await loansApi.checkInvoice(Number(newInvoiceNo), branchId);
      if (!check.available) {
        setFormError(t('record.errors.duplicate_invoice'));
        return;
      }
    } catch {
      /* proceed — server validates */
    }
    renewMutation.mutate();
  }

  if (success) {
    return (
      <Card className="max-w-xl">
        <CardTitle>{t('record.success_title')}</CardTitle>
        <p className="mt-3 text-sm text-zinc-600">
          {t('record.success_body', {
            oldReceipt: success.oldInvoiceNo,
            newReceipt: success.newLoan.invoiceNo,
          })}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to={`/loans/${success.newLoan.id}`} className="no-underline">
            <Button type="button">{t('record.view_new')}</Button>
          </Link>
          <a
            href={`/loans/${success.newLoan.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline"
          >
            <Button type="button" variant="secondary">
              {t('record.print_new')}
            </Button>
          </a>
          <Button type="button" variant="secondary" onClick={resetWizard}>
            {t('record.renew_another')}
          </Button>
        </div>
      </Card>
    );
  }

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
      {(loanLoading || previewLoading) && loanId > 0 && (
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
          {isOpen && !hasBankDeposit && preview && !preview.canRenew && (
            <div className="mb-6">
              <Alert>{t('record.cannot_renew')}</Alert>
            </div>
          )}

          <LoanRecordSummary
            loan={loan}
            settlementTitle={t('record.settlement')}
            settlementRows={settlementRows}
            showLoanHistory
            extraBadges={
              isOverdue ? <Badge variant="danger">{t('record.overdue_hint')}</Badge> : undefined
            }
          />

          {canRenew && (
            <Card className="max-w-2xl">
              <CardTitle>{t('record.new_loan')}</CardTitle>
              {formError && (
                <div className="mt-4">
                  <Alert>{formError}</Alert>
                </div>
              )}
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('record.renewal_date')} required>
                    <Input
                      type="date"
                      value={loanDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setLoanDate(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label={t('record.new_receipt')} required>
                    <Input
                      type="number"
                      min={1}
                      value={newInvoiceNo}
                      onChange={(e) => setNewInvoiceNo(e.target.value)}
                      required
                    />
                  </Field>
                </div>
                <Field label={t('record.new_amount')} required>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={newLoanAmount}
                    onChange={(e) => setNewLoanAmount(e.target.value)}
                    required
                  />
                </Field>
                <Field label={tLoan('fields.amount_words')}>
                  <Input value={loanAmountWords} readOnly className="bg-zinc-50" />
                </Field>
                <Field label={t('record.discount')}>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={interestDisAmt}
                    onChange={(e) => setInterestDisAmt(e.target.value)}
                  />
                </Field>
                <dl className="grid gap-2 rounded-lg bg-zinc-50 p-4 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
                    <dt className="text-zinc-500">{t('record.due_after_discount')}</dt>
                    <dd className="font-semibold">{formatMoney(dueAfterDiscount)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
                    <dt className="text-zinc-500">{t('record.top_up')}</dt>
                    <dd className="font-semibold">{formatMoney(topUp)}</dd>
                  </div>
                  {cashFromCustomer > 0 && (
                    <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
                      <dt className="text-zinc-500">{t('record.cash_from_customer')}</dt>
                      <dd className="font-semibold text-emerald-700">{formatMoney(cashFromCustomer)}</dd>
                    </div>
                  )}
                  {cashToCustomer > 0 && (
                    <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
                      <dt className="text-zinc-500">{t('record.cash_to_customer')}</dt>
                      <dd className="font-semibold">{formatMoney(cashToCustomer)}</dd>
                    </div>
                  )}
                </dl>
                <Field label={t('record.security_pin')} required>
                  <Input
                    type="password"
                    value={securityPin}
                    onChange={(e) => setSecurityPin(e.target.value)}
                    required
                  />
                </Field>
                <p className="text-xs text-zinc-500">{tLoan('fields.security_pin_hint')}</p>
                <Button type="submit" disabled={renewMutation.isPending}>
                  {renewMutation.isPending ? t('record.submitting') : t('record.submit')}
                </Button>
              </form>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
