import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { bankLoansApi } from '../../api/bankLoans';
import { useBranch } from '../../context/BranchContext';
import { formatDateIN } from '../../lib/formatDate';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Section } from '../../components/ui/Section';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BankLoanListPage() {
  const { t } = useTranslation(['bankLoan', 'common']);
  const { branchId } = useBranch();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'settled'>('all');

  const [releaseId, setReleaseId] = useState<number | null>(null);
  const [closingDate, setClosingDate] = useState(new Date().toISOString().slice(0, 10));
  const [securityPin, setSecurityPin] = useState('');
  const [releaseError, setReleaseError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['bank-loans', branchId, page, fromDate, toDate, search, statusFilter],
    queryFn: () =>
      bankLoansApi.list(branchId, {
        page,
        limit: 20,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: search || undefined,
        isSettled: statusFilter === 'all' ? undefined : statusFilter === 'settled',
      }),
  });

  const releaseMutation = useMutation({
    mutationFn: () => bankLoansApi.release(releaseId!, branchId, { closingDate, securityPin }),
    onSuccess: () => {
      setReleaseId(null);
      setSecurityPin('');
      setReleaseError('');
      queryClient.invalidateQueries({ queryKey: ['bank-loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: Error) => setReleaseError(e.message),
  });

  function handleRelease(e: FormEvent) {
    e.preventDefault();
    setReleaseError('');
    if (!securityPin) return;
    releaseMutation.mutate();
  }

  return (
    <Section
      title={t('list.title')}
      action={
        <div className="flex flex-wrap gap-2">
          <Link to="/bank-loans/batch" className="no-underline">
            <Button type="button" variant="secondary">{t('nav.batch')}</Button>
          </Link>
          <Link to="/bank-loans/record" className="no-underline">
            <Button type="button">+ {t('list.record_new')}</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Field label={t('list.from_date')} className="sm:w-40">
          <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
        </Field>
        <Field label={t('list.to_date')} className="sm:w-40">
          <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
        </Field>
        <Field label={t('list.search')} className="min-w-0 flex-1 sm:max-w-xs">
          <Input value={search} placeholder={t('list.search')} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </Field>
        <Field label={t('columns.status')} className="sm:w-36">
          <select
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          >
            <option value="all">All</option>
            <option value="open">{t('status.open')}</option>
            <option value="settled">{t('status.settled')}</option>
          </select>
        </Field>
      </div>

      {isLoading && <p className="text-sm/6 text-zinc-500">{t('common:loading')}</p>}
      {error && <Alert>{(error as Error).message}</Alert>}
      {data && data.items.length === 0 && <p className="text-sm text-zinc-500">{t('list.empty')}</p>}

      {data && data.items.length > 0 && (
        <TableCard>
          <DataTable>
            <THead>
              <tr>
                <TH>{t('columns.receipt')}</TH>
                <TH>{t('columns.customer')}</TH>
                <TH>{t('columns.bank')}</TH>
                <TH>{t('columns.amount')}</TH>
                <TH>{t('columns.deposit_date')}</TH>
                <TH>{t('columns.status')}</TH>
                <TH>{t('columns.actions')}</TH>
              </tr>
            </THead>
            <TBody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  <TD>
                    <Link to={`/loans/${row.loanId}`} className="inline-block pl-2 font-medium text-zinc-950 no-underline hover:underline">
                      #{row.invoiceNo}
                    </Link>
                  </TD>
                  <TD>
                    <div className="font-medium text-zinc-950">{row.customerName}</div>
                    <div className="text-sm text-zinc-600">{row.mobileNo || '—'} · ID {row.customerId}</div>
                  </TD>
                  <TD>{row.bankName}</TD>
                  <TD className="font-medium">{formatMoney(row.depositAmount)}</TD>
                  <TD>{formatDateIN(row.depositDate)}</TD>
                  <TD>
                    <Badge variant={row.isBankSettled ? 'closed' : 'open'}>
                      {row.isBankSettled ? t('status.settled') : t('status.open')}
                    </Badge>
                  </TD>
                  <TD>
                    {!row.isBankSettled && (
                      <Button type="button" variant="secondary" className="text-xs" onClick={() => setReleaseId(row.id)}>
                        {t('actions.release')}
                      </Button>
                    )}
                  </TD>
                </tr>
              ))}
            </TBody>
          </DataTable>
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onPageChange={setPage} />
        </TableCard>
      )}

      {releaseId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4">
          <Card className="w-full max-w-md">
            <CardTitle>{t('release.title')}</CardTitle>
            {releaseError && (
              <div className="mt-4">
                <Alert>{releaseError}</Alert>
              </div>
            )}
            <form onSubmit={handleRelease} className="mt-4 space-y-4">
              <Field label={t('release.closing_date')} required>
                <Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} required />
              </Field>
              <Field label={t('release.security_pin')} required>
                <Input type="password" value={securityPin} onChange={(e) => setSecurityPin(e.target.value)} required />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" disabled={releaseMutation.isPending}>
                  {releaseMutation.isPending ? t('actions.releasing') : t('release.submit')}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setReleaseId(null)}>
                  {t('common:actions.cancel')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </Section>
  );
}
