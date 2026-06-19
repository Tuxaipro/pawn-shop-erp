import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loansApi } from '../../api/loans';
import { useBranch } from '../../context/BranchContext';
import { PageHeader } from '../../components/PageHeader';
import { LoanForm } from './LoanForm';

export function LoanCreatePage() {
  const { t } = useTranslation(['loan', 'common']);
  const { branchId } = useBranch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const customerId = params.get('customerId') ? Number(params.get('customerId')) : undefined;
  const isReloan = params.get('reloan') === '1';

  const { data: options, isLoading } = useQuery({
    queryKey: ['loans', 'form-options'],
    queryFn: () => loansApi.formOptions(),
  });

  const { data: reloan } = useQuery({
    queryKey: ['reloan', branchId, customerId],
    queryFn: () => loansApi.reloanContext(customerId!, branchId),
    enabled: isReloan && !!customerId,
  });

  if (isLoading || !options) return <p>{t('common:loading')}</p>;

  const prefill = reloan?.hasHistory && reloan.previousLoan
    ? {
        customerId,
        loanDate: options.defaultLoanDate,
        commodityType: reloan.previousLoan.commodityType,
        loanCondition: reloan.previousLoan.loanCondition,
        loanCustomerType: reloan.previousLoan.loanCustomerType,
        loanAmount: reloan.suggestedLoanAmount ?? undefined,
        items: reloan.prefillItems,
      }
    : { loanDate: options.defaultLoanDate, customerId };

  return (
    <div>
      <PageHeader
        title={isReloan ? t('common:actions.reloan') : t('title_new')}
        subtitle={
          isReloan && reloan?.hasHistory
            ? t('subtitle_reloan', {
                count: reloan.renewalCount,
                amount: reloan.suggestedLoanAmount?.toLocaleString() ?? '0',
              })
            : t('subtitle_new')
        }
      />
      <LoanForm
        initial={prefill}
        submitLabel={t('create')}
        onCancel={() => navigate('/loans')}
        onSubmit={async (data) => {
          const { securityPin: _pin, interest: _int, ...payload } = data;
          const created = await loansApi.create(branchId, payload);
          navigate(`/loans/${created.id}`);
        }}
      />
    </div>
  );
}
