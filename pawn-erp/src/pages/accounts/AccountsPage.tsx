import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { accountsApi } from '../../api/modules';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import {
  countsFromDenominations,
  denominationsFromCounts,
  emptyDenominationCounts,
  INR_DENOMINATIONS,
  sumDenominations,
} from '../../lib/cashDenominations';
import { formatDateIN, formatDateTimeIN, todayISOLocal } from '../../lib/formatDate';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

type Tab = 'book' | 'close' | 'transfers';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

function DenominationCountGrid({
  denomCounts,
  onCountChange,
  readOnlyItems,
}: {
  denomCounts?: Record<number, string>;
  onCountChange?: (denomination: number, value: string) => void;
  readOnlyItems?: Array<{ denomination: number; quantity: number; subtotal: number }>;
}) {
  const readOnly = Boolean(readOnlyItems);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {INR_DENOMINATIONS.map((d) => {
        const qty = readOnly
          ? readOnlyItems?.find((item) => item.denomination === d)?.quantity ?? 0
          : Number(denomCounts?.[d]) || 0;
        const subtotal = readOnly
          ? readOnlyItems?.find((item) => item.denomination === d)?.subtotal ?? d * qty
          : d * qty;

        return (
          <div key={d} className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
            <p className="text-sm font-semibold text-zinc-900">₹{d.toLocaleString('en-IN')}</p>
            {readOnly ? (
              <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-950">{qty}</p>
            ) : (
              <Input
                type="number"
                min="0"
                step="1"
                className="mt-2"
                value={denomCounts?.[d] ?? ''}
                onChange={(e) => onCountChange?.(d, e.target.value)}
              />
            )}
            <p className="mt-1 text-xs text-zinc-500 tabular-nums">{formatMoney(subtotal)}</p>
          </div>
        );
      })}
    </div>
  );
}

type CashPosition = {
  openingBalance?: number;
  cashInHand?: number;
  collections?: number;
  income?: number;
  expense?: number;
  pettyCash?: number;
  topUp?: number;
  closingBalance?: number | null;
  bookClosingBalance?: number;
  physicalCount?: number | null;
  closingVariance?: number | null;
  recommendedBankDeposit?: number | null;
  cashLimit?: number;
  cashOverLimit?: boolean;
  excessCash?: number;
  isClosed?: boolean;
  variance?: number | null;
  disbursements?: number;
  transfersIn?: number;
  transfersOut?: number;
  shopBankDeposits?: number;
  denominations?: Array<{ denomination: number; quantity: number; subtotal: number }>;
};

