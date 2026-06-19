import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { payAdvancesApi } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function PayAdvancesPage() {
  const { t } = useTranslation();
  const { branchId } = useBranch();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [showForm, setShowForm] = useState(false);
  const [recoverId, setRecoverId] = useState<number | null>(null);
  const [recoverAmount, setRecoverAmount] = useState('');
  const [form, setForm] = useState({
    advanceType: 'employee',
    partyName: '',
    amount: '',
    advanceDate: today,
    dueDate: '',
    purpose: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['pay-advances', branchId],
    queryFn: () => payAdvancesApi.list(branchId),
  });

  const { data: recoveries } = useQuery({
    queryKey: ['pay-advances', 'recoveries', recoverId],
    queryFn: () => payAdvancesApi.recoveries(recoverId!),
    enabled: recoverId != null,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['pay-advances'] });

  const create = useMutation({
    mutationFn: () =>
      payAdvancesApi.create(branchId, {
        advanceType: form.advanceType,
        partyName: form.partyName,
        amount: Number(form.amount),
        advanceDate: form.advanceDate,
        dueDate: form.dueDate || undefined,
        purpose: form.purpose,
      }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm((f) => ({ ...f, partyName: '', amount: '', purpose: '' }));
    },
  });

  const settle = useMutation({
    mutationFn: () => payAdvancesApi.settle(recoverId!, Number(recoverAmount)),
    onSuccess: () => {
      invalidate();
      setRecoverAmount('');
    },
  });

  const result = data as { items?: Array<Record<string, unknown>>; totalPending?: number };
  const items = result?.items ?? [];
  const recoveryItems = (recoveries as Array<Record<string, unknown>>) ?? [];

  return (
    <div>
      <PageHeader title={t('nav.pay_advances')} subtitle="Advances, recoveries & settlement" />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Card className="max-w-sm flex-1">
          <CardTitle>Total pending</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{formatMoney(result?.totalPending ?? 0)}</p>
        </Card>
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New advance'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 max-w-2xl">
          <CardTitle>Issue advance</CardTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <Select value={form.advanceType} onChange={(e) => setForm((f) => ({ ...f, advanceType: e.target.value }))}>
                <option value="employee">Employee</option>
                <option value="vendor">Vendor</option>
                <option value="customer">Customer</option>
              </Select>
            </Field>
            <Field label="Party name">
              <Input value={form.partyName} onChange={(e) => setForm((f) => ({ ...f, partyName: e.target.value }))} />
            </Field>
            <Field label="Amount">
              <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Advance date">
              <Input type="date" value={form.advanceDate} onChange={(e) => setForm((f) => ({ ...f, advanceDate: e.target.value }))} />
            </Field>
            <Field label="Due date">
              <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </Field>
            <Field label="Purpose">
              <Input value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} />
            </Field>
            <Button type="button" onClick={() => create.mutate()} disabled={create.isPending}>
              Save
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-zinc-500">{t('loading')}</p>
      ) : (
        <TableCard>
          <DataTable>
            <THead>
              <tr>
                <TH>Party</TH>
                <TH>Type</TH>
                <TH>Balance</TH>
                <TH>Due</TH>
                <TH>Overdue</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {items.map((row) => (
                <tr key={String(row.id)}>
                  <TD>{String(row.partyName)}</TD>
                  <TD>{String(row.advanceType)}</TD>
                  <TD>{formatMoney(Number(row.balance))}</TD>
                  <TD>{String(row.dueDate ?? '—')}</TD>
                  <TD>{Number(row.daysOverdue) > 0 ? String(row.daysOverdue) : '—'}</TD>
                  <TD>{String(row.status)}</TD>
                  <TD>
                    {row.status === 'pending' && (
                      <Button type="button" variant="secondary" onClick={() => setRecoverId(Number(row.id))}>
                        Recover
                      </Button>
                    )}
                  </TD>
                </tr>
              ))}
            </TBody>
          </DataTable>
        </TableCard>
      )}

      {recoverId && (
        <Card className="mt-6 max-w-lg">
          <CardTitle>Record recovery</CardTitle>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Amount">
              <Input type="number" value={recoverAmount} onChange={(e) => setRecoverAmount(e.target.value)} />
            </Field>
            <Button type="button" onClick={() => settle.mutate()} disabled={settle.isPending || !recoverAmount}>
              Settle
            </Button>
          </div>
          {recoveryItems.length > 0 && (
            <TableCard className="mt-4 border-0 shadow-none">
              <DataTable>
                <THead>
                  <tr><TH>Date</TH><TH>Amount</TH><TH>Notes</TH></tr>
                </THead>
                <TBody>
                  {recoveryItems.map((r) => (
                    <tr key={String(r.id)}>
                      <TD>{String(r.recoveryDate)}</TD>
                      <TD>{formatMoney(Number(r.amount))}</TD>
                      <TD>{String(r.notes)}</TD>
                    </tr>
                  ))}
                </TBody>
              </DataTable>
            </TableCard>
          )}
        </Card>
      )}
    </div>
  );
}
