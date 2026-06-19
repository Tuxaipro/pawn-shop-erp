import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';

export function BranchSelector() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { branches, branchId, setBranchId, currentBranch } = useBranch();

  if (!user || branches.length <= 1) return null;

  if (user.role !== 'SUPER_ADMIN') {
    return currentBranch ? (
      <span className="text-sm text-zinc-600">
        {t('branch')}: <span className="font-medium text-zinc-950">{currentBranch.name}</span>
      </span>
    ) : null;
  }

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-600">
      <span className="shrink-0">{t('branch')}</span>
      <select
        value={branchId}
        onChange={(e) => setBranchId(Number(e.target.value))}
        className="rounded-lg border-0 bg-white py-1.5 pl-2 pr-8 text-sm font-medium text-zinc-950 shadow-sm ring-1 ring-zinc-950/10"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}
