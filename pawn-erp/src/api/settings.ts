import { api } from './client';
import type { ModuleFlags } from '../lib/appModules';

export interface OrganizationSettings {
  companyName: string;
  proprietor: string;
  dashboardRefreshSeconds: number;
  sessionTimeoutMinutes: number;
  modules: ModuleFlags;
  updatedOn?: string;
}

export type OrganizationProfileInput = {
  companyName: string;
  proprietor?: string;
};

export type AppPreferencesInput = {
  dashboardRefreshSeconds?: number;
  sessionTimeoutMinutes?: number;
  modules?: Partial<ModuleFlags>;
};

export const settingsApi = {
  getOrganization: () => api.get<OrganizationSettings>('/settings/organization'),
  updateOrganization: (data: OrganizationProfileInput) =>
    api.put<OrganizationSettings>('/settings/organization', data),
  updatePreferences: (data: AppPreferencesInput) =>
    api.put<OrganizationSettings>('/settings/preferences', data),
};
