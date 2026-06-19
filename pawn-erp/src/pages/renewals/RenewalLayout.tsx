import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RenewalNav } from '../../components/renewals/RenewalNav';
import { PageHeader } from '../../components/PageHeader';

export function RenewalLayout() {
  const { t } = useTranslation('renewal');

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <RenewalNav />
      <Outlet />
    </div>
  );
}
