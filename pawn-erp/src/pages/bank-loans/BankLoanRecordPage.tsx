import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bankLoansApi } from '../../api/bankLoans';
import { loansApi } from '../../api/loans';
import { useBranch } from '../../context/BranchContext';
import { formatDateIN } from '../../lib/formatDate';
import { LoanRecordSummary, type SettlementRow } from '../../components/loans/LoanRecordSummary';
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

export function BankLoanRecordPage() {
  const { t } = useTranslation(['bankLoan', 'loan', 'common']);
  const { t: tLoan } = useTranslation('loan');
  const { branchId } = useBranch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const loanIdFromUrl = searchParams.get('loanId');
  const [receiptNo, setReceiptNo] = useState(searchParams.get('invoiceNo') ?? '');
  const [resolvedLoanId, setResolvedLoanId] = useState<number | null>(
    loanIdFromUrl ? Number(loanIdFromUrl) : null
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [bankName, setBankName] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankReceiptNo, setBankReceiptNo] = useState('');

  const loanId = resolvedLoanId ?? 0;

  const { data: loan, isLoading: loanLoading, error: loanError } = useQuery({
    queryKey: ['loans', branchId, loanId],
    queryFn: () => loansApi.get(loanId, branchId),
    enabled: loanId > 0,
  });

  useEffect(() => {
    const id = searchParams.get('loanId');
    const invoice = searchParams.get('invoiceNo');
    if (id) setResolvedLoanId(Number(id));
    if (invoice) setReceiptNo(invoice);
  }, [searchParams]);

  useEffect(() => {
    if (loan?.invoiceNo) setReceiptNo(String(loan.invoiceNo));
  }, [loan?.invoiceNo]);

  const mutation = useMutation({
    mutationFn: () =>
      bankLoansApi.create(branchId, {
        loanId,
        bankName: bankName.trim(),
        depositAmount: Number(depositAmount),
        depositDate,
        receiptNo: bankReceiptNo.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-loans', branchId] });
      queryClient.invalidateQueries({ queryKey: ['loans', branchId, loanId] });
      navigate('/bank-loans');
    },
  });

  async function handleFetch() {
    setLookupError(null);
    setResolvedLoanId(null);

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
  const hasOpenDeposit = loan?.bankDeposits?.some((d) => !d.isBankSettled) ?? false;
  const canDeposit = isOpen && !hasOpenDeposit;
  const calc = loan?.interestCalculation;
  const partPaymentTotal =
    calc?.partPaymentTotal ?? loan?.partPayments.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const totalPayable = calc?.totalPayable ?? 0;
  const amountToPay = calc?.netPayable ?? Math.max(0, totalPayable - partPaymentTotal);

  const settlementRows: SettlementRow[] = calc
    ? [
        { label: tLoan('detail.interest_amount'), value: calc.interestAmount },
        { label: tLoan('detail.capital_interest'), value: calc.totalPayable, emphasize: 'semibold' },
        { label: t('detail.amount_paid'), value: partPaymentTotal },
        { label: t('detail.amount_to_pay'), value: amountToPay, emphasize: 'due', borderTop: true },
        ...(calc.totalMonths != null
          ? [{ label: tLoan('detail.total_months'), value: calc.totalMonths, raw: true }]
          : []),
      ]
    : [];
  const bankDeposits = loan?.bankDeposits ?? [];

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
          {hasOpenDeposit && (
            <div className="mb-6">
              <Alert>{t('record.already_deposited')}</Alert>
            </div>
          )}

          <LoanRecordSummary
            loan={loan}
            settlementTitle={t('detail.interest')}
            settlementRows={settlementRows}
          />

          {bankDeposits.length > 0 && (
            <TableCard className="mb-6">
              <div className="border-b border-zinc-950/5 px-6 py-4">
                <CardTitle>{t('detail.existing_deposits')}</CardTitle>
              </div>
              <DataTable>
                <THead>
                  <tr>
                    <TH>{tLoan('detail.sl_no')}</TH>
                    <TH>{tLoan('detail.bank_name')}</TH>
                    <TH>{tLoan('detail.amount')}</TH>
                    <TH>{tLoan('detail.deposit_date')}</TH>
                    <TH>{tLoan('columns.status')}</TH>
                  </tr>
                </THead>
                <TBody>
                  {bankDeposits.map((b, index) => (
                    <tr key={b.id}>
                      <TD>{index + 1}</TD>
                      <TD>{b.bankName}</TD>
                      <TD className="font-medium">{formatMoney(b.depositAmount)}</TD>
                      <TD>{formatDateIN(b.depositDate)}</TD>
                      <TD>
                        <Badge variant={b.isBankSettled ? 'closed' : 'open'}>
                          {b.isBankSettled ? t('status.settled') : t('status.open')}
                        </Badge>
                      </TD>
                    </tr>
                  ))}
                </TBody>
              </DataTable>
            </TableCard>
          )}

          {canDeposit && (
            <Card className="max-w-xl">
              <CardTitle>{t('detail.add_deposit')}</CardTitle>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <Field label={t('fields.bank_name')}>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} required />
                </Field>
                <Field label={t('fields.amount')}>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required
                  />
                </Field>
                <Field label={t('fields.deposit_date')}>
                  <Input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} required />
                </Field>
                <Field label={t('fields.receipt_no')}>
                  <Input value={bankReceiptNo} onChange={(e) => setBankReceiptNo(e.target.value)} />
                </Field>
                <Button
                  type="button"
                  onClick={() => mutation.mutate()}
                  disabled={!bankName.trim() || !depositAmount || mutation.isPending}
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
