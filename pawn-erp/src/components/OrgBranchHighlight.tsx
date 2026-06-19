import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import { useBranch } from '../context/BranchContext';

export function OrgBranchHighlight() {
  const { branches, currentBranch } = useBranch();
  const { data: org } = useQuery({
    queryKey: ['settings', 'organization'],
    queryFn: () => settingsApi.getOrganization(),
  });

  if (!org?.companyName) return null;

  if (branches.length <= 1) {
    return <span className="text-base font-bold text-zinc-950">{org.companyName}</span>;
  }

  if (!currentBranch?.name) return null;

  return (
    <span className="text-base font-bold text-zinc-950">
      {org.companyName} ({currentBranch.name})
    </span>
  );
}
