import { api } from './client';
import type { ModuleFlags } from '../lib/appModules';

export interface OrganizationSettings {
  companyName: string;
  proprietor: string;
  logoUrl: string;
  receiptLanguage: string;
  dashboardRefreshSeconds: number;
  sessionTimeoutMinutes: number;
  qrCodesEnabled: boolean;
  cashLimit: number;
  modules: ModuleFlags;
  updatedOn?: string;
}

export type AppPreferencesInput = {
  dashboardRefreshSeconds?: number;
  sessionTimeoutMinutes?: number;
  qrCodesEnabled?: boolean;
  cashLimit?: number;
  receiptLanguage?: string;
  modules?: Partial<ModuleFlags>;
};

export type OrganizationProfileInput = {
  companyName: string;
  proprietor?: string;
  logoUrl?: string;
};

export const settingsApi = {
  getOrganization: () => api.get<OrganizationSettings>('/settings/organization'),
  updateOrganization: (data: OrganizationProfileInput) =>
    api.put<OrganizationSettings>('/settings/organization', data),
  updatePreferences: (data: AppPreferencesInput) =>
    api.put<OrganizationSettings>('/settings/preferences', data),
};
