import { api } from './client';

export type KycDocumentType = 'aadhaar' | 'pan' | 'address_proof' | 'photo_id' | 'other';

export interface KycDocument {
  id: number;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  uploadedOn: string;
}

export interface Customer {
  id: number;
  customerId: number;
  name: string;
  fatherHusbandName: string;
  photoImage: string;
  photoUrl: string | null;
  address1: string;
  address2: string;
  mobileNo: string;
  whatsappNo: string;
  email: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  aadhaarNo: string;
  panNo: string;
  occupation: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineeMobile: string;
  referenceName: string;
  referenceRelation: string;
  referenceMobile: string;
  isBlacklisted: boolean;
  blacklistReason: string;
  blacklistedAt: string | null;
  preferredLanguage: 'en' | 'ta';
  kycDocuments: KycDocument[];
  isDeleted: boolean;
  createdOn: string;
  updatedOn: string;
}

export interface CustomerListResponse {
  items: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerFormData {
  customerId?: number;
  name: string;
  fatherHusbandName: string;
  address1: string;
  address2?: string;
  mobileNo?: string;
  whatsappNo?: string;
  email?: string;
  city: string;
  state: string;
  country?: string;
  pinCode: string;
  aadhaarNo?: string;
  panNo?: string;
  occupation?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nomineeMobile?: string;
  referenceName?: string;
  referenceRelation?: string;
  referenceMobile?: string;
  isBlacklisted?: boolean;
  blacklistReason?: string;
}

export interface CustomerActivity {
  id: number;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  performedBy: number | null;
  createdOn: string;
}

export const customersApi = {
  list: (params: {
    page?: number;
    limit?: number;
    search?: string;
    mobile?: string;
    blacklisted?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.mobile) q.set('mobile', params.mobile);
    if (params.blacklisted !== undefined) q.set('blacklisted', String(params.blacklisted));
    const qs = q.toString();
    return api.get<CustomerListResponse>(`/customers${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) => api.get<Customer>(`/customers/${id}`),
  nextId: () => api.get<{ customerId: number }>('/customers/next-id'),
  search: (q: string) =>
    api.get<
      Array<{
        id: number;
        customerId: number;
        label: string;
        name: string;
        fatherHusbandName: string;
        mobileNo: string;
        photoUrl: string | null;
        isBlacklisted: boolean;
      }>
    >(`/customers/search?q=${encodeURIComponent(q)}`),
  create: (data: CustomerFormData) => api.post<Customer>('/customers', data),
  update: (id: number, data: Omit<CustomerFormData, 'customerId'>) =>
    api.put<Customer>(`/customers/${id}`, data),
  delete: (id: number) => api.delete<{ id: number; deleted: boolean }>(`/customers/${id}`),
  uploadPhoto: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('photo', file);
    return api.upload<Customer>(`/customers/${id}/photo`, fd);
  },
  uploadKyc: (id: number, documentType: KycDocumentType, file: File) => {
    const fd = new FormData();
    fd.append('document', file);
    fd.append('documentType', documentType);
    return api.upload<Customer>(`/customers/${id}/kyc`, fd);
  },
  deleteKyc: (customerId: number, docId: number) =>
    api.delete<Customer>(`/customers/${customerId}/kyc/${docId}`),
  activities: (id: number) => api.get<CustomerActivity[]>(`/customers/${id}/activities`),
};
