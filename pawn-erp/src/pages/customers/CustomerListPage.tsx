import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import { PageHeader } from '../../components/PageHeader';
import { Section } from '../../components/ui/Section';
import { Alert } from '../../components/ui/Alert';
import { RowActions } from '../../components/ui/RowActions';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Badge } from '../../components/ui/Badge';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

export function CustomerListPage() {
  const { t } = useTranslation(['customer', 'common']);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [mobile, setMobile] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', page, search, mobile],
    queryFn: () => customersApi.list({ page, limit: 20, search: search || undefined, mobile: mobile || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });

  return (
    <div>
      <PageHeader
        title={t('common:nav.customers')}
        subtitle={t('customer:subtitle')}
        action={{ label: `+ ${t('customer:title_new')}`, to: '/customers/new' }}
      />

      {isLoading && <p className="text-sm/6 text-zinc-500">{t('list.loading')}</p>}
      {error && <Alert>{(error as Error).message}</Alert>}

      <Section
        title={t('list.title')}
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder={t('list.search_name')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="sm:w-48"
            />
            <Input
              placeholder={t('list.search_mobile')}
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                setPage(1);
              }}
              className="sm:w-36"
            />
          </div>
        }
      >
      {data && (
        <TableCard>
          <div className="overflow-x-auto">
            <DataTable>
              <THead>
                <tr>
                  <TH>{t('list.columns.id')}</TH>
                  <TH>{t('list.columns.name')}</TH>
                  <TH>{t('list.columns.father_husband')}</TH>
                  <TH>{t('fields.mobile')}</TH>
                  <TH>{t('fields.city')}</TH>
                  <TH>{t('list.columns.status')}</TH>
                  <TH></TH>
                </tr>
              </THead>
              <TBody>
                {data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-950/[0.02]">
                    <TD className="font-medium text-zinc-950">{c.customerId}</TD>
                    <TD>
                      <Link to={`/customers/${c.id}`} className="font-medium text-zinc-950 no-underline hover:underline">
                        {c.name}
                      </Link>
                    </TD>
                    <TD>{c.fatherHusbandName}</TD>
                    <TD>{c.mobileNo || '—'}</TD>
                    <TD>{c.city || '—'}</TD>
                    <TD>
                      {c.isBlacklisted ? (
                        <Badge variant="danger">{t('fields.blacklisted_status')}</Badge>
                      ) : (
                        <Badge variant="open">{t('list.status.active')}</Badge>
                      )}
                    </TD>
                    <TD>
                      <RowActions
                        editTo={`/customers/${c.id}/edit`}
                        onDelete={() => deleteMutation.mutate(c.id)}
                        deleteMessage={t('customer:confirm.delete', { name: c.name })}
                      />
                    </TD>
                  </tr>
                ))}
              </TBody>
            </DataTable>
          </div>
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            onPageChange={setPage}
          />
        </TableCard>
      )}
      </Section>
    </div>
  );
}
