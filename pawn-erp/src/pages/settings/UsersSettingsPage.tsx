import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authApi, type CreateUserInput, type UserRecord } from '../../api/auth';
import { branchesApi } from '../../api/branches';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Input';
import { Section } from '../../components/ui/Section';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

const ROLES = [
  'SUPER_ADMIN',
  'BRANCH_MANAGER',
  'CASHIER',
  'APPRAISER',
  'ACCOUNTANT',
  'AUDITOR',
] as const;

const emptyForm = (): CreateUserInput => ({
  email: '',
  password: '',
  name: '',
  role: 'CASHIER',
  branchId: null,
  preferredLanguage: 'en',
});

export function UsersSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: () => authApi.listUsers(),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: () => branchesApi.list(true),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['auth', 'users'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { password, ...rest } = form;
        return authApi.updateUser(editingId, password ? form : rest);
      }
      return authApi.createUser(form);
    },
    onSuccess: () => {
      setForm(emptyForm());
      setEditingId(null);
      setError('');
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      authApi.setUserActive(id, isActive),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  if (user?.role !== 'SUPER_ADMIN') {
    return <Alert>{t('common:branches.errors.forbidden')}</Alert>;
  }

  const startEdit = (u: UserRecord) => {
    setEditingId(u.id);
    setForm({
      email: u.email,
      password: '',
      name: u.name,
      role: u.role,
      branchId: u.branchId,
      preferredLanguage: u.preferredLanguage,
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError(t('common:branches.errors.required'));
      return;
    }
    if (!editingId && !form.password) {
      setError(t('security.users.password_required'));
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">{t('security.users.hint')}</p>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card className="mb-6 p-4">
        <h2 className="text-sm font-semibold text-zinc-950">
          {editingId ? t('security.users.edit_title') : t('security.users.add_title')}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t('security.users.name')} required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <Field label={t('security.users.email')} required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </Field>
          <Field label={t('security.users.password')} required={!editingId}>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={editingId ? t('security.users.password_optional') : ''}
            />
          </Field>
          <Field label={t('security.users.role')} required>
            <Select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`security.roles.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('security.users.branch')}>
            <Select
              value={form.branchId ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  branchId: e.target.value ? Number(e.target.value) : null,
                }))
              }
            >
              <option value="">{t('security.users.no_branch')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t('common:loading') : t('common:actions.save')}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm());
                }}
              >
                {t('common:actions.cancel')}
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Section title={t('security.users.list_title')}>
        {isLoading ? (
          <p className="text-sm text-zinc-500">{t('common:loading')}</p>
        ) : (
          <TableCard>
            <DataTable>
              <THead>
                <tr>
                  <TH>{t('security.users.name')}</TH>
                  <TH>{t('security.users.email')}</TH>
                  <TH>{t('security.users.role')}</TH>
                  <TH>{t('security.users.branch')}</TH>
                  <TH>{t('security.users.status')}</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <TD>{u.name}</TD>
                    <TD>{u.email}</TD>
                    <TD>{t(`security.roles.${u.role}`)}</TD>
                    <TD>{u.branchName ?? '—'}</TD>
                    <TD>
                      <Badge variant={u.isActive ? 'open' : 'closed'}>
                        {u.isActive ? t('security.users.active') : t('security.users.inactive')}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => startEdit(u)}>
                          {t('common:actions.edit')}
                        </Button>
                        {u.id !== user.id && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              toggleMutation.mutate({ id: u.id, isActive: !u.isActive })
                            }
                          >
                            {u.isActive
                              ? t('security.users.deactivate')
                              : t('security.users.activate')}
                          </Button>
                        )}
                      </div>
                    </TD>
                  </tr>
                ))}
              </TBody>
            </DataTable>
          </TableCard>
        )}
      </Section>
    </div>
  );
}
