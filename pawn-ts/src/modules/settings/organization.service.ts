import { prisma } from '../../lib/prisma.js';

export const MIN_DASHBOARD_REFRESH_SECONDS = 30;
export const DEFAULT_DASHBOARD_REFRESH_SECONDS = 60;
export const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
export const MIN_SESSION_TIMEOUT_MINUTES = 5;
export const MAX_SESSION_TIMEOUT_MINUTES = 480;

export type ModuleFlags = {
  bankLoans: boolean;
  auctions: boolean;
  investments: boolean;
  gl: boolean;
  notifications: boolean;
};

function serializeModules(row: {
  moduleBankLoansEnabled: boolean;
  moduleAuctionsEnabled: boolean;
  moduleInvestmentsEnabled: boolean;
  moduleGlEnabled: boolean;
  moduleNotificationsEnabled: boolean;
}): ModuleFlags {
  return {
    bankLoans: row.moduleBankLoansEnabled,
    auctions: row.moduleAuctionsEnabled,
    investments: row.moduleInvestmentsEnabled,
    gl: row.moduleGlEnabled,
    notifications: row.moduleNotificationsEnabled,
  };
}

function serializeRow(row: {
  companyName: string;
  proprietor: string;
  dashboardRefreshSeconds: number;
  sessionTimeoutMinutes: number;
  moduleBankLoansEnabled: boolean;
  moduleAuctionsEnabled: boolean;
  moduleInvestmentsEnabled: boolean;
  moduleGlEnabled: boolean;
  moduleNotificationsEnabled: boolean;
  updatedOn: Date;
}) {
  return {
    companyName: row.companyName,
    proprietor: row.proprietor,
    dashboardRefreshSeconds: row.dashboardRefreshSeconds,
    sessionTimeoutMinutes: row.sessionTimeoutMinutes,
    modules: serializeModules(row),
    updatedOn: row.updatedOn.toISOString(),
  };
}

export async function getOrganizationSettings() {
  const row = await prisma.organizationSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: '',
      proprietor: '',
      dashboardRefreshSeconds: DEFAULT_DASHBOARD_REFRESH_SECONDS,
      sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
    },
  });
  return serializeRow(row);
}

export async function getSessionTimeoutMinutes(): Promise<number> {
  const row = await prisma.organizationSettings.findUnique({ where: { id: 1 } });
  return row?.sessionTimeoutMinutes ?? DEFAULT_SESSION_TIMEOUT_MINUTES;
}

export async function updateOrganizationSettings(input: {
  companyName?: string;
  proprietor?: string;
  dashboardRefreshSeconds?: number;
  sessionTimeoutMinutes?: number;
  modules?: Partial<ModuleFlags>;
}) {
  const row = await prisma.organizationSettings.upsert({
    where: { id: 1 },
    update: {
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.proprietor !== undefined ? { proprietor: input.proprietor } : {}),
      ...(input.dashboardRefreshSeconds !== undefined
        ? { dashboardRefreshSeconds: input.dashboardRefreshSeconds }
        : {}),
      ...(input.sessionTimeoutMinutes !== undefined
        ? { sessionTimeoutMinutes: input.sessionTimeoutMinutes }
        : {}),
      ...(input.modules?.bankLoans !== undefined
        ? { moduleBankLoansEnabled: input.modules.bankLoans }
        : {}),
      ...(input.modules?.auctions !== undefined
        ? { moduleAuctionsEnabled: input.modules.auctions }
        : {}),
      ...(input.modules?.investments !== undefined
        ? { moduleInvestmentsEnabled: input.modules.investments }
        : {}),
      ...(input.modules?.gl !== undefined ? { moduleGlEnabled: input.modules.gl } : {}),
      ...(input.modules?.notifications !== undefined
        ? { moduleNotificationsEnabled: input.modules.notifications }
        : {}),
    },
    create: {
      id: 1,
      companyName: input.companyName ?? '',
      proprietor: input.proprietor ?? '',
      dashboardRefreshSeconds:
        input.dashboardRefreshSeconds ?? DEFAULT_DASHBOARD_REFRESH_SECONDS,
      sessionTimeoutMinutes:
        input.sessionTimeoutMinutes ?? DEFAULT_SESSION_TIMEOUT_MINUTES,
      moduleBankLoansEnabled: input.modules?.bankLoans ?? false,
      moduleAuctionsEnabled: input.modules?.auctions ?? false,
      moduleInvestmentsEnabled: input.modules?.investments ?? false,
      moduleGlEnabled: input.modules?.gl ?? false,
      moduleNotificationsEnabled: input.modules?.notifications ?? false,
    },
  });
  return serializeRow(row);
}