export function AccountsPage() {
  const { t } = useTranslation(['accounts', 'common']);
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
  const [openingForm, setOpeningForm] = useState({ openingBalance: '' });
  const [closeForm, setCloseForm] = useState({ notes: '' });
  const [denomCounts, setDenomCounts] = useState(emptyDenominationCounts);
  const [depositForm, setDepositForm] = useState({
    bankName: '',
    amount: '',
    reference: '',
    notes: '',
  });
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

  const { data: shopDeposits } = useQuery({
    queryKey: ['accounts', 'shop-deposits', branchId, date],
    queryFn: () => accountsApi.shopDeposits(branchId, date, date),
    enabled: tab === 'close',
  });

  const pos = cashPosition as CashPosition | undefined;

  const calculatedClosingBalance = useMemo(() => {
    if (!pos) return 0;
    return (
      Number(pos.openingBalance ?? 0) +
      Number(pos.collections ?? 0) +
      Number(pos.income ?? 0) +
      Number(pos.topUp ?? 0) -
      Number(pos.expense ?? 0) -
      Number(pos.pettyCash ?? 0) -
      Number(pos.disbursements ?? 0) -
      Number(pos.shopBankDeposits ?? 0)
    );
  }, [pos]);

  useEffect(() => {
    if (pos?.openingBalance != null && !openingForm.openingBalance) {
      setOpeningForm({ openingBalance: String(Math.round(pos.openingBalance)) });
    }
  }, [pos?.openingBalance, openingForm.openingBalance]);

  const bookClosingBalance = pos?.bookClosingBalance ?? calculatedClosingBalance;

  const denominationTotal = useMemo(
    () => sumDenominations(Object.fromEntries(
      INR_DENOMINATIONS.map((d) => [d, Number(denomCounts[d]) || 0])
    )),
    [denomCounts]
  );

  const countVariance = denominationTotal - bookClosingBalance;

  useEffect(() => {
    if (pos?.isClosed && pos.denominations?.length) {
      setDenomCounts(countsFromDenominations(pos.denominations));
    }
  }, [pos?.isClosed, pos?.denominations]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      }),
    onSuccess: invalidate,
  });

  const closeDay = useMutation({
    mutationFn: () =>
      accountsApi.closeDay(branchId, {
        date,
        physicalCount: denominationTotal,
        denominations: denominationsFromCounts(denomCounts),
        notes: closeForm.notes,
      }),
    onSuccess: invalidate,
  });

  const createDeposit = useMutation({
    mutationFn: () =>
      accountsApi.createShopDeposit(branchId, {
        bankName: depositForm.bankName,
        amount: Number(depositForm.amount),
        reference: depositForm.reference,
        depositDate: date,
        notes: depositForm.notes,
      }),
    onSuccess: () => {
      invalidate();
      setDepositForm({ bankName: '', amount: '', reference: '', notes: '' });
    },
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

  const ledgerItems = (ledger as { ledger?: Array<Record<string, unknown>> })?.ledger ?? [];
  const transferItems = (transfers as Array<Record<string, unknown>>) ?? [];
  const depositItems = (shopDeposits as Array<Record<string, unknown>>) ?? [];

  function handleEntry(e: FormEvent) {
    e.preventDefault();
    createEntry.mutate();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'book', label: t('accounts:tabs.book') },
    ...(showTransfers ? [{ id: 'transfers' as const, label: t('accounts:tabs.transfers') }] : []),
    { id: 'close', label: t('accounts:tabs.close') },
  ];

  const closingDisplay = pos?.isClosed
    ? Number(pos?.closingBalance ?? 0)
    : tab === 'close'
      ? bookClosingBalance
      : Number(pos?.cashInHand ?? 0);

  return (
    <div>
      <PageHeader title={t('accounts:title')} subtitle={t('accounts:subtitle')} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label={t('fields.date')}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          {tabs.map((tabItem) => (
            <Button
              key={tabItem.id}
              type="button"
              variant={tab === tabItem.id ? 'primary' : 'secondary'}
              onClick={() => setTab(tabItem.id)}
            >
              {tabItem.label}
            </Button>
          ))}
        </div>
      </div>

      {pos?.cashOverLimit && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('alerts.cash_over_limit', {
            cash: formatMoney(Number(pos.cashInHand ?? 0)),
            limit: formatMoney(Number(pos.cashLimit ?? 0)),
            excess: formatMoney(Number(pos.excessCash ?? 0)),
          })}
        </div>
      )}

      <div className={`mb-6 grid gap-4 sm:grid-cols-2 ${tab === 'close' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
        <Card>
          <CardTitle>{t('cards.opening')}</CardTitle>
          <p className="mt-2 text-xl font-semibold">{formatMoney(Number(pos?.openingBalance ?? 0))}</p>
        </Card>
        {tab !== 'close' && (
          <Card>
            <CardTitle>{t('cards.cash_in_hand')}</CardTitle>
            <p className="mt-2 text-xl font-semibold">{formatMoney(Number(pos?.cashInHand ?? 0))}</p>
          </Card>
        )}
        <Card>
          <CardTitle>{t('cards.collections')}</CardTitle>
          <p className="mt-2 text-xl font-semibold">{formatMoney(Number(pos?.collections ?? 0))}</p>
        </Card>
        {tab === 'close' && (
          <Card>
            <CardTitle>{t('cards.disbursements')}</CardTitle>
            <p className="mt-2 text-xl font-semibold">{formatMoney(Number(pos?.disbursements ?? 0))}</p>
            <p className="mt-1 text-xs text-zinc-500">{t('hints.disbursements')}</p>
          </Card>
        )}
        <Card>
          <CardTitle>{t('cards.entries')}</CardTitle>
          <p className="mt-2 text-sm">
            {formatMoney(Number(pos?.income ?? 0))} / {formatMoney(Number(pos?.expense ?? 0))} /{' '}
            {formatMoney(Number(pos?.pettyCash ?? 0))}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{t('hints.entries')}</p>
        </Card>
        {tab === 'close' && (
          <Card>
            <CardTitle>{t('cards.transfers')}</CardTitle>
            {showTransfers ? (
              <>
                <p className="mt-2 text-sm">
                  {formatMoney(Number(pos?.shopBankDeposits ?? 0))} /{' '}
                  {formatMoney(Number(pos?.transfersIn ?? 0))} /{' '}
                  {formatMoney(Number(pos?.transfersOut ?? 0))}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{t('hints.transfers')}</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-xl font-semibold">
                  {formatMoney(Number(pos?.shopBankDeposits ?? 0))}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{t('hints.transfers_bank')}</p>
              </>
            )}
          </Card>
        )}
        <Card>
          <CardTitle>{t('cards.closing_balance')}</CardTitle>
          <p className="mt-2 text-xl font-semibold">{formatMoney(closingDisplay)}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {pos?.isClosed
              ? t('hints.day_closed')
              : tab === 'close'
                ? t('hints.closing_formula')
                : t('hints.closing_calculated')}
          </p>
        </Card>
      </div>

      {tab === 'book' && (
        <>
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardTitle>{t('sections.set_opening')}</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">{t('hints.opening_help')}</p>
              <div className="mt-4 grid gap-3">
                <Field label={t('fields.opening_balance')}>
                  <Input
                    type="number"
                    value={openingForm.openingBalance}
                    onChange={(e) => setOpeningForm({ openingBalance: e.target.value })}
                    placeholder={pos?.openingBalance ? String(Math.round(pos.openingBalance)) : ''}
                  />
                </Field>
                <Button
                  type="button"
                  onClick={() => setOpening.mutate()}
                  disabled={setOpening.isPending || Boolean(pos?.isClosed) || !openingForm.openingBalance}
                >
                  {t('buttons.save_opening')}
                </Button>
              </div>
            </Card>

            <Card>
              <CardTitle>{t('sections.add_entry')}</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">{t('hints.entry_help')}</p>
              <form onSubmit={handleEntry} className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label={t('fields.recorded_by')}>
                  <Input
                    value={entryForm.userName}
                    onChange={(e) => setEntryForm((f) => ({ ...f, userName: e.target.value }))}
                    placeholder={t('placeholders.staff_name')}
                    required
                  />
                </Field>
                <Field label={t('fields.category')}>
                  <Select
                    value={entryForm.category}
                    onChange={(e) => setEntryForm((f) => ({ ...f, category: e.target.value }))}
                    required
                  >
                    <option value="">{t('placeholders.select_category')}</option>
                    <option value="1">{t('categories.income')}</option>
                    <option value="2">{t('categories.expense')}</option>
                    <option value="3">{t('categories.petty')}</option>
                    <option value="4">{t('categories.topup')}</option>
                  </Select>
                </Field>
                <Field label={t('fields.description')} className="sm:col-span-2">
                  <Input
                    value={entryForm.description}
                    onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))}
                    required
                  />
                </Field>
                <Field label={t('fields.amount')}>
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
                    {t('buttons.save_entry')}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {isLoading ? (
            <p className="text-sm text-zinc-500">{t('common:loading')}</p>
          ) : (
            <Card>
              <CardTitle>{t('sections.daily_ledger')}</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">{t('hints.ledger_help')}</p>
              <TableCard className="mt-4 border-0 shadow-none">
                <DataTable>
                  <THead>
                    <tr>
                      <TH className="w-12">{t('ledger.sl_no')}</TH>
                      <TH>{t('ledger.date_time')}</TH>
                      <TH>{t('ledger.type')}</TH>
                      <TH>{t('ledger.description')}</TH>
                      <TH>{t('ledger.recorded_by')}</TH>
                      <TH>{t('ledger.direction')}</TH>
                      <TH>{t('ledger.amount')}</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {ledgerItems.length === 0 ? (
                      <tr>
                        <TD colSpan={7} className="text-zinc-500">
                          {t('ledger.empty')}
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

      {tab === 'close' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-4">
            <CardTitle>{t('sections.deposit_to_bank')}</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">{t('hints.deposit_help')}</p>
            <div className="mt-4 grid gap-3">
              <Field label={t('fields.bank_name')}>
                <Input
                  value={depositForm.bankName}
                  onChange={(e) => setDepositForm((f) => ({ ...f, bankName: e.target.value }))}
                  placeholder={t('placeholders.bank_example')}
                />
              </Field>
              <Field label={t('fields.amount')}>
                <Input
                  type="number"
                  min="0"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder={pos?.recommendedBankDeposit ? String(pos.recommendedBankDeposit) : ''}
                />
              </Field>
              <Field label={t('fields.reference')}>
                <Input
                  value={depositForm.reference}
                  onChange={(e) => setDepositForm((f) => ({ ...f, reference: e.target.value }))}
                />
              </Field>
              <Field label={t('fields.notes')}>
                <Input
                  value={depositForm.notes}
                  onChange={(e) => setDepositForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </Field>
              <Button
                type="button"
                onClick={() => createDeposit.mutate()}
                disabled={
                  createDeposit.isPending ||
                  Boolean(pos?.isClosed) ||
                  !depositForm.bankName ||
                  !depositForm.amount
                }
              >
                {t('buttons.record_deposit')}
              </Button>
            </div>
          </Card>

          <Card className="lg:col-span-8">
            <CardTitle>{t('sections.close_count')}</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">{t('hints.count_help')}</p>

            {pos?.isClosed ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-emerald-800">{t('hints.day_closed')}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-xs text-zinc-500">{t('fields.book_closing')}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatMoney(Number(pos.closingBalance ?? 0))}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-xs text-zinc-500">{t('fields.system_closing')}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatMoney(Number(pos.physicalCount ?? 0))}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg border px-3 py-2 ${
                      Math.abs(Number(pos.closingVariance ?? pos.variance ?? 0)) > 1
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-emerald-200 bg-emerald-50'
                    }`}
                  >
                    <p className="text-xs text-zinc-500">{t('fields.variance')}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatMoney(Number(pos.closingVariance ?? pos.variance ?? 0))}
                    </p>
                  </div>
                </div>
                {pos.recommendedBankDeposit ? (
                  <p className="mt-3 text-sm text-amber-800">
                    {t('alerts.recommended_deposit', {
                      amount: formatMoney(Number(pos.recommendedBankDeposit)),
                    })}
                  </p>
                ) : null}
                <div className="mt-4">
                  <DenominationCountGrid readOnlyItems={pos.denominations ?? []} />
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <DenominationCountGrid
                  denomCounts={denomCounts}
                  onCountChange={(denomination, value) =>
                    setDenomCounts((prev) => ({ ...prev, [denomination]: value }))
                  }
                />

                <div className="mt-4 grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-3">
                  <Field label={t('fields.system_closing')}>
                    <Input
                      type="text"
                      readOnly
                      disabled
                      className="bg-white font-semibold tabular-nums"
                      value={formatMoney(denominationTotal)}
                    />
                  </Field>
                  <Field label={t('fields.book_closing')}>
                    <Input
                      type="text"
                      readOnly
                      disabled
                      className="bg-white font-semibold tabular-nums"
                      value={formatMoney(bookClosingBalance)}
                    />
                  </Field>
                  <Field label={t('fields.variance')}>
                    <Input
                      type="text"
                      readOnly
                      disabled
                      className={`bg-white font-semibold tabular-nums ${
                        denominationTotal > 0 && Math.abs(countVariance) > 1 ? 'text-amber-800' : ''
                      }`}
                      value={denominationTotal > 0 ? formatMoney(countVariance) : '—'}
                    />
                  </Field>
                </div>

                <div className="mt-4 flex max-w-2xl items-end gap-3">
                  <Field label={t('fields.notes')} className="flex-1">
                    <Input
                      value={closeForm.notes}
                      onChange={(e) => setCloseForm({ notes: e.target.value })}
                    />
                  </Field>
                  <Button
                    type="button"
                    onClick={() => closeDay.mutate()}
                    disabled={closeDay.isPending || denominationTotal <= 0}
                  >
                    {t('buttons.close_day')}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {depositItems.length > 0 && (
            <Card className="lg:col-span-12">
              <CardTitle>{t('sections.deposits_today')}</CardTitle>
              <TableCard className="mt-4 border-0 shadow-none">
                <DataTable>
                  <THead>
                    <tr>
                      <TH>{t('deposits.date')}</TH>
                      <TH>{t('deposits.bank')}</TH>
                      <TH>{t('deposits.reference')}</TH>
                      <TH>{t('deposits.amount')}</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {depositItems.map((row) => (
                      <tr key={String(row.id)}>
                        <TD>{formatDateIN(String(row.depositDate))}</TD>
                        <TD>{String(row.bankName)}</TD>
                        <TD>{row.reference ? String(row.reference) : '—'}</TD>
                        <TD>{formatMoney(Number(row.amount))}</TD>
                      </tr>
                    ))}
                  </TBody>
                </DataTable>
              </TableCard>
            </Card>
          )}

          <Card className="lg:col-span-12">
            <CardTitle>{t('sections.day_summary')}</CardTitle>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between">
                <dt>{t('summary.disbursements')}</dt>
                <dd>{formatMoney(Number(pos?.disbursements ?? 0))}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t('summary.bank_deposits')}</dt>
                <dd>{formatMoney(Number(pos?.shopBankDeposits ?? 0))}</dd>
              </div>
              {showTransfers && (
                <>
                  <div className="flex justify-between">
                    <dt>{t('summary.transfers_in')}</dt>
                    <dd>{formatMoney(Number(pos?.transfersIn ?? 0))}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t('summary.transfers_out')}</dt>
                    <dd>{formatMoney(Number(pos?.transfersOut ?? 0))}</dd>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <dt>{t('summary.petty_cash')}</dt>
                <dd>{formatMoney(Number(pos?.pettyCash ?? 0))}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t('summary.cash_limit')}</dt>
                <dd>{formatMoney(Number(pos?.cashLimit ?? 0))}</dd>
              </div>
            </dl>
          </Card>
        </div>
      )}

      {showTransfers && tab === 'transfers' && (
        <>
          <Card className="mb-6 max-w-xl">
            <CardTitle>{t('sections.inter_branch')}</CardTitle>
            <div className="mt-4 grid gap-3">
              <Field label={t('fields.to_branch')}>
                <Select
                  value={transferForm.toBranchId}
                  onChange={(e) => setTransferForm((f) => ({ ...f, toBranchId: e.target.value }))}
                >
                  <option value="">{t('placeholders.select_branch')}</option>
                  {(branches as Array<{ id: number; name: string }> | undefined)
                    ?.filter((b) => b.id !== branchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label={t('fields.transfer_amount')}>
                <Input
                  type="number"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </Field>
              <Field label={t('fields.description')}>
                <Input
                  value={transferForm.description}
                  onChange={(e) => setTransferForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Field>
              <Button type="button" onClick={() => createTransfer.mutate()} disabled={createTransfer.isPending}>
                {t('buttons.record_transfer')}
              </Button>
            </div>
          </Card>
          <TableCard>
            <DataTable>
              <THead>
                <tr>
                  <TH>{t('transfers.date')}</TH>
                  <TH>{t('transfers.from')}</TH>
                  <TH>{t('transfers.to')}</TH>
                  <TH>{t('transfers.amount')}</TH>
                  <TH>{t('transfers.dir')}</TH>
                </tr>
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
