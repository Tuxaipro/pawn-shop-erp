import { api } from './client';

export interface BranchRecord {
  id: number;
  code: string;
  name: string;
  address?: string;
  landline?: string;
  phone?: string;
  whatsapp?: string;
  isActive?: boolean;
}

export interface BranchProfileInput {
  name: string;
  address?: string;
  landline?: string;
  phone?: string;
  whatsapp?: string;
}

export interface CreateBranchInput extends BranchProfileInput {
  code: string;
}

export const branchesApi = {
  list: (includeInactive = false) =>
    api.get<BranchRecord[]>(`/branches${includeInactive ? '?includeInactive=true' : ''}`),
  create: (data: CreateBranchInput) => api.post<BranchRecord>('/branches', data),
  update: (id: number, data: Partial<BranchProfileInput> & { isActive?: boolean }) =>
    api.put<BranchRecord>(`/branches/${id}`, data),
  delete: (id: number) => api.delete<{ id: number; deleted: boolean }>(`/branches/${id}`),
};
