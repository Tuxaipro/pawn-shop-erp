import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { loansApi } from '../../api/loans';
import { repledgesApi } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { PageHeader } from '../../components/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';

export function LoanBankLoanPage() {
  const { t } = useTranslation(['loan', 'common']);
  const { branchId } = useBranch();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const loanId = Number(id);
  const [bankName, setBankName] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptNo, setReceiptNo] = useState('');
  const [error, setError] = useState('');

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loans', branchId, loanId],
    queryFn: () => loansApi.get(loanId, branchId),
    enabled: !Number.isNaN(loanId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      repledgesApi.create(branchId, {
        loanId,
        bankName: bankName.trim(),
        depositAmount: Number(depositAmount),
        depositDate,
        receiptNo: receiptNo.trim() || undefined,
      }),
    onSuccess: () => navigate('/loans'),
    onError: (e: Error) => setError(e.message),
  });

  if (isLoading) return <p className="text-sm text-zinc-500">{t('loading')}</p>;
  if (!loan) return <p>{t('not_found')}</p>;
  if (loan.settlementStatus !== 0) return <Alert>{t('only_open_editable')}</Alert>;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!bankName.trim() || !depositAmount) {
      setError(t('bank_loan.errors.required'));
      return;
    }
    mutation.mutate();
  };

  return (
    <div>
      <PageHeader
        title={t('bank_loan.title')}
        subtitle={t('subtitle_edit_receipt', { invoiceNo: loan.invoiceNo })}
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <Card className="max-w-xl p-4">
        <p className="mb-4 text-sm text-zinc-600">{loan.customer.name}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('bank_loan.bank_name')} required>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} required />
          </Field>
          <Field label={t('bank_loan.amount')} required>
            <Input type="number" min="0" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
          </Field>
          <Field label={t('bank_loan.deposit_date')} required>
            <Input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} required />
          </Field>
          <Field label={t('bank_loan.receipt_no')}>
            <Input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>{t('bank_loan.submit')}</Button>
            <Link to="/loans" className="no-underline">
              <Button type="button" variant="secondary">{t('common:actions.cancel')}</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
