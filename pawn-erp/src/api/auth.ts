import { api, setAuthToken } from './client';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  branchId: number | null;
  preferredLanguage: string;
  isActive?: boolean;
  sessionTimeoutMinutes?: number;
  branch?: { id: number; code: string; name: string } | null;
}

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: string;
  branchId: number | null;
  branchName: string | null;
  isActive: boolean;
  preferredLanguage: string;
  createdOn: string;
}

export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  role: string;
  branchId?: number | null;
  preferredLanguage?: string;
};

export type UpdateUserInput = {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
  branchId?: number | null;
  preferredLanguage?: string;
};

export interface RoleMatrix {
  roles: Array<{
    role: string;
    label: string;
    permissions: string[];
  }>;
  permissions: string[];
}

export const authApi = {
  login: async (email: string, password: string) => {
    const data = await api.post<{
      token: string;
      user: AuthUser;
      sessionTimeoutMinutes: number;
    }>('/auth/login', { email, password });
    setAuthToken(data.token);
    localStorage.setItem('pawn_user', JSON.stringify(data.user));
    localStorage.setItem('pawn_session_minutes', String(data.sessionTimeoutMinutes));
    return data;
  },
  me: () => api.get<AuthUser>('/auth/me'),
  logout: () => {
    setAuthToken(null);
    localStorage.removeItem('pawn_user');
    localStorage.removeItem('pawn_session_minutes');
  },
  listUsers: () => api.get<UserRecord[]>('/auth/users'),
  createUser: (data: CreateUserInput) => api.post<UserRecord>('/auth/users', data),
  updateUser: (id: number, data: UpdateUserInput) =>
    api.put<UserRecord>(`/auth/users/${id}`, data),
  setUserActive: (id: number, isActive: boolean) =>
    api.patch<{ id: number; isActive: boolean }>(`/auth/users/${id}/status`, { isActive }),
  listRoles: () => api.get<RoleMatrix>('/auth/roles'),
};
