import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import {
  DEFAULT_MODULE_FLAGS,
  type ModuleFlags,
  type OptionalModuleKey,
  isModulePathEnabled,
  moduleForPath,
} from '../lib/appModules';
import { normalizeDashboardRefreshSeconds } from '../lib/dashboardRefresh';

export type { OptionalModuleKey, ModuleFlags };

interface ModuleSettingsContextValue {
  modules: ModuleFlags;
  dashboardRefreshSeconds: number;
  sessionTimeoutMinutes: number;
  isLoading: boolean;
  isModuleEnabled: (key: OptionalModuleKey) => boolean;
  isPathEnabled: (path: string) => boolean;
}

const ModuleSettingsContext = createContext<ModuleSettingsContextValue | null>(null);

export function ModuleSettingsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'organization'],
    queryFn: () => settingsApi.getOrganization(),
    staleTime: 60_000,
  });

  const modules: ModuleFlags = data?.modules ?? DEFAULT_MODULE_FLAGS;
  const dashboardRefreshSeconds = normalizeDashboardRefreshSeconds(
    data?.dashboardRefreshSeconds
  );
  const sessionTimeoutMinutes = data?.sessionTimeoutMinutes ?? 30;

  const value: ModuleSettingsContextValue = {
    modules,
    dashboardRefreshSeconds,
    sessionTimeoutMinutes,
    isLoading,
    isModuleEnabled: (key) => modules[key],
    isPathEnabled: (path) => isModulePathEnabled(path, modules),
  };

  return (
    <ModuleSettingsContext.Provider value={value}>{children}</ModuleSettingsContext.Provider>
  );
}

export function useModuleSettings() {
  const ctx = useContext(ModuleSettingsContext);
  if (!ctx) {
    throw new Error('useModuleSettings must be used within ModuleSettingsProvider');
  }
  return ctx;
}

export function useOptionalRouteAllowed(pathname: string): boolean {
  const { modules, isLoading } = useModuleSettings();
  if (isLoading) return true;
  const key = moduleForPath(pathname);
  if (!key) return true;
  return modules[key];
}
