import { api } from './client';

export interface AuditLogItem {
  id: string;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  createdOn: string;
}

export interface AuditLogResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    userId?: number;
    entity?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.userId) q.set('userId', String(params.userId));
    if (params?.entity) q.set('entity', params.entity);
    if (params?.fromDate) q.set('fromDate', params.fromDate);
    if (params?.toDate) q.set('toDate', params.toDate);
    const qs = q.toString();
    return api.get<AuditLogResponse>(`/audit-logs${qs ? `?${qs}` : ''}`);
  },
};
