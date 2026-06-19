import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

export function NotificationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications'),
  });

  const process = useMutation({
    mutationFn: () => api.post('/notifications/process', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = (data as Array<Record<string, unknown>>) ?? [];

  return (
    <div>
      <PageHeader
        title={t('nav.notifications')}
        subtitle="SMS & email queue (Tamil + English templates)"
        actions={
          <Button type="button" onClick={() => process.mutate()} disabled={process.isPending}>
            Process pending
          </Button>
        }
      />
      {isLoading ? (
        <p className="text-sm text-zinc-500">{t('loading')}</p>
      ) : (
        <TableCard>
          <DataTable>
            <THead>
              <tr>
                <TH>Channel</TH>
                <TH>Language</TH>
                <TH>Recipient</TH>
                <TH>Status</TH>
                <TH>Body</TH>
              </tr>
            </THead>
            <TBody>
              {items.map((row) => (
                <tr key={String(row.id)}>
                  <TD>{String(row.channel)}</TD>
                  <TD>{String(row.language)}</TD>
                  <TD>{String(row.recipient)}</TD>
                  <TD>{String(row.status)}</TD>
                  <TD className="max-w-xs truncate">{String(row.body)}</TD>
                </tr>
              ))}
            </TBody>
          </DataTable>
        </TableCard>
      )}
    </div>
  );
}
