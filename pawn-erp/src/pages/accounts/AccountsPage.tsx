import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { accountsApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { formatDateIN, formatDateTimeIN, todayISOLocal } from '../../lib/formatDate';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

type Tab = 'book' | 'cash' | 'transfers';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function AccountsPage() {
  const { t } = useTranslation();
  const { branchId, branches } = useBranch();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('book');
  const [date, setDate] = useState(todayISOLocal);
  const showTransfers = branches.length > 1;

  const [entryForm, setEntryForm] = useState({
    userName: '',
    description: '',
    category: '',
    amount: '',
  });
  const [openingForm, setOpeningForm] = useState({ openingBalance: '', vaultCash: '', counterCash: '' });
  const [closeForm, setCloseForm] = useState({ closingBalance: '', physicalCount: '', notes: '' });
  const [transferForm, setTransferForm] = useState({ toBranchId: '', amount: '', description: '' });

  useEffect(() => {
    if (user?.name) {
      setEntryForm((f) => (f.userName ? f : { ...f, userName: user.name }));
    }
  }, [user?.name]);

  useEffect(() => {
    if (!showTransfers && tab === 'transfers') {
      setTab('book');
    }
  }, [showTransfers, tab]);

  const { data: cashPosition } = useQuery({
    queryKey: ['accounts', 'cash-position', branchId, date],
    queryFn: () => accountsApi.cashPosition(date, branchId),
  });

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['accounts', 'ledger', branchId, date],
    queryFn: () => accountsApi.ledger(date, branchId),
    enabled: tab === 'book',
  });

  const { data: transfers } = useQuery({
    queryKey: ['accounts', 'transfers', branchId],
    queryFn: () => accountsApi.transfers(branchId),
    enabled: tab === 'transfers' && showTransfers,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };

  const createEntry = useMutation({
    mutationFn: () =>
      accountsApi.create(branchId, {
        ...entryForm,
        category: Number(entryForm.category),
        amount: Number(entryForm.amount),
        entryDate: date,
      }),
    onSuccess: () => {
      invalidate();
      setEntryForm((f) => ({
        ...f,
        description: '',
        amount: '',
        category: '',
        userName: user?.name ?? f.userName,
      }));
    },
  });

  const setOpening = useMutation({
    mutationFn: () =>
      accountsApi.setOpeningBalance(branchId, {
        date,
        openingBalance: Number(openingForm.openingBalance),
        vaultCash: openingForm.vaultCash ? Number(openingForm.vaultCash) : undefined,
        counterCash: openingForm.counterCash ? Number(openingForm.counterCash) : undefined,
      }),
    onSuccess: invalidate,
  });

  const closeDay = useMutation({
    mutationFn: () =>
      accountsApi.closeDay(branchId, {
        date,
        closingBalance: Number(closeForm.closingBalance),
        physicalCount: closeForm.physicalCount ? Number(closeForm.physicalCount) : undefined,
        notes: closeForm.notes,
      }),
    onSuccess: invalidate,
  });

  const createTransfer = useMutation({
    mutationFn: () =>
      accountsApi.createTransfer(branchId, {
        toBranchId: Number(transferForm.toBranchId),
        amount: Number(transferForm.amount),
        transferDate: date,
        description: transferForm.description,
      }),
    onSuccess: () => {
      invalidate();
      setTransferForm({ toBranchId: '', amount: '', description: '' });
    },
  });

  const pos = cashPosition as Record<string, number | boolean | null> | undefined;
  const ledgerItems = (ledger as { ledger?: Array<Record<string, unknown>> })?.ledger ?? [];
  const transferItems = (transfers as Array<Record<string, unknown>>) ?? [];

  function handleEntry(e: FormEvent) {
    e.preventDefault();
    createEntry.mutate();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'book', label: 'Daily book' },
    { id: 'cash', label: 'Cash position' },
    ...(showTransfers ? [{ id: 'transfers' as const, label: 'Transfers' }] : []),
  ];

  const closingDisplay = pos?.isClosed
    ? Number(pos?.closingBalance ?? 0)
    : Number(pos?.cashInHand ?? 0);

  return (
    <div>
      <PageHeader title="Daily Book & Cash" subtitle="Opening/closing balance, cash in hand, transfers" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              type="button"
              variant={tab === t.id ? 'primary' : 'secondary'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardTitle>Opening</CardTitle>
          <p className="mt-2 text-xl font-semibold">{formatMoney(Number(pos?.openingBalance ?? 0))}</p>
        </Card>
        <Card>
          <CardTitle>Cash in hand</CardTitle>
          <p className="mt-2 text-xl font-semibold">{formatMoney(Number(pos?.cashInHand ?? 0))}</p>
        </Card>
        <Card>
          <CardTitle>Collections</CardTitle>
          <p className="mt-2 text-xl font-semibold">{formatMoney(Number(pos?.collections ?? 0))}</p>
        </Card>
        <Card>
          <CardTitle>Entries</CardTitle>
          <p className="mt-1 text-xs text-zinc-500">Income / expense / petty</p>
          <p className="mt-2 text-sm">
            {formatMoney(Number(pos?.income ?? 0))} / {formatMoney(Number(pos?.expense ?? 0))} /{' '}
            {formatMoney(Number(pos?.pettyCash ?? 0))}
          </p>
        </Card>
        <Card>
          <CardTitle>Closing balance</CardTitle>
          <p className="mt-1 text-xs text-zinc-500">{pos?.isClosed ? 'Day closed' : 'Calculated (day open)'}</p>
          <p className="mt-2 text-xl font-semibold">{formatMoney(closingDisplay)}</p>
        </Card>
      </div>

      {tab === 'book' && (
        <>
          <Card className="mb-6 max-w-2xl">
            <CardTitle>Add entry</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              Loan collections, closes, and disbursements appear automatically. Manual entries show who recorded them.
            </p>
            <form onSubmit={handleEntry} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Recorded by">
                <Input
                  value={entryForm.userName}
                  onChange={(e) => setEntryForm((f) => ({ ...f, userName: e.target.value }))}
                  placeholder="Staff name"
                  required
                />
              </Field>
              <Field label="Category">
                <Select
                  value={entryForm.category}
                  onChange={(e) => setEntryForm((f) => ({ ...f, category: e.target.value }))}
                  required
                >
                  <option value="">Select category</option>
                  <option value="1">Income</option>
                  <option value="2">Expense</option>
                  <option value="3">Petty cash</option>
                </Select>
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Input
                  value={entryForm.description}
                  onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Amount">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={createEntry.isPending || Boolean(pos?.isClosed) || !entryForm.category}
                >
                  Save entry
                </Button>
              </div>
            </form>
          </Card>

          {isLoading ? (
            <p className="text-sm text-zinc-500">{t('loading')}</p>
          ) : (
            <Card>
              <CardTitle>Daily ledger</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">Loan activity plus manual entries for the selected date.</p>
              <TableCard className="mt-4 border-0 shadow-none">
                <DataTable>
                  <THead>
                    <tr>
                      <TH className="w-12">Sl. no</TH>
                      <TH>Date &amp; time</TH>
                      <TH>Type</TH>
                      <TH>Description</TH>
                      <TH>Recorded by</TH>
                      <TH>Direction</TH>
                      <TH>Amount</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {ledgerItems.length === 0 ? (
                      <tr>
                        <TD colSpan={7} className="text-zinc-500">
                          No transactions for this date.
                        </TD>
                      </tr>
                    ) : (
                      ledgerItems.map((row, i) => (
                        <tr key={`${row.ref}-${i}`}>
                          <TD className="text-zinc-500">{i + 1}</TD>
                          <TD className="whitespace-nowrap">{formatDateTimeIN(String(row.dateTime ?? ''))}</TD>
                          <TD>{String(row.type)}</TD>
                          <TD>{String(row.description)}</TD>
                          <TD>{row.recordedBy ? String(row.recordedBy) : '—'}</TD>
                          <TD>{String(row.direction)}</TD>
                          <TD>{formatMoney(Number(row.amount))}</TD>
                        </tr>
                      ))
                    )}
                  </TBody>
                </DataTable>
              </TableCard>
            </Card>
          )}
        </>
      )}

      {tab === 'cash' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>Set opening balance</CardTitle>
            <div className="mt-4 grid gap-3">
              <Field label="Opening balance">
                <Input
                  type="number"
                  value={openingForm.openingBalance}
                  onChange={(e) => setOpeningForm((f) => ({ ...f, openingBalance: e.target.value }))}
                />
              </Field>
              <Field label="Vault cash">
                <Input
                  type="number"
                  value={openingForm.vaultCash}
                  onChange={(e) => setOpeningForm((f) => ({ ...f, vaultCash: e.target.value }))}
                />
              </Field>
              <Field label="Counter cash">
                <Input
                  type="number"
                  value={openingForm.counterCash}
                  onChange={(e) => setOpeningForm((f) => ({ ...f, counterCash: e.target.value }))}
                />
              </Field>
              <Button type="button" onClick={() => setOpening.mutate()} disabled={setOpening.isPending || Boolean(pos?.isClosed)}>
                Save opening
              </Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Close day</CardTitle>
            <div className="mt-4 grid gap-3">
              <Field label="Closing balance">
                <Input
                  type="number"
                  value={closeForm.closingBalance}
                  onChange={(e) => setCloseForm((f) => ({ ...f, closingBalance: e.target.value }))}
                />
              </Field>
              <Field label="Physical count">
                <Input
                  type="number"
                  value={closeForm.physicalCount}
                  onChange={(e) => setCloseForm((f) => ({ ...f, physicalCount: e.target.value }))}
                />
              </Field>
              <Field label="Notes">
                <Input value={closeForm.notes} onChange={(e) => setCloseForm((f) => ({ ...f, notes: e.target.value }))} />
              </Field>
              {pos?.isClosed && (
                <p className="text-sm text-amber-700">Day is closed. Variance: {formatMoney(Number(pos?.variance ?? 0))}</p>
              )}
              <Button type="button" onClick={() => closeDay.mutate()} disabled={closeDay.isPending || Boolean(pos?.isClosed)}>
                Close day
              </Button>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardTitle>Day summary</CardTitle>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between"><dt>Disbursements</dt><dd>{formatMoney(Number(pos?.disbursements ?? 0))}</dd></div>
              <div className="flex justify-between"><dt>Transfers in</dt><dd>{formatMoney(Number(pos?.transfersIn ?? 0))}</dd></div>
              <div className="flex justify-between"><dt>Transfers out</dt><dd>{formatMoney(Number(pos?.transfersOut ?? 0))}</dd></div>
              <div className="flex justify-between"><dt>Vault / Counter</dt><dd>{formatMoney(Number(pos?.vaultCash ?? 0))} / {formatMoney(Number(pos?.counterCash ?? 0))}</dd></div>
              <div className="flex justify-between"><dt>Petty cash</dt><dd>{formatMoney(Number(pos?.pettyCash ?? 0))}</dd></div>
            </dl>
          </Card>
        </div>
      )}

      {showTransfers && tab === 'transfers' && (
        <>
          <Card className="mb-6 max-w-xl">
            <CardTitle>Inter-branch transfer</CardTitle>
            <div className="mt-4 grid gap-3">
              <Field label="To branch">
                <Select
                  value={transferForm.toBranchId}
                  onChange={(e) => setTransferForm((f) => ({ ...f, toBranchId: e.target.value }))}
                >
                  <option value="">Select branch</option>
                  {(branches as Array<{ id: number; name: string }> | undefined)
                    ?.filter((b) => b.id !== branchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </Select>
              </Field>
              <Field label="Amount">
                <Input
                  type="number"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </Field>
              <Field label="Description">
                <Input
                  value={transferForm.description}
                  onChange={(e) => setTransferForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Field>
              <Button type="button" onClick={() => createTransfer.mutate()} disabled={createTransfer.isPending}>
                Record transfer
              </Button>
            </div>
          </Card>
          <TableCard>
            <DataTable>
              <THead>
                <tr><TH>Date</TH><TH>From</TH><TH>To</TH><TH>Amount</TH><TH>Dir</TH></tr>
              </THead>
              <TBody>
                {transferItems.map((row) => (
                  <tr key={String(row.id)}>
                    <TD>{formatDateIN(String(row.transferDate))}</TD>
                    <TD>{String(row.fromBranchName)}</TD>
                    <TD>{String(row.toBranchName)}</TD>
                    <TD>{formatMoney(Number(row.amount))}</TD>
                    <TD>{String(row.direction)}</TD>
                  </tr>
                ))}
              </TBody>
            </DataTable>
          </TableCard>
        </>
      )}
    </div>
  );
}
