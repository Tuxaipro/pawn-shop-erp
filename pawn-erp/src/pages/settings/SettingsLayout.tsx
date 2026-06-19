import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SettingsNav } from '../../components/settings/SettingsNav';
import { PageHeader } from '../../components/PageHeader';

export function SettingsLayout() {
  const { t } = useTranslation('settings');

  return (
    <div>
      <PageHeader compact title={t('title')} subtitle={t('subtitle')} />
      <SettingsNav />
      <Outlet />
    </div>
  );
}

export function SettingsIndexRedirect() {
  return <Navigate to="/settings/organization" replace />;
}
