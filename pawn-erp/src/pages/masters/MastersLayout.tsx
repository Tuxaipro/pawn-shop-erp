import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MasterNav } from '../../components/masters/MasterNav';
import { PageHeader } from '../../components/PageHeader';

export function MastersLayout() {
  const { t } = useTranslation('masters');

  return (
    <div>
      <PageHeader compact title={t('title')} subtitle={t('subtitle')} />
      <MasterNav />
      <Outlet />
    </div>
  );
}

export function MastersIndexRedirect() {
  return <Navigate to="/masters/categories" replace />;
}
