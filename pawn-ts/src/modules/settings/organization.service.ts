import { prisma } from '../../lib/prisma.js';
import { backfillQrCodesForOpenLoans } from '../../lib/loan-item-qr.js';
import { dec } from '../../lib/loan-helper.js';
import type { Prisma } from '@prisma/client';

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
  logoUrl: string | null;
  receiptLanguage: string;
  dashboardRefreshSeconds: number;
  sessionTimeoutMinutes: number;
  qrCodesEnabled: boolean;
  cashLimit: Prisma.Decimal;
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
    logoUrl: row.logoUrl ?? '',
    receiptLanguage: row.receiptLanguage,
    dashboardRefreshSeconds: row.dashboardRefreshSeconds,
    sessionTimeoutMinutes: row.sessionTimeoutMinutes,
    qrCodesEnabled: row.qrCodesEnabled,
    cashLimit: Number(row.cashLimit),
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

export async function getCashLimit(): Promise<number> {
  const row = await prisma.organizationSettings.findUnique({ where: { id: 1 } });
  return row?.cashLimit ? dec(row.cashLimit) : 0;
}

export async function updateOrganizationSettings(input: {
  companyName?: string;
  proprietor?: string;
  logoUrl?: string;
  receiptLanguage?: string;
  dashboardRefreshSeconds?: number;
  sessionTimeoutMinutes?: number;
  qrCodesEnabled?: boolean;
  cashLimit?: number;
  modules?: Partial<ModuleFlags>;
}) {
  const row = await prisma.organizationSettings.upsert({
    where: { id: 1 },
    update: {
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.proprietor !== undefined ? { proprietor: input.proprietor } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl || null } : {}),
      ...(input.receiptLanguage !== undefined ? { receiptLanguage: input.receiptLanguage } : {}),
      ...(input.dashboardRefreshSeconds !== undefined
        ? { dashboardRefreshSeconds: input.dashboardRefreshSeconds }
        : {}),
      ...(input.sessionTimeoutMinutes !== undefined
        ? { sessionTimeoutMinutes: input.sessionTimeoutMinutes }
        : {}),
      ...(input.qrCodesEnabled !== undefined ? { qrCodesEnabled: input.qrCodesEnabled } : {}),
      ...(input.cashLimit !== undefined ? { cashLimit: input.cashLimit } : {}),
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
      logoUrl: input.logoUrl || null,
      receiptLanguage: input.receiptLanguage ?? 'ta',
      dashboardRefreshSeconds:
        input.dashboardRefreshSeconds ?? DEFAULT_DASHBOARD_REFRESH_SECONDS,
      sessionTimeoutMinutes:
        input.sessionTimeoutMinutes ?? DEFAULT_SESSION_TIMEOUT_MINUTES,
      qrCodesEnabled: input.qrCodesEnabled ?? false,
      cashLimit: input.cashLimit ?? 500000,
      moduleBankLoansEnabled: input.modules?.bankLoans ?? false,
      moduleAuctionsEnabled: input.modules?.auctions ?? false,
      moduleInvestmentsEnabled: input.modules?.investments ?? false,
      moduleGlEnabled: input.modules?.gl ?? false,
      moduleNotificationsEnabled: input.modules?.notifications ?? false,
    },
  });
  if (input.qrCodesEnabled === true) {
    void backfillQrCodesForOpenLoans();
  }
  return serializeRow(row);
}
