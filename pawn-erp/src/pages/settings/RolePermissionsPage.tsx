import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

export function RolePermissionsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'roles'],
    queryFn: () => authApi.listRoles(),
  });

  if (user?.role !== 'SUPER_ADMIN') {
    return <Alert>{t('common:branches.errors.forbidden')}</Alert>;
  }

  if (isLoading || !data) {
    return <p className="text-sm text-zinc-500">{t('common:loading')}</p>;
  }

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">{t('security.roles.hint')}</p>
      <Card className="overflow-x-auto p-0">
        <TableCard>
          <DataTable>
            <THead>
              <tr>
                <TH className="sticky left-0 bg-white">{t('security.roles.permission')}</TH>
                {data.roles.map((r) => (
                  <TH key={r.role} className="min-w-[100px] text-center text-xs">
                    {r.label}
                  </TH>
                ))}
              </tr>
            </THead>
            <TBody>
              {data.permissions.map((perm) => (
                <tr key={perm}>
                  <TD className="sticky left-0 bg-white font-mono text-xs">{perm}</TD>
                  {data.roles.map((r) => {
                    const allowed =
                      r.permissions.includes('*') || r.permissions.includes(perm);
                    return (
                      <TD key={r.role} className="text-center">
                        {allowed ? (
                          <span className="text-emerald-600">✓</span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </TD>
                    );
                  })}
                </tr>
              ))}
            </TBody>
          </DataTable>
        </TableCard>
      </Card>
    </div>
  );
}
