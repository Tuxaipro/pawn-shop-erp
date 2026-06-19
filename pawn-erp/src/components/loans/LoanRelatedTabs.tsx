import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LoanDetail } from '../../api/loans';
import { formatDateIN } from '../../lib/formatDate';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../ui/Table';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Tab = 'part_payments' | 'bank_loans';

export function LoanRelatedTabs({ loan }: { loan: LoanDetail }) {
  const { t } = useTranslation('loan');
  const hasPartPayments = loan.partPayments.length > 0;
  const hasBankDeposits = (loan.bankDeposits?.length ?? 0) > 0;
  const [tab, setTab] = useState<Tab>(hasPartPayments ? 'part_payments' : 'bank_loans');

  if (!hasPartPayments && !hasBankDeposits) return null;

  const tabs: { id: Tab; label: string; count: number }[] = [];
  if (hasPartPayments) tabs.push({ id: 'part_payments', label: t('detail.part_payments'), count: loan.partPayments.length });
  if (hasBankDeposits) tabs.push({ id: 'bank_loans', label: t('detail.bank_loans'), count: loan.bankDeposits!.length });

  return (
    <TableCard className="mb-6">
      <div className="border-b border-zinc-950/5 px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                tab === item.id
                  ? 'bg-zinc-950 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950'
              )}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
      </div>

      {tab === 'part_payments' && hasPartPayments && (
        <DataTable>
          <THead>
            <tr>
              <TH>{t('detail.sl_no')}</TH>
              <TH>{t('detail.amount')}</TH>
              <TH>{t('detail.pay_date')}</TH>
            </tr>
          </THead>
          <TBody>
            {loan.partPayments.map((p, index) => (
              <tr key={p.id}>
                <TD>{index + 1}</TD>
                <TD className="font-medium">{formatMoney(p.amount)}</TD>
                <TD>{formatDateIN(p.payDate)}</TD>
              </tr>
            ))}
          </TBody>
        </DataTable>
      )}

      {tab === 'bank_loans' && hasBankDeposits && (
        <DataTable>
          <THead>
            <tr>
              <TH>{t('detail.sl_no')}</TH>
              <TH>{t('detail.bank_name')}</TH>
              <TH>{t('detail.amount')}</TH>
              <TH>{t('detail.deposit_date')}</TH>
              <TH>{t('columns.status')}</TH>
            </tr>
          </THead>
          <TBody>
            {loan.bankDeposits!.map((b, index) => (
              <tr key={b.id}>
                <TD>{index + 1}</TD>
                <TD>{b.bankName}</TD>
                <TD className="font-medium">{formatMoney(b.depositAmount)}</TD>
                <TD>{formatDateIN(b.depositDate)}</TD>
                <TD>
                  <Badge variant={b.isBankSettled ? 'closed' : 'open'}>
                    {b.isBankSettled ? t('settlement.closed') : t('settlement.open')}
                  </Badge>
                </TD>
              </tr>
            ))}
          </TBody>
        </DataTable>
      )}
    </TableCard>
  );
}
