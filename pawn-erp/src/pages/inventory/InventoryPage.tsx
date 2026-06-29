import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { inventoryApi, type StockSearchItem } from '../../api/modules';
import { LoanItemQr } from '../../components/LoanItemQr';
import { useBranch } from '../../context/BranchContext';
import { useModuleSettings } from '../../context/ModuleSettingsContext';
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
  const { t } = useTranslation(['inventory', 'common']);
  const { branchId } = useBranch();
  const { qrCodesEnabled } = useModuleSettings();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [invoiceNo, setInvoiceNo] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('commodityType') ? '' : (searchParams.get('status') ?? ''));
  const [commodityType, setCommodityType] = useState(searchParams.get('commodityType') ?? '');
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [page, setPage] = useState(1);
  const [submitted, setSubmitted] = useState(!!searchParams.get('commodityType'));
  const [manageLoanId, setManageLoanId] = useState<number | null>(null);
  const [metaForm, setMetaForm] = useState({
    itemId: 0,
    itemLabel: '',
    netWeight: 0,
    location: '',
    lockerNo: '',
    itemStatus: '',
    notes: '',
  });

  const emptyMetaForm = {
    itemId: 0,
    itemLabel: '',
    netWeight: 0,
    location: '',
    lockerNo: '',
    itemStatus: '',
    notes: '',
  };

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
        location: metaForm.location || undefined,
        lockerNo: metaForm.lockerNo || undefined,
        itemStatus: metaForm.itemStatus || undefined,
        notes: metaForm.notes || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setMetaForm(emptyMetaForm);
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
    void refetch();
  }

  function openManage(loanId: number) {
    setManageLoanId(loanId);
    setMetaForm(emptyMetaForm);
  }

  function startEditItem(item: Record<string, unknown>) {
    setMetaForm({
      itemId: Number(item.id),
      itemLabel: `${String(item.subCategory)} — ${String(item.item)}`,
      netWeight: Number(item.netWeight),
      location: String(item.location ?? ''),
      lockerNo: String(item.lockerNo ?? ''),
      itemStatus: String(item.itemStatus ?? ''),
      notes: String(item.notes ?? ''),
    });
  }

  function cancelEdit() {
    setMetaForm(emptyMetaForm);
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
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search.customer_hint')} />
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <CardTitle>{t('detail.items')} — #{(detail as { invoiceNo: number }).invoiceNo}</CardTitle>
            {qrCodesEnabled && (detail as { qrCode?: string | null }).qrCode && (
              <LoanItemQr value={(detail as { qrCode: string }).qrCode} size={88} />
            )}
          </div>
          <TableCard className="mt-4 border-0 shadow-none">
            <DataTable>
              <THead>
                <tr>
                  <TH>Item</TH>
                  <TH>Weight</TH>
                  <TH>Locker</TH>
                  <TH>Location</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {(detail as { items: Array<Record<string, unknown>> }).items.map((item) => (
                  <tr
                    key={String(item.id)}
                    className={metaForm.itemId === Number(item.id) ? 'bg-zinc-50' : undefined}
                  >
                    <TD>{String(item.subCategory)} — {String(item.item)}</TD>
                    <TD>{formatWeight(Number(item.netWeight))}</TD>
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
            <div className="mt-4 rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-4">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t('detail.editing')}</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">{metaForm.itemLabel}</p>
                </div>
                <p className="text-sm text-zinc-600">
                  {t('detail.weight')}: <span className="font-medium text-zinc-950">{formatWeight(metaForm.netWeight)}</span>
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={t('detail.locker')}>
                  <Input value={metaForm.lockerNo} onChange={(e) => setMetaForm((f) => ({ ...f, lockerNo: e.target.value }))} />
                </Field>
                <Field label={t('detail.location')}>
                  <Input value={metaForm.location} onChange={(e) => setMetaForm((f) => ({ ...f, location: e.target.value }))} />
                </Field>
                <Field label={t('detail.status')}>
                  <Select value={metaForm.itemStatus} onChange={(e) => setMetaForm((f) => ({ ...f, itemStatus: e.target.value }))}>
                    <option value="">—</option>
                    <option value="lost">{t('status.lost')}</option>
                    <option value="damaged">{t('status.damaged')}</option>
                    <option value="transferred">{t('status.transferred')}</option>
                  </Select>
                </Field>
                <Field label={t('detail.notes')} className="sm:col-span-2 lg:col-span-3">
                  <Input value={metaForm.notes} onChange={(e) => setMetaForm((f) => ({ ...f, notes: e.target.value }))} />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => saveMeta.mutate()} disabled={saveMeta.isPending}>
                  {saveMeta.isPending ? t('common:loading') : t('detail.save_meta')}
                </Button>
                <Button type="button" variant="secondary" onClick={cancelEdit} disabled={saveMeta.isPending}>
                  {t('common:actions.cancel')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
