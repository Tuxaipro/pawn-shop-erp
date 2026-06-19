import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { glApi } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

type Tab = 'trial' | 'accounts' | 'journal' | 'sub-ledger';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function GlPage() {
  const { t } = useTranslation();
  const { branchId } = useBranch();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [tab, setTab] = useState<Tab>('trial');
  const [subAccount, setSubAccount] = useState('1000');
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalForm, setJournalForm] = useState({
    entryDate: today,
    description: '',
    debitAccount: '1000',
    debitAmount: '',
    creditAccount: '4000',
    creditAmount: '',
  });

  const { data: trialBalance, isLoading: loadingTb } = useQuery({
    queryKey: ['gl', 'trial-balance', branchId],
    queryFn: () => glApi.trialBalance(branchId),
    enabled: tab === 'trial',
  });

  const { data: accounts } = useQuery({
    queryKey: ['gl', 'accounts', branchId],
    queryFn: () => glApi.accounts(branchId),
    enabled: tab === 'accounts' || tab === 'sub-ledger',
  });

  const { data: journal } = useQuery({
    queryKey: ['gl', 'journal', branchId],
    queryFn: () => glApi.journal(branchId),
    enabled: tab === 'journal',
  });

  const { data: subLedger } = useQuery({
    queryKey: ['gl', 'sub-ledger', branchId, subAccount],
    queryFn: () => glApi.subLedger(branchId, subAccount),
    enabled: tab === 'sub-ledger',
  });

  const createJournal = useMutation({
    mutationFn: () =>
      glApi.createJournal(branchId, {
        entryDate: journalForm.entryDate,
        description: journalForm.description,
        lines: [
          { accountCode: journalForm.debitAccount, debit: Number(journalForm.debitAmount) },
          { accountCode: journalForm.creditAccount, credit: Number(journalForm.creditAmount) },
        ],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gl'] });
      setShowJournalForm(false);
    },
  });

  const tbRows = (trialBalance as Array<Record<string, unknown>>) ?? [];
  const accountRows = (accounts as Array<Record<string, unknown>>) ?? [];
  const journalRows = (journal as Array<Record<string, unknown>>) ?? [];
  const subData = subLedger as { accountName?: string; balance?: number; lines?: Array<Record<string, unknown>> };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'trial', label: 'Trial balance' },
    { id: 'accounts', label: 'Chart of accounts' },
    { id: 'journal', label: 'Journal' },
    { id: 'sub-ledger', label: 'Sub-ledger' },
  ];

  return (
    <div>
      <PageHeader title={t('nav.gl')} subtitle="General ledger, journal & sub-ledgers" />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <Button key={tb.id} type="button" variant={tab === tb.id ? 'primary' : 'secondary'} onClick={() => setTab(tb.id)}>
            {tb.label}
          </Button>
        ))}
        {tab === 'journal' && (
          <Button type="button" variant="secondary" onClick={() => setShowJournalForm((v) => !v)}>
            {showJournalForm ? 'Cancel' : 'Manual entry'}
          </Button>
        )}
      </div>

      {showJournalForm && (
        <Card className="mb-6 max-w-2xl">
          <CardTitle>Manual journal entry</CardTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={journalForm.entryDate} onChange={(e) => setJournalForm((f) => ({ ...f, entryDate: e.target.value }))} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Input value={journalForm.description} onChange={(e) => setJournalForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
            <Field label="Debit account">
              <Input value={journalForm.debitAccount} onChange={(e) => setJournalForm((f) => ({ ...f, debitAccount: e.target.value }))} />
            </Field>
            <Field label="Debit amount">
              <Input type="number" value={journalForm.debitAmount} onChange={(e) => setJournalForm((f) => ({ ...f, debitAmount: e.target.value }))} />
            </Field>
            <Field label="Credit account">
              <Input value={journalForm.creditAccount} onChange={(e) => setJournalForm((f) => ({ ...f, creditAccount: e.target.value }))} />
            </Field>
            <Field label="Credit amount">
              <Input type="number" value={journalForm.creditAmount} onChange={(e) => setJournalForm((f) => ({ ...f, creditAmount: e.target.value }))} />
            </Field>
            <Button type="button" onClick={() => createJournal.mutate()} disabled={createJournal.isPending}>
              Post entry
            </Button>
          </div>
        </Card>
      )}

      {tab === 'trial' && (
        loadingTb ? (
          <p className="text-sm text-zinc-500">{t('loading')}</p>
        ) : (
          <TableCard>
            <DataTable>
              <THead>
                <tr><TH>Code</TH><TH>Account</TH><TH>Debit</TH><TH>Credit</TH><TH>Balance</TH></tr>
              </THead>
              <TBody>
                {tbRows.map((row) => (
                  <tr key={String(row.code)}>
                    <TD>{String(row.code)}</TD>
                    <TD>{String(row.nameEn)}</TD>
                    <TD>{formatMoney(Number(row.debit))}</TD>
                    <TD>{formatMoney(Number(row.credit))}</TD>
                    <TD>{formatMoney(Number(row.balance))}</TD>
                  </tr>
                ))}
              </TBody>
            </DataTable>
          </TableCard>
        )
      )}

      {tab === 'accounts' && (
        <TableCard>
          <DataTable>
            <THead>
              <tr><TH>Code</TH><TH>Name</TH><TH>Type</TH></tr>
            </THead>
            <TBody>
              {accountRows.map((row) => (
                <tr key={String(row.id)}>
                  <TD>{String(row.code)}</TD>
                  <TD>{String(row.nameEn)}</TD>
                  <TD>{String(row.accountType)}</TD>
                </tr>
              ))}
            </TBody>
          </DataTable>
        </TableCard>
      )}

      {tab === 'journal' && (
        <div className="space-y-4">
          {journalRows.map((entry) => (
            <Card key={String(entry.id)}>
              <p className="text-sm font-medium">{String(entry.entryDate)} — {String(entry.description)}</p>
              <TableCard className="mt-2 border-0 shadow-none">
                <DataTable>
                  <THead>
                    <tr><TH>Account</TH><TH>Debit</TH><TH>Credit</TH></tr>
                  </THead>
                  <TBody>
                    {((entry.lines as Array<Record<string, unknown>>) ?? []).map((line, i) => (
                      <tr key={i}>
                        <TD>{String(line.accountCode)} {String(line.accountName)}</TD>
                        <TD>{formatMoney(Number(line.debit))}</TD>
                        <TD>{formatMoney(Number(line.credit))}</TD>
                      </tr>
                    ))}
                  </TBody>
                </DataTable>
              </TableCard>
            </Card>
          ))}
        </div>
      )}

      {tab === 'sub-ledger' && (
        <>
          <Field label="Account code" className="mb-4 max-w-xs">
            <Select value={subAccount} onChange={(e) => setSubAccount(e.target.value)}>
              {accountRows.map((a) => (
                <option key={String(a.code)} value={String(a.code)}>
                  {String(a.code)} — {String(a.nameEn)}
                </option>
              ))}
            </Select>
          </Field>
          {subData && (
            <>
              <p className="mb-4 text-sm">
                {subData.accountName} — Balance: {formatMoney(subData.balance ?? 0)}
              </p>
              <TableCard>
                <DataTable>
                  <THead>
                    <tr><TH>Date</TH><TH>Description</TH><TH>Debit</TH><TH>Credit</TH></tr>
                  </THead>
                  <TBody>
                    {(subData.lines ?? []).map((line, i) => (
                      <tr key={i}>
                        <TD>{String(line.entryDate)}</TD>
                        <TD>{String(line.description)}</TD>
                        <TD>{formatMoney(Number(line.debit))}</TD>
                        <TD>{formatMoney(Number(line.credit))}</TD>
                      </tr>
                    ))}
                  </TBody>
                </DataTable>
              </TableCard>
            </>
          )}
        </>
      )}
    </div>
  );
}
