import { api, withBranch } from './client';

export interface BilingualNameFields {
  nameEn: string;
  nameTa: string;
  /** English name alias for backward compatibility */
  name: string;
}

export interface CommodityCategory extends BilingualNameFields {
  id: number;
  status: boolean;
}

export interface CommoditySubCategory extends BilingualNameFields {
  id: number;
  status: boolean;
  commodityTypeId: number;
  commodityTypeName: string;
  commodityTypeNameEn?: string;
  commodityTypeNameTa?: string;
}

export interface CommoditySubItem extends BilingualNameFields {
  id: number;
  status: boolean;
  commodityTypeId: number;
  subCategoryId: number;
  commodityTypeName: string;
  subCategoryName: string;
  commodityTypeNameEn?: string;
  commodityTypeNameTa?: string;
  subCategoryNameEn?: string;
  subCategoryNameTa?: string;
}

export interface InterestSlab {
  id: number;
  commodityTypeId: number;
  commodityTypeName: string;
  minAmount: number;
  maxAmount: number;
  taxPercentageGenCus: number;
  taxPercentageOtherShop: number;
}

export type BilingualNameInput = { nameEn: string; nameTa?: string };

export const mastersApi = {
  categories: {
    list: () => api.get<CommodityCategory[]>('/masters/categories'),
    create: (data: BilingualNameInput) => api.post<CommodityCategory>('/masters/categories', data),
    update: (id: number, data: BilingualNameInput) =>
      api.put<CommodityCategory>(`/masters/categories/${id}`, data),
    toggleStatus: (id: number) => api.patch<CommodityCategory>(`/masters/categories/${id}/status`, {}),
    delete: (id: number) => api.delete<{ id: number; deleted: boolean }>(`/masters/categories/${id}`),
  },
  subCategories: {
    list: (commodityTypeId?: number) => {
      const q = commodityTypeId ? `?commodityTypeId=${commodityTypeId}` : '';
      return api.get<CommoditySubCategory[]>(`/masters/sub-categories${q}`);
    },
    create: (data: BilingualNameInput & { commodityTypeId: number }) =>
      api.post<CommoditySubCategory>('/masters/sub-categories', data),
    update: (id: number, data: BilingualNameInput) =>
      api.put<CommoditySubCategory>(`/masters/sub-categories/${id}`, data),
    toggleStatus: (id: number) =>
      api.patch<CommoditySubCategory>(`/masters/sub-categories/${id}/status`, {}),
    delete: (id: number) =>
      api.delete<{ id: number; deleted: boolean }>(`/masters/sub-categories/${id}`),
  },
  subItems: {
    list: (params?: { commodityTypeId?: number; subCategoryId?: number }) => {
      const q = new URLSearchParams();
      if (params?.commodityTypeId) q.set('commodityTypeId', String(params.commodityTypeId));
      if (params?.subCategoryId) q.set('subCategoryId', String(params.subCategoryId));
      const qs = q.toString();
      return api.get<CommoditySubItem[]>(`/masters/sub-items${qs ? `?${qs}` : ''}`);
    },
    create: (data: BilingualNameInput & { commodityTypeId: number; subCategoryId: number }) =>
      api.post<CommoditySubItem>('/masters/sub-items', data),
    update: (id: number, data: BilingualNameInput) =>
      api.put<CommoditySubItem>(`/masters/sub-items/${id}`, data),
    toggleStatus: (id: number) => api.patch<CommoditySubItem>(`/masters/sub-items/${id}/status`, {}),
    delete: (id: number) => api.delete<{ id: number; deleted: boolean }>(`/masters/sub-items/${id}`),
  },
  interestDeclarations: {
    list: (branchId: number, commodityTypeId: number) =>
      api.get<InterestSlab[]>(
        withBranch(`/masters/interest-declarations?commodityTypeId=${commodityTypeId}`, branchId)
      ),
    nextMin: (branchId: number, commodityTypeId: number) =>
      api.get<{ minAmount: number }>(
        withBranch(
          `/masters/interest-declarations/next-min?commodityTypeId=${commodityTypeId}`,
          branchId
        )
      ),
    create: (
      branchId: number,
      data: {
        commodityTypeId: number;
        minAmount: number;
        maxAmount: number;
        taxPercentageGenCus: number;
        taxPercentageOtherShop: number;
      }
    ) => api.post<InterestSlab>('/masters/interest-declarations', { ...data, branchId }),
    update: (
      id: number,
      branchId: number,
      data: { taxPercentageGenCus: number; taxPercentageOtherShop?: number }
    ) => api.put<InterestSlab>(withBranch(`/masters/interest-declarations/${id}`, branchId), data),
  },
  employees: {
    list: (includeInactive = false) =>
      api.get<EmployeeRecord[]>(
        `/masters/employees${includeInactive ? '?includeInactive=true' : ''}`
      ),
    create: (data: EmployeeInput) => api.post<{ id: number }>('/masters/employees', data),
    update: (id: number, data: Partial<EmployeeInput>) =>
      api.put<{ id: number }>(`/masters/employees/${id}`, data),
    toggleStatus: (id: number) =>
      api.patch<{ id: number; isActive: boolean }>(`/masters/employees/${id}/status`, {}),
    delete: (id: number) => api.delete<{ id: number }>(`/masters/employees/${id}`),
  },
};

export interface EmployeeRecord {
  id: number;
  employeeCode: string;
  name: string;
  mobile: string;
  email: string;
  designation: string;
  branchId: number | null;
  branchName: string | null;
  userId: number | null;
  userEmail: string | null;
  userRole: string | null;
  joiningDate: string | null;
  isActive: boolean;
}

export type EmployeeInput = {
  employeeCode: string;
  name: string;
  mobile?: string;
  email?: string;
  designation?: string;
  branchId?: number | null;
  userId?: number | null;
  joiningDate?: string | null;
};
