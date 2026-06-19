import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { investmentsApi } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function InvestmentsPage() {
  const { t } = useTranslation();
  const { branchId } = useBranch();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [showForm, setShowForm] = useState(false);
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [form, setForm] = useState({
    investorType: 'owner',
    investorName: '',
    amount: '',
    investmentDate: today,
    profitSharePct: '',
    purpose: '',
  });
  const [profitForm, setProfitForm] = useState({ amount: '', txnDate: today, notes: '' });

  const { data: summary } = useQuery({
    queryKey: ['investments', 'summary', branchId],
    queryFn: () => investmentsApi.summary(branchId),
  });

  const { data: list, isLoading } = useQuery({
    queryKey: ['investments', branchId],
    queryFn: () => investmentsApi.list(branchId),
  });

  const { data: ledger } = useQuery({
    queryKey: ['investments', 'ledger', ledgerId],
    queryFn: () => investmentsApi.ledger(ledgerId!),
    enabled: ledgerId != null,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['investments'] });

  const create = useMutation({
    mutationFn: () =>
      investmentsApi.create(branchId, {
        investorType: form.investorType,
        investorName: form.investorName,
        amount: Number(form.amount),
        investmentDate: form.investmentDate,
        profitSharePct: form.profitSharePct ? Number(form.profitSharePct) : 0,
        purpose: form.purpose,
      }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm((f) => ({ ...f, investorName: '', amount: '', purpose: '' }));
    },
  });

  const withdraw = useMutation({
    mutationFn: (id: number) => investmentsApi.withdraw(id),
    onSuccess: invalidate,
  });

  const profitShare = useMutation({
    mutationFn: () =>
      investmentsApi.profitShare(ledgerId!, {
        amount: Number(profitForm.amount),
        txnDate: profitForm.txnDate,
        notes: profitForm.notes,
      }),
    onSuccess: () => {
      invalidate();
      setProfitForm((f) => ({ ...f, amount: '', notes: '' }));
    },
  });

  const items = (list as Array<Record<string, unknown>>) ?? [];
  const ledgerData = ledger as { investorName?: string; transactions?: Array<Record<string, unknown>> } | undefined;

  return (
    <div>
      <PageHeader title={t('nav.investments')} subtitle="Capital, ledger & profit sharing" />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Card className="max-w-sm flex-1">
          <CardTitle>Total capital</CardTitle>
          <p className="mt-2 text-2xl font-semibold">
            {formatMoney((summary as { totalCapital?: number })?.totalCapital ?? 0)}
          </p>
        </Card>
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New investment'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 max-w-2xl">
          <CardTitle>Record investment</CardTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <Select value={form.investorType} onChange={(e) => setForm((f) => ({ ...f, investorType: e.target.value }))}>
                <option value="owner">Owner</option>
                <option value="partner">Partner</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Investor name">
              <Input value={form.investorName} onChange={(e) => setForm((f) => ({ ...f, investorName: e.target.value }))} />
            </Field>
            <Field label="Amount">
              <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Date">
              <Input type="date" value={form.investmentDate} onChange={(e) => setForm((f) => ({ ...f, investmentDate: e.target.value }))} />
            </Field>
            <Field label="Profit share %">
              <Input type="number" value={form.profitSharePct} onChange={(e) => setForm((f) => ({ ...f, profitSharePct: e.target.value }))} />
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
                <TH>Investor</TH>
                <TH>Type</TH>
                <TH>Amount</TH>
                <TH>Share %</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {items.map((row) => (
                <tr key={String(row.id)}>
                  <TD>{String(row.investorName)}</TD>
                  <TD>{String(row.investorType)}</TD>
                  <TD>{formatMoney(Number(row.amount))}</TD>
                  <TD>{Number(row.profitSharePct)}%</TD>
                  <TD>{String(row.status)}</TD>
                  <TD>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => setLedgerId(Number(row.id))}>
                        Ledger
                      </Button>
                      {row.status === 'active' && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => withdraw.mutate(Number(row.id))}
                          disabled={withdraw.isPending}
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </TD>
                </tr>
              ))}
            </TBody>
          </DataTable>
        </TableCard>
      )}

      {ledgerId && ledgerData && (
        <Card className="mt-6">
          <CardTitle>Ledger — {ledgerData.investorName}</CardTitle>
          <TableCard className="mt-4 border-0 shadow-none">
            <DataTable>
              <THead>
                <tr><TH>Date</TH><TH>Type</TH><TH>Amount</TH><TH>Notes</TH></tr>
              </THead>
              <TBody>
                {(ledgerData.transactions ?? []).map((tx) => (
                  <tr key={String(tx.id)}>
                    <TD>{String(tx.txnDate)}</TD>
                    <TD>{String(tx.txnType)}</TD>
                    <TD>{formatMoney(Number(tx.amount))}</TD>
                    <TD>{String(tx.notes)}</TD>
                  </tr>
                ))}
              </TBody>
            </DataTable>
          </TableCard>
          <div className="mt-4 grid max-w-md gap-3">
            <Field label="Profit share amount">
              <Input type="number" value={profitForm.amount} onChange={(e) => setProfitForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Button type="button" onClick={() => profitShare.mutate()} disabled={profitShare.isPending}>
              Record profit share
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
