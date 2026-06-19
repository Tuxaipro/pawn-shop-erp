import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { loansApi } from '../../api/loans';
import { useBranch } from '../../context/BranchContext';
import { PageHeader } from '../../components/PageHeader';
import { LoanForm } from './LoanForm';

export function LoanEditPage() {
  const { t } = useTranslation(['loan', 'common']);
  const { branchId } = useBranch();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loanId = Number(id);

  const { data: loan, isLoading, error } = useQuery({
    queryKey: ['loans', branchId, loanId],
    queryFn: () => loansApi.get(loanId, branchId),
    enabled: !Number.isNaN(loanId),
  });

  if (isLoading) return <p>{t('common:loading')}</p>;
  if (error || !loan) return <p>{(error as Error)?.message ?? t('not_found')}</p>;
  if (loan.settlementStatus !== 0) return <p>{t('only_open_editable')}</p>;

  return (
    <div>
      <PageHeader
        title={t('title_edit')}
        subtitle={t('subtitle_edit_receipt', { invoiceNo: loan.invoiceNo })}
      />
      <LoanForm
        initial={{
          customerId: loan.customer.id,
          invoiceNo: loan.invoiceNo,
          loanDate: loan.loanDate,
          commodityType: loan.commodityTypeCode,
          loanCondition: loan.loanCondition === 1 ? 'personal' : 'general',
          loanConditionDeadlineMonth: loan.loanConditionDeadlineMonth || undefined,
          conditionTimeType: loan.conditionTimeType || undefined,
          loanCustomerType: loan.loanCustomerType === 2 ? 'other' : 'general',
          loanAmount: loan.loanAmount,
          loanAmountWords: loan.loanAmountWords,
          interest: loan.interest,
          items: loan.items.map((i) => ({
            subCategoryId: i.subCategoryId,
            itemId: i.itemId,
            purityId: i.purityId,
            noOfItems: i.noOfItems,
            netWeight: i.netWeight,
          })),
        }}
        requirePin
        submitLabel={t('save_changes')}
        onCancel={() => navigate('/loans')}
        onSubmit={async (data) => {
          const { securityPin, interest, ...payload } = data;
          if (!securityPin || interest === undefined) throw new Error(t('errors.pin_interest_required'));
          await loansApi.update(loan.id, branchId, { ...payload, securityPin, interest });
          navigate(`/loans/${loan.id}`);
        }}
      />
    </div>
  );
}
