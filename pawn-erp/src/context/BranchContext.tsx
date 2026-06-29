import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

export interface Branch {
  id: number;
  code: string;
  name: string;
  address?: string;
  landline?: string;
  phone?: string;
  whatsapp?: string;
}

interface BranchContextValue {
  branches: Branch[];
  branchId: number;
  setBranchId: (id: number) => void;
  currentBranch: Branch | undefined;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextValue | null>(null);
const STORAGE_KEY = 'pawn_branch_id';

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchIdState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : user?.branchId ?? 1;
  });

  const refreshBranches = async () => {
    try {
      const list = await api.get<Branch[]>('/branches');
      setBranches(list);
      setBranchIdState((current) => {
        if (list.some((b) => b.id === current)) return current;
        return list[0]?.id ?? current;
      });
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!user) return;
    void refreshBranches();
  }, [user]);

  useEffect(() => {
    if (user?.branchId && user.role !== 'SUPER_ADMIN') {
      setBranchIdState(user.branchId);
    }
  }, [user]);

  const setBranchId = (id: number) => {
    setBranchIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
    void queryClient.invalidateQueries({ refetchType: 'active' });
  };

  const currentBranch = branches.find((b) => b.id === branchId);

  return (
    <BranchContext.Provider value={{ branches, branchId, setBranchId, currentBranch, refreshBranches }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within BranchProvider');
  return ctx;
}
