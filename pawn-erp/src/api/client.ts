const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';
const TOKEN_KEY = 'pawn_token';

let authToken: string | null =
  typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken() {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored !== authToken) authToken = stored;
  }
  return authToken;
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

function handleUnauthorized(status: number, code?: string) {
  if (status !== 401 && code !== 'INVALID_TOKEN' && code !== 'UNAUTHORIZED') return;
  setAuthToken(null);
  localStorage.removeItem('pawn_user');
  onUnauthorized?.();
}

/** Append branchId query param for branch-scoped API calls */
export function withBranch(path: string, branchId: number): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}branchId=${branchId}`;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...init,
  });

  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    handleUnauthorized(res.status, body.error?.code);
    throw new Error(body.error?.message ?? 'Request failed');
  }
  return body.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'DELETE',
      ...(data ? { body: JSON.stringify(data) } : {}),
    }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
    const body = (await res.json()) as ApiResponse<T>;
    if (!body.success) {
      handleUnauthorized(res.status, body.error?.code);
      throw new Error(body.error?.message ?? 'Upload failed');
    }
    return body.data;
  },
};
