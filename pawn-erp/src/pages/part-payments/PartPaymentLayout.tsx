import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PartPaymentNav } from '../../components/part-payments/PartPaymentNav';
import { PageHeader } from '../../components/PageHeader';

export function PartPaymentLayout() {
  const { t } = useTranslation('partPayment');

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <PartPaymentNav />
      <Outlet />
    </div>
  );
}

export function PartPaymentIndexRedirect() {
  return <Navigate to="/part-payments" replace />;
}
