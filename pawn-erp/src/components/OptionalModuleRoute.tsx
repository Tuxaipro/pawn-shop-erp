import { Navigate, useLocation } from 'react-router-dom';
import { useModuleSettings, type OptionalModuleKey } from '../context/ModuleSettingsContext';

export function OptionalModuleRoute({
  module,
  children,
}: {
  module: OptionalModuleKey;
  children: React.ReactNode;
}) {
  const { isModuleEnabled, isLoading } = useModuleSettings();
  const location = useLocation();

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!isModuleEnabled(module)) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}
