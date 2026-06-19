import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { auditApi } from '../../api/audit';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Input';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

export function AuditLogPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState(weekAgo);
  const [toDate, setToDate] = useState(today);
  const [entity, setEntity] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', page, fromDate, toDate, entity],
    queryFn: () =>
      auditApi.list({
        page,
        limit: 50,
        fromDate,
        toDate,
        entity: entity || undefined,
      }),
  });

  if (user?.role !== 'SUPER_ADMIN') {
    return <Alert>{t('common:branches.errors.forbidden')}</Alert>;
  }

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">{t('security.audit.hint')}</p>

      <div className="mb-4 flex flex-wrap gap-3">
        <Field label={t('security.audit.from')}>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </Field>
        <Field label={t('security.audit.to')}>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </Field>
        <Field label={t('security.audit.entity')}>
          <Input
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            placeholder="loans, customers…"
          />
        </Field>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-500">{t('common:loading')}</p>
      ) : (
        <>
          <TableCard>
            <DataTable>
              <THead>
                <tr>
                  <TH>{t('security.audit.time')}</TH>
                  <TH>{t('security.audit.user')}</TH>
                  <TH>{t('security.audit.action')}</TH>
                  <TH>{t('security.audit.entity')}</TH>
                  <TH>{t('security.audit.entity_id')}</TH>
                </tr>
              </THead>
              <TBody>
                {(data?.items ?? []).map((row) => (
                  <tr key={row.id}>
                    <TD className="whitespace-nowrap text-xs">
                      {new Date(row.createdOn).toLocaleString()}
                    </TD>
                    <TD>
                      <div className="text-sm">{row.userName}</div>
                      <div className="text-xs text-zinc-500">{row.userRole}</div>
                    </TD>
                    <TD>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">
                        {row.action}
                      </span>
                    </TD>
                    <TD>{row.entity}</TD>
                    <TD className="font-mono text-xs">{row.entityId ?? '—'}</TD>
                  </tr>
                ))}
              </TBody>
            </DataTable>
          </TableCard>

          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('security.audit.prev')}
              </Button>
              <span className="text-sm text-zinc-500">
                {t('security.audit.page', { page, total: data.totalPages })}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= data.totalPages || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('security.audit.next')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
