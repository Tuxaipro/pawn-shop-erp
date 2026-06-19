import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { renewalsApi } from '../../api/modules';
import { useBranch } from '../../context/BranchContext';
import { formatDateIN } from '../../lib/formatDate';
import { Button } from '../../components/ui/Button';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

export function RenewalListPage() {
  const { t } = useTranslation(['renewal', 'loan']);
  const { branchId } = useBranch();
  const { data, isLoading } = useQuery({
    queryKey: ['renewals', 'defaults', branchId],
    queryFn: () => renewalsApi.defaults(branchId),
  });

  const items = data?.items ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-950">{t('list.title')}</h2>
        <Link to="/renewals/record" className="no-underline">
          <Button type="button">{t('list.record_new')}</Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-500">{t('common:loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">{t('list.empty')}</p>
      ) : (
        <TableCard>
          <DataTable>
            <THead>
              <tr>
                <TH>{t('loan:columns.receipt')}</TH>
                <TH>{t('loan:columns.customer')}</TH>
                <TH>{t('loan:columns.renewal')}</TH>
                <TH>{t('loan:columns.amount')}</TH>
                <TH>{t('loan:columns.status')}</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {items.map((row) => (
                <tr key={row.id}>
                  <TD className="font-medium">{row.invoiceNo}</TD>
                  <TD>{row.customerName}</TD>
                  <TD>{formatDateIN(row.renewalDate)}</TD>
                  <TD>₹{row.loanAmount.toLocaleString('en-IN')}</TD>
                  <TD>
                    {row.isOverdue
                      ? t('list.overdue')
                      : row.defaultStatus
                        ? t('list.default')
                        : t('list.open')}
                  </TD>
                  <TD>
                    <Link
                      to={`/renewals/record?loanId=${row.id}`}
                      className="text-sm font-medium text-zinc-950 no-underline hover:underline"
                    >
                      {t('list.renew')}
                    </Link>
                  </TD>
                </tr>
              ))}
            </TBody>
          </DataTable>
        </TableCard>
      )}
    </div>
  );
}
