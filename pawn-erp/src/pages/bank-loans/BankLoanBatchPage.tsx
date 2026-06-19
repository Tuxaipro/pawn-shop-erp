import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { bankLoansApi, type EligibleLoanItem } from '../../api/bankLoans';
import { useBranch } from '../../context/BranchContext';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Section } from '../../components/ui/Section';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function BankLoanBatchPage() {
  const { t } = useTranslation(['bankLoan', 'common']);
  const { branchId } = useBranch();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [bankName, setBankName] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptNo, setReceiptNo] = useState('');
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bank-loans', 'eligible', branchId, page, search],
    queryFn: () => bankLoansApi.eligibleLoans(branchId, { page, limit: 20, search: search || undefined }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      bankLoansApi.createBatch(branchId, {
        bankName,
        depositDate,
        receiptNo: receiptNo || undefined,
        items: Object.entries(selected).map(([loanId, depositAmount]) => ({
          loanId: Number(loanId),
          depositAmount,
        })),
      }),
    onSuccess: (result) => {
      setSuccessCount(result.successCount);
      setSelected({});
      queryClient.invalidateQueries({ queryKey: ['bank-loans'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const items = data?.items ?? [];
  const selectedCount = Object.keys(selected).length;

  const allOnPageSelected = useMemo(
    () => items.length > 0 && items.every((i) => selected[i.id] != null),
    [items, selected]
  );

  function toggleRow(row: EligibleLoanItem) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[row.id] != null) {
        delete next[row.id];
      } else {
        next[row.id] = row.loanAmount;
      }
      return next;
    });
  }

  function toggleAllOnPage() {
    if (allOnPageSelected) {
      setSelected((prev) => {
        const next = { ...prev };
        items.forEach((i) => delete next[i.id]);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = { ...prev };
        items.forEach((i) => {
          next[i.id] = i.loanAmount;
        });
        return next;
      });
    }
  }

  function updateAmount(loanId: number, amount: string) {
    setSelected((prev) => ({ ...prev, [loanId]: Number(amount) || 0 }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessCount(null);
    if (!bankName || selectedCount === 0) {
      setError(t('common:errors.save_failed'));
      return;
    }
    mutation.mutate();
  }

  if (successCount != null) {
    return (
      <Card className="max-w-lg">
        <CardTitle>{t('batch.success', { count: successCount })}</CardTitle>
        <div className="mt-4 flex gap-2">
          <Link to="/bank-loans" className="no-underline">
            <Button type="button">{t('nav.list')}</Button>
          </Link>
          <Button type="button" variant="secondary" onClick={() => setSuccessCount(null)}>
            {t('batch.title')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Section title={t('batch.title')}>
        <p className="mb-4 text-sm text-zinc-500">{t('batch.subtitle')}</p>
        <Field label={t('batch.search')} className="mb-4 max-w-md">
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </Field>

        {isLoading && <p className="text-sm text-zinc-500">{t('common:loading')}</p>}
        {!isLoading && items.length === 0 && <p className="text-sm text-zinc-500">{t('batch.empty')}</p>}

        {items.length > 0 && (
          <TableCard className="mb-6">
            <div className="flex items-center justify-between border-b border-zinc-950/5 px-6 py-3">
              <button type="button" className="text-sm font-medium text-zinc-600 hover:text-zinc-950" onClick={toggleAllOnPage}>
                {t('batch.select_all')}
              </button>
              <span className="text-sm text-zinc-500">{t('batch.selected', { count: selectedCount })}</span>
            </div>
            <DataTable>
              <THead>
                <tr>
                  <TH />
                  <TH>{t('columns.receipt')}</TH>
                  <TH>{t('columns.customer')}</TH>
                  <TH>{t('columns.amount')}</TH>
                  <TH>{t('fields.amount')}</TH>
                </tr>
              </THead>
              <TBody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <TD>
                      <input
                        type="checkbox"
                        checked={selected[row.id] != null}
                        onChange={() => toggleRow(row)}
                        aria-label={`Select ${row.invoiceNo}`}
                      />
                    </TD>
                    <TD className="font-medium">#{row.invoiceNo}</TD>
                    <TD>
                      <div>{row.customerName}</div>
                      <div className="text-xs text-zinc-500">{row.mobileNo}</div>
                    </TD>
                    <TD>{formatMoney(row.loanAmount)}</TD>
                    <TD>
                      {selected[row.id] != null && (
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          className="w-28"
                          value={selected[row.id]}
                          onChange={(e) => updateAmount(row.id, e.target.value)}
                        />
                      )}
                    </TD>
                  </tr>
                ))}
              </TBody>
            </DataTable>
            {data && (
              <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onPageChange={setPage} />
            )}
          </TableCard>
        )}
      </Section>

      <Card className="max-w-xl">
        <CardTitle>{t('batch.submit')}</CardTitle>
        {error && (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Field label={t('batch.bank_name')} required>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} required />
          </Field>
          <Field label={t('batch.deposit_date')} required>
            <Input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} required />
          </Field>
          <Field label={t('batch.bank_receipt')}>
            <Input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} />
          </Field>
          <Button type="submit" disabled={mutation.isPending || selectedCount === 0}>
            {mutation.isPending ? t('batch.submitting') : t('batch.submit')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
