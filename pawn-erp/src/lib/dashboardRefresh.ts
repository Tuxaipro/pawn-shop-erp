export const MIN_DASHBOARD_REFRESH_SECONDS = 30;
export const DEFAULT_DASHBOARD_REFRESH_SECONDS = 60;

export function normalizeDashboardRefreshSeconds(seconds?: number | null) {
  const value = seconds ?? DEFAULT_DASHBOARD_REFRESH_SECONDS;
  return Math.max(MIN_DASHBOARD_REFRESH_SECONDS, Math.floor(value));
}
