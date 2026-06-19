import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { inventoryApi, type StockSearchItem } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { formatDateIN } from '../../lib/formatDate';
import { formatMoneyIN, formatWeight } from '../../lib/formatNumber';
import { PageHeader } from '../../components/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

const STATUSES = ['available', 'released', 'auctioned', 'bank_pledged', 'renewed', 'lost', 'damaged', 'transferred'] as const;

function statusVariant(status: string): 'open' | 'closed' | 'renewed' {
  if (status === 'available') return 'open';
  if (status === 'renewed') return 'renewed';
  return 'closed';
}

export function InventoryPage() {
  const { t } = useTranslation('inventory');
  const { branchId } = useBranch();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [invoiceNo, setInvoiceNo] = useState('');
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState(searchParams.get('commodityType') ? '' : (searchParams.get('status') ?? ''));
  const [commodityType, setCommodityType] = useState(searchParams.get('commodityType') ?? '');
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [page, setPage] = useState(1);
  const [submitted, setSubmitted] = useState(!!searchParams.get('commodityType'));
  const [manageLoanId, setManageLoanId] = useState<number | null>(null);
  const [metaForm, setMetaForm] = useState({
    itemId: 0,
    barcode: '',
    qrCode: '',
    location: '',
    lockerNo: '',
    itemStatus: '',
    notes: '',
  });

  useEffect(() => {
    if (searchParams.get('commodityType')) {
      setSubmitted(true);
    }
  }, [searchParams]);

  const { data: detail } = useQuery({
    queryKey: ['inventory', 'detail', manageLoanId, branchId],
    queryFn: () => inventoryApi.detail(manageLoanId!, branchId),
    enabled: manageLoanId != null,
  });

  const saveMeta = useMutation({
    mutationFn: () =>
      inventoryApi.updateItemMeta(metaForm.itemId, branchId, {
        barcode: metaForm.barcode || undefined,
        qrCode: metaForm.qrCode || undefined,
        location: metaForm.location || undefined,
        lockerNo: metaForm.lockerNo || undefined,
        itemStatus: metaForm.itemStatus || undefined,
        notes: metaForm.notes || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['inventory', 'search', branchId, page, invoiceNo, search, status, commodityType, minWeight, maxWeight, submitted],
    queryFn: () =>
      inventoryApi.search(branchId, {
        page,
        limit: 20,
        invoiceNo: invoiceNo ? Number(invoiceNo) : undefined,
        search: search || undefined,
        status: status || undefined,
        commodityType: commodityType === 'gold' || commodityType === 'silver' ? commodityType : undefined,
        minWeight: minWeight ? Number(minWeight) : undefined,
        maxWeight: maxWeight ? Number(maxWeight) : undefined,
      }),
    enabled: submitted,
  });

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setSubmitted(true);
    if (barcode.trim()) {
      void inventoryApi.barcode(barcode.trim(), branchId).then(() => refetch());
    } else {
      void refetch();
    }
  }

  function openManage(loanId: number) {
    setManageLoanId(loanId);
  }

  function startEditItem(item: Record<string, unknown>) {
    setMetaForm({
      itemId: Number(item.id),
      barcode: String(item.barcode ?? ''),
      qrCode: String(item.qrCode ?? ''),
      location: String(item.location ?? ''),
      lockerNo: String(item.lockerNo ?? ''),
      itemStatus: String(item.itemStatus ?? ''),
      notes: String(item.notes ?? ''),
    });
  }

  const counts = data?.statusCounts ?? {};

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Card className="mb-6">
        <form onSubmit={handleSearch} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('search.receipt')}>
            <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="1001" />
          </Field>
          <Field label={t('search.customer')}>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search.barcode_hint')} />
          </Field>
          <Field label={t('search.barcode')}>
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="BC-001" />
          </Field>
          <Field label={t('search.status')}>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('search.all_statuses')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('search.commodity')}>
            <Select value={commodityType} onChange={(e) => setCommodityType(e.target.value)}>
              <option value="">{t('search.all_commodities')}</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </Select>
          </Field>
          <Field label={t('search.min_weight')}>
            <Input type="number" step="0.001" min="0" value={minWeight} onChange={(e) => setMinWeight(e.target.value)} />
          </Field>
          <Field label={t('search.max_weight')}>
            <Input type="number" step="0.001" min="0" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} />
          </Field>
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" disabled={isFetching}>
              {isFetching ? t('search.searching') : t('search.submit')}
            </Button>
          </div>
        </form>
      </Card>

      {submitted && data && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-lg bg-zinc-50 px-3 py-2 text-left ring-1 ring-zinc-950/5 transition hover:bg-zinc-100"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                  setSubmitted(true);
                }}
              >
                <p className="text-xs text-zinc-500">{t(`summary.${s}`)}</p>
                <p className="text-lg font-semibold text-zinc-950">{counts[s] ?? 0}</p>
              </button>
            ))}
          </div>

          {data.items.length === 0 ? (
            <p className="text-sm text-zinc-500">{t('empty')}</p>
          ) : (
            <TableCard>
              <DataTable>
                <THead>
                  <tr>
                    <TH>{t('columns.receipt')}</TH>
                    <TH>{t('columns.customer')}</TH>
                    <TH>{t('columns.status')}</TH>
                    <TH>{t('columns.commodity')}</TH>
                    <TH>{t('columns.weight')}</TH>
                    <TH>{t('columns.amount')}</TH>
                    <TH>{t('columns.renewal')}</TH>
                    <TH />
                  </tr>
                </THead>
                <TBody>
                  {data.items.map((row: StockSearchItem) => (
                    <tr key={row.loanId}>
                      <TD>
                        <Link to={`/loans/${row.loanId}`} className="font-medium text-zinc-950 no-underline hover:underline">
                          #{row.invoiceNo}
                        </Link>
                      </TD>
                      <TD>
                        <div className="font-medium">{row.customerName}</div>
                        <div className="text-xs text-zinc-500">{row.mobileNo || '—'}</div>
                      </TD>
                      <TD>
                        <Badge variant={statusVariant(row.status)}>{t(`status.${row.status as typeof STATUSES[number]}`)}</Badge>
                      </TD>
                      <TD>{row.commodityLabel}</TD>
                      <TD>{formatWeight(row.totalWeight)}</TD>
                      <TD>{formatMoneyIN(row.loanAmount)}</TD>
                      <TD>{formatDateIN(row.renewalDate)}</TD>
                      <TD>
                        <Button type="button" variant="secondary" onClick={() => openManage(row.loanId)}>
                          {t('manage')}
                        </Button>
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
        </>
      )}

      {manageLoanId != null && detail != null && (
        <Card className="mt-6">
          <CardTitle>{t('detail.items')} — #{(detail as { invoiceNo: number }).invoiceNo}</CardTitle>
          <TableCard className="mt-4 border-0 shadow-none">
            <DataTable>
              <THead>
                <tr>
                  <TH>Item</TH>
                  <TH>Weight</TH>
                  <TH>Barcode</TH>
                  <TH>Locker</TH>
                  <TH>Location</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {(detail as { items: Array<Record<string, unknown>> }).items.map((item) => (
                  <tr key={String(item.id)}>
                    <TD>{String(item.subCategory)} — {String(item.item)}</TD>
                    <TD>{formatWeight(Number(item.netWeight))}</TD>
                    <TD>{String(item.barcode ?? '—')}</TD>
                    <TD>{String(item.lockerNo ?? '—')}</TD>
                    <TD>{String(item.location ?? '—')}</TD>
                    <TD>
                      <Button type="button" variant="secondary" onClick={() => startEditItem(item)}>
                        Edit
                      </Button>
                    </TD>
                  </tr>
                ))}
              </TBody>
            </DataTable>
          </TableCard>

          {metaForm.itemId > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Barcode"><Input value={metaForm.barcode} onChange={(e) => setMetaForm((f) => ({ ...f, barcode: e.target.value }))} /></Field>
              <Field label="QR code"><Input value={metaForm.qrCode} onChange={(e) => setMetaForm((f) => ({ ...f, qrCode: e.target.value }))} /></Field>
              <Field label="Locker"><Input value={metaForm.lockerNo} onChange={(e) => setMetaForm((f) => ({ ...f, lockerNo: e.target.value }))} /></Field>
              <Field label="Location"><Input value={metaForm.location} onChange={(e) => setMetaForm((f) => ({ ...f, location: e.target.value }))} /></Field>
              <Field label="Status">
                <Select value={metaForm.itemStatus} onChange={(e) => setMetaForm((f) => ({ ...f, itemStatus: e.target.value }))}>
                  <option value="">—</option>
                  <option value="lost">Lost</option>
                  <option value="damaged">Damaged</option>
                  <option value="transferred">Transferred</option>
                </Select>
              </Field>
              <Field label="Notes"><Input value={metaForm.notes} onChange={(e) => setMetaForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
              <Button type="button" onClick={() => saveMeta.mutate()} disabled={saveMeta.isPending}>Save meta</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
