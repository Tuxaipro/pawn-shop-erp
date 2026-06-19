import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { interestApi, type PartPaymentListItem } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { Button } from '../../components/ui/Button';
import { Section } from '../../components/ui/Section';
import { Alert } from '../../components/ui/Alert';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { RowActions } from '../../components/ui/RowActions';
import { formatDateIN } from '../../lib/formatDate';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PartPaymentListPage() {
  const { t } = useTranslation(['partPayment', 'common']);
  const { branchId } = useBranch();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PartPaymentListItem | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editPayDate, setEditPayDate] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['part-payments', branchId, page, fromDate, toDate, search],
    queryFn: () =>
      interestApi.listBranchPartPayments(branchId, {
        page,
        limit: 20,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: search || undefined,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      interestApi.updatePartPayment(editing!.id, branchId, {
        amount: Number(editAmount),
        payDate: editPayDate,
      }),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['part-payments', branchId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => interestApi.deletePartPayment(id, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-payments', branchId] });
    },
  });

  function openEdit(row: PartPaymentListItem) {
    setEditing(row);
    setEditAmount(String(row.amount));
    setEditPayDate(row.payDate);
  }

  return (
    <Section
      title={t('list.title')}
      action={
        <Link to="/part-payments/record" className="no-underline">
          <Button type="button">+ {t('list.record_new')}</Button>
        </Link>
      }
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Field label={t('list.from_date')} className="sm:w-40">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label={t('list.to_date')} className="sm:w-40">
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label={t('list.search')} className="min-w-0 flex-1 sm:max-w-xs">
          <Input
            value={search}
            placeholder={t('list.search')}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </Field>
      </div>

      {isLoading && <p className="text-sm/6 text-zinc-500">{t('common:loading')}</p>}
      {error && <Alert>{(error as Error).message}</Alert>}

      {data && data.items.length === 0 && (
        <p className="text-sm text-zinc-500">{t('list.empty')}</p>
      )}

      {data && data.items.length > 0 && (
        <TableCard>
          <DataTable>
            <THead>
              <tr>
                <TH>{t('columns.receipt')}</TH>
                <TH>{t('columns.customer')}</TH>
                <TH>{t('columns.amount')}</TH>
                <TH>{t('columns.pay_date')}</TH>
                <TH className="w-28 text-right">{t('columns.actions')}</TH>
              </tr>
            </THead>
            <TBody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  <TD>
                    <Link
                      to={`/loans/${row.loanId}`}
                      className="inline-block pl-2 font-medium text-zinc-950 no-underline hover:underline"
                    >
                      #{row.invoiceNo}
                    </Link>
                  </TD>
                  <TD>
                    <div className="font-medium text-zinc-950">{row.customerName}</div>
                    <div className="text-sm text-zinc-600">
                      {row.mobileNo || '—'} · ID {row.customerId}
                    </div>
                  </TD>
                  <TD className="font-medium">{formatMoney(row.amount)}</TD>
                  <TD>{formatDateIN(row.payDate)}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end">
                      <RowActions
                        onEdit={() => openEdit(row)}
                        onDelete={() => deleteMutation.mutate(row.id)}
                        deleteMessage={t('list.delete_message')}
                      />
                    </div>
                  </TD>
                </tr>
              ))}
            </TBody>
          </DataTable>
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            onPageChange={setPage}
          />
        </TableCard>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditing(null)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <Card>
            <CardTitle>{t('list.edit_title')}</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              {t('columns.receipt')} #{editing.invoiceNo} · {editing.customerName}
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Field label={t('fields.amount')}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </Field>
              <Field label={t('fields.pay_date')}>
                <Input
                  type="date"
                  value={editPayDate}
                  onChange={(e) => setEditPayDate(e.target.value)}
                />
              </Field>
            </div>
            {updateMutation.error && (
              <div className="mt-4">
                <Alert>{(updateMutation.error as Error).message}</Alert>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                {t('common:actions.cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={!editAmount || !editPayDate || updateMutation.isPending}
              >
                {t('common:actions.save')}
              </Button>
            </div>
          </Card>
          </div>
        </div>
      )}
    </Section>
  );
}
