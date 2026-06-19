import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { loansApi } from '../../api/loans';
import { useBranch } from '../../context/BranchContext';
import { PageHeader } from '../../components/PageHeader';
import { Section } from '../../components/ui/Section';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { LoanRowActions } from '../../components/loans/LoanRowActions';
import { Input, Select } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { formatDateIN } from '../../lib/formatDate';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

export function LoanListPage() {
  const { t } = useTranslation(['loan', 'common']);
  const { branchId } = useBranch();
  const [page, setPage] = useState(1);
  const [settlementStatus, setSettlementStatus] = useState(0);
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['loans', branchId, page, settlementStatus, search],
    queryFn: () =>
      loansApi.list(branchId, {
        page,
        limit: 20,
        settlementStatus,
        search: search || undefined,
      }),
  });

  const statusLabel = (label: string) => {
    const key = `settlement.${label}` as 'settlement.open' | 'settlement.closed' | 'settlement.renewed';
    return t(key, { defaultValue: label });
  };

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={{ label: `+ ${t('common:actions.new_loan')}`, to: '/loans/new' }}
      />

      {isLoading && <p className="text-sm/6 text-zinc-500">{t('loading')}</p>}
      {error && <Alert>{(error as Error).message}</Alert>}

      <Section
        title={t('list_title')}
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={settlementStatus}
              onChange={(e) => {
                setSettlementStatus(Number(e.target.value));
                setPage(1);
              }}
              className="sm:w-32"
            >
              <option value={0}>{t('settlement.open')}</option>
              <option value={1}>{t('settlement.closed')}</option>
              <option value={2}>{t('settlement.all')}</option>
            </Select>
            <Input
              placeholder={t('search_customer')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="sm:w-48"
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
                  <TH>{t('columns.receipt')}</TH>
                  <TH>{t('columns.customer')}</TH>
                  <TH>{t('columns.loan_date')}</TH>
                  <TH>{t('columns.renewal')}</TH>
                  <TH>{t('columns.amount')}</TH>
                  <TH>{t('columns.interest')}</TH>
                  <TH>{t('columns.status')}</TH>
                  <TH></TH>
                </tr>
              </THead>
              <TBody>
                {data.items.map((loan) => (
                  <tr key={loan.id} className="hover:bg-zinc-950/[0.02]">
                    <TD className="font-medium text-zinc-950">{loan.invoiceNo}</TD>
                    <TD>
                      <Link to={`/loans/${loan.id}`} className="font-medium text-zinc-950 no-underline hover:underline">
                        {loan.customer.name}
                      </Link>
                      <div className="text-xs/5 text-zinc-500">{loan.customer.fatherHusbandName}</div>
                    </TD>
                    <TD>{formatDateIN(loan.loanDate)}</TD>
                    <TD>{formatDateIN(loan.renewalDate)}</TD>
                    <TD className="font-medium">₹{loan.loanAmount.toLocaleString()}</TD>
                    <TD>{loan.interest}%</TD>
                    <TD>
                      <Badge
                        variant={
                          loan.settlementStatusLabel as 'open' | 'closed' | 'renewed'
                        }
                      >
                        {statusLabel(loan.settlementStatusLabel)}
                      </Badge>
                    </TD>
                    <TD>
                      <LoanRowActions loan={loan} />
                    </TD>
                  </tr>
                ))}
              </TBody>
            </DataTable>
          </div>
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        </TableCard>
      )}
      </Section>
    </div>
  );
}
