import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auctionsApi } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { PageHeader } from '../../components/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function AuctionsPage() {
  const { t } = useTranslation();
  const { branchId } = useBranch();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [selectedLoan, setSelectedLoan] = useState('');
  const [auctionDate, setAuctionDate] = useState('');
  const [saleForms, setSaleForms] = useState<Record<number, { saleAmount: string; buyerName: string; charges: string }>>({});
  const [previewId, setPreviewId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['auctions', branchId],
    queryFn: () => auctionsApi.list(branchId),
  });

  const { data: eligible } = useQuery({
    queryKey: ['auctions', 'eligible', branchId],
    queryFn: () => auctionsApi.eligibleLoans(branchId),
  });

  const { data: preview } = useQuery({
    queryKey: ['auctions', 'settlement', previewId, branchId],
    queryFn: () => auctionsApi.settlement(previewId!, branchId),
    enabled: previewId != null,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['auctions'] });

  const createNotice = useMutation({
    mutationFn: () =>
      auctionsApi.create(branchId, {
        loanId: Number(selectedLoan),
        noticeDate: today,
        auctionDate: auctionDate || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setSelectedLoan('');
      setAuctionDate('');
    },
  });

  const recordSale = useMutation({
    mutationFn: (id: number) => {
      const form = saleForms[id] ?? { saleAmount: '', buyerName: '', charges: '1000' };
      return auctionsApi.recordSale(id, branchId, {
        saleAmount: Number(form.saleAmount),
        buyerName: form.buyerName,
        auctionCharges: Number(form.charges || 1000),
      });
    },
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: (id: number) => auctionsApi.complete(id, branchId),
    onSuccess: invalidate,
  });

  const markRefund = useMutation({
    mutationFn: (id: number) => auctionsApi.markRefundPaid(id, branchId),
    onSuccess: invalidate,
  });

  const toggleFlag = useMutation({
    mutationFn: ({ id, field, value }: { id: number; field: 'legalNoticeSent' | 'advertisementSent'; value: boolean }) =>
      auctionsApi.update(id, branchId, { [field]: value }),
    onSuccess: invalidate,
  });

  const result = data as { items?: Array<Record<string, unknown>> };
  const items = result?.items ?? [];
  const eligibleLoans = (eligible as Array<Record<string, unknown>>) ?? [];
  const settlement = preview as Record<string, number> | undefined;

  return (
    <div>
      <PageHeader title={t('nav.auctions')} subtitle="Notice → legal/ad → sale → settlement → refund" />

      <Card className="mb-6">
        <CardTitle>Create auction notice</CardTitle>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Eligible loan">
            <select
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={selectedLoan}
              onChange={(e) => setSelectedLoan(e.target.value)}
            >
              <option value="">Select overdue loan</option>
              {eligibleLoans.map((l) => (
                <option key={String(l.loanId)} value={String(l.loanId)}>
                  #{String(l.invoiceNo)} — {String(l.customerName)} ({formatMoney(Number(l.loanAmount))})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Auction date">
            <Input type="date" value={auctionDate} onChange={(e) => setAuctionDate(e.target.value)} />
          </Field>
          <Button
            type="button"
            onClick={() => createNotice.mutate()}
            disabled={!selectedLoan || createNotice.isPending}
          >
            Issue notice
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <p className="text-sm text-zinc-500">{t('loading')}</p>
      ) : (
        <TableCard>
          <DataTable>
            <THead>
              <tr>
                <TH>Receipt</TH>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH>Auction date</TH>
                <TH>Legal / Ad</TH>
                <TH>Sale</TH>
                <TH>Surplus / Deficit</TH>
                <TH>Refund</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {items.map((row) => {
                const id = Number(row.id);
                const form = saleForms[id] ?? { saleAmount: '', buyerName: '', charges: '1000' };
                return (
                  <tr key={String(row.id)}>
                    <TD>{String(row.invoiceNo)}</TD>
                    <TD>{String(row.customerName)}</TD>
                    <TD><Badge variant="closed">{String(row.status)}</Badge></TD>
                    <TD>{String(row.auctionDate ?? '—')}</TD>
                    <TD>
                      <div className="flex flex-col gap-1 text-xs">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={Boolean(row.legalNoticeSent)}
                            onChange={(e) =>
                              toggleFlag.mutate({ id, field: 'legalNoticeSent', value: e.target.checked })
                            }
                          />
                          Legal
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={Boolean(row.advertisementSent)}
                            onChange={(e) =>
                              toggleFlag.mutate({ id, field: 'advertisementSent', value: e.target.checked })
                            }
                          />
                          Ad
                        </label>
                      </div>
                    </TD>
                    <TD>
                      {row.status === 'sold' || row.status === 'completed' ? (
                        row.saleAmount ? formatMoney(Number(row.saleAmount)) : '—'
                      ) : (
                        <div className="flex flex-col gap-1 min-w-[140px]">
                          <Input
                            placeholder="Amount"
                            type="number"
                            value={form.saleAmount}
                            onChange={(e) =>
                              setSaleForms((f) => ({ ...f, [id]: { ...form, saleAmount: e.target.value } }))
                            }
                          />
                          <Input
                            placeholder="Buyer"
                            value={form.buyerName}
                            onChange={(e) =>
                              setSaleForms((f) => ({ ...f, [id]: { ...form, buyerName: e.target.value } }))
                            }
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => recordSale.mutate(id)}
                            disabled={!form.saleAmount || !form.buyerName || recordSale.isPending}
                          >
                            Record sale
                          </Button>
                        </div>
                      )}
                    </TD>
                    <TD>
                      {row.surplusRefund ? formatMoney(Number(row.surplusRefund)) : '—'}
                      {row.deficitAmount ? (
                        <span className="block text-xs text-red-600">Deficit {formatMoney(Number(row.deficitAmount))}</span>
                      ) : null}
                    </TD>
                    <TD>
                      {String(row.refundStatus ?? '—')}
                      {row.refundStatus === 'pending' && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="mt-1"
                          onClick={() => markRefund.mutate(id)}
                          disabled={markRefund.isPending}
                        >
                          Mark paid
                        </Button>
                      )}
                    </TD>
                    <TD>
                      <div className="flex flex-col gap-1">
                        <Button type="button" variant="secondary" onClick={() => setPreviewId(id)}>
                          Preview
                        </Button>
                        {row.status === 'sold' && (
                          <Button
                            type="button"
                            onClick={() => complete.mutate(id)}
                            disabled={complete.isPending}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </TD>
                  </tr>
                );
              })}
            </TBody>
          </DataTable>
        </TableCard>
      )}

      {settlement && previewId && (
        <Card className="mt-6 max-w-lg">
          <CardTitle>Settlement preview #{previewId}</CardTitle>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between"><dt>Sale</dt><dd>{formatMoney(settlement.saleAmount ?? 0)}</dd></div>
            <div className="flex justify-between"><dt>Principal</dt><dd>{formatMoney(settlement.principalOutstanding ?? 0)}</dd></div>
            <div className="flex justify-between"><dt>Interest</dt><dd>{formatMoney(settlement.interestOwed ?? 0)}</dd></div>
            <div className="flex justify-between"><dt>Charges + penalty</dt><dd>{formatMoney((settlement.auctionCharges ?? 0) + (settlement.penaltyAmount ?? 0))}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Surplus</dt><dd>{formatMoney(settlement.surplusRefund ?? 0)}</dd></div>
            {(settlement.deficitAmount ?? 0) > 0 && (
              <div className="flex justify-between text-red-600"><dt>Deficit</dt><dd>{formatMoney(settlement.deficitAmount ?? 0)}</dd></div>
            )}
          </dl>
        </Card>
      )}
    </div>
  );
}
