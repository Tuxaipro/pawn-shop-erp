/**
 * Audit logs are recorded at the API layer as a raw HTTP method (action),
 * URL path segment (entity) and numeric id. These helpers translate that
 * technical data into the user-facing terms shown on the audit page.
 */

/** Map a raw audit action (HTTP verb or explicit action) to an i18n key. */
export function auditActionKey(action: string): string | null {
  switch (action?.toUpperCase()) {
    case 'POST':
    case 'CREATE':
      return 'created';
    case 'PUT':
    case 'PATCH':
    case 'UPDATE':
      return 'updated';
    case 'DELETE':
      return 'deleted';
    case 'LOGIN':
      return 'login';
    case 'LOGOUT':
      return 'logout';
    case 'ACTIVATE':
      return 'activated';
    case 'DEACTIVATE':
      return 'deactivated';
    default:
      return null;
  }
}

/** Map a raw audit entity (URL path segment) to an i18n key. */
const ENTITY_KEYS: Record<string, string> = {
  auth: 'auth',
  user: 'users',
  users: 'users',
  loans: 'loans',
  customers: 'customers',
  commodities: 'commodities',
  masters: 'masters',
  interest: 'interest',
  renewals: 'renewals',
  repledges: 'repledges',
  auctions: 'auctions',
  inventory: 'inventory',
  accounts: 'accounts',
  reports: 'reports',
  investments: 'investments',
  'pay-advances': 'pay_advances',
  gl: 'gl',
  notifications: 'notifications',
  settings: 'settings',
  branches: 'branches',
  dashboard: 'dashboard',
  'audit-logs': 'audit',
};

export function auditEntityKey(entity: string): string | null {
  return ENTITY_KEYS[entity?.toLowerCase()] ?? null;
}

/** Technical / sensitive keys that should never appear in the change details. */
const SKIP_DETAIL_KEYS = new Set(['path', 'method', 'body', 'password', 'passwordHash']);

function truncate(s: string, max = 60): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return truncate(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return truncate(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

/**
 * Pull the meaningful changed fields out of an audit `details` blob.
 * API-logged entries wrap the submitted payload in `body`; explicit actions
 * (e.g. user create/update) store the fields directly.
 */
export function formatAuditDetails(details: unknown): Array<{ key: string; value: string }> {
  if (!details || typeof details !== 'object') return [];
  const d = details as Record<string, unknown>;
  const source =
    d.body && typeof d.body === 'object' && !Array.isArray(d.body)
      ? (d.body as Record<string, unknown>)
      : d;

  const fields: Array<{ key: string; value: string }> = [];
  for (const [key, raw] of Object.entries(source)) {
    if (SKIP_DETAIL_KEYS.has(key)) continue;
    const value = formatDetailValue(raw);
    if (value === '') continue;
    fields.push({ key, value });
  }
  return fields;
}

/** Turn a field key (camelCase / snake_case) into a readable label. */
export function humanizeAuditKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
