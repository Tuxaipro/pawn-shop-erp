import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BankLoanNav } from '../../components/bank-loans/BankLoanNav';
import { PageHeader } from '../../components/PageHeader';

export function BankLoanLayout() {
  const { t } = useTranslation('bankLoan');

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <BankLoanNav />
      <Outlet />
    </div>
  );
}
