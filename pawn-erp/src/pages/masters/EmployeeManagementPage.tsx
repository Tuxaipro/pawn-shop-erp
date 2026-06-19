import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import { branchesApi } from '../../api/branches';
import { mastersApi, type EmployeeInput, type EmployeeRecord } from '../../api/masters';
import { useAuth } from '../../context/AuthContext';
import { StatusToggle } from '../../components/masters/StatusToggle';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Input';
import { RowActions } from '../../components/ui/RowActions';
import { Section } from '../../components/ui/Section';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

const emptyForm = (): EmployeeInput => ({
  employeeCode: '',
  name: '',
  mobile: '',
  email: '',
  designation: '',
  branchId: null,
  userId: null,
  joiningDate: '',
});

export function EmployeeManagementPage() {
  const { t } = useTranslation('masters');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['masters', 'employees'],
    queryFn: () => mastersApi.employees.list(true),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: () => branchesApi.list(true),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: () => authApi.listUsers(),
    enabled: user?.role === 'SUPER_ADMIN',
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['masters', 'employees'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        employeeCode: form.employeeCode.trim().toUpperCase(),
        name: form.name.trim(),
        joiningDate: form.joiningDate || null,
      };
      if (editId) return mastersApi.employees.update(editId, payload);
      return mastersApi.employees.create(payload);
    },
    onSuccess: () => {
      setForm(emptyForm());
      setEditId(null);
      setError('');
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => mastersApi.employees.toggleStatus(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mastersApi.employees.delete(id),
    onSuccess: invalidate,
  });

  const startEdit = (e: EmployeeRecord) => {
    setEditId(e.id);
    setForm({
      employeeCode: e.employeeCode,
      name: e.name,
      mobile: e.mobile,
      email: e.email,
      designation: e.designation,
      branchId: e.branchId,
      userId: e.userId,
      joiningDate: e.joiningDate ?? '',
    });
  };

  const handleSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!form.employeeCode.trim() || !form.name.trim()) {
      setError(t('employees.required'));
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div data-testid="master-employees-page">
      <Section title={editId ? t('employees.edit_title') : t('employees.add_title')}>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t('employees.code')} required>
            <Input
              value={form.employeeCode}
              onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))}
              disabled={!!editId}
              maxLength={20}
              required
            />
          </Field>
          <Field label={t('employees.name')} required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <Field label={t('employees.designation')}>
            <Input
              value={form.designation}
              onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
            />
          </Field>
          <Field label={t('employees.mobile')}>
            <Input
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
            />
          </Field>
          <Field label={t('employees.email')}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label={t('employees.branch')}>
            <Select
              value={form.branchId ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  branchId: e.target.value ? Number(e.target.value) : null,
                }))
              }
            >
              <option value="">{t('employees.no_branch')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          {user?.role === 'SUPER_ADMIN' && (
            <Field label={t('employees.system_user')}>
              <Select
                value={form.userId ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    userId: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              >
                <option value="">{t('employees.no_user')}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={t('employees.joining_date')}>
            <Input
              type="date"
              value={form.joiningDate ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))}
            />
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={saveMutation.isPending}>
              {editId ? t('actions.save') : t('actions.add')}
            </Button>
            {editId && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditId(null);
                  setForm(emptyForm());
                }}
              >
                {t('actions.cancel')}
              </Button>
            )}
          </div>
        </form>
        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}
      </Section>

      <div className="mt-8">
        <Section title={t('employees.list_title')}>
          {isLoading ? (
            <p className="text-sm text-zinc-500">{t('common:loading', { ns: 'common' })}</p>
          ) : (
            <TableCard>
              <DataTable>
                <THead>
                  <tr>
                    <TH>{t('employees.code')}</TH>
                    <TH>{t('employees.name')}</TH>
                    <TH>{t('employees.designation')}</TH>
                    <TH>{t('employees.branch')}</TH>
                    <TH>{t('employees.system_user')}</TH>
                    <TH>{t('fields.status')}</TH>
                    <TH />
                  </tr>
                </THead>
                <TBody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <TD className="font-mono text-sm">{row.employeeCode}</TD>
                      <TD>{row.name}</TD>
                      <TD>{row.designation || '—'}</TD>
                      <TD>{row.branchName ?? '—'}</TD>
                      <TD className="text-xs">{row.userEmail ?? '—'}</TD>
                      <TD>
                        <StatusToggle
                          active={row.isActive}
                          onToggle={() => toggleMutation.mutate(row.id)}
                        />
                      </TD>
                      <TD>
                        <RowActions
                          onEdit={() => startEdit(row)}
                          onDelete={() => {
                            if (window.confirm(t('confirm.delete'))) {
                              deleteMutation.mutate(row.id);
                            }
                          }}
                        />
                      </TD>
                    </tr>
                  ))}
                </TBody>
              </DataTable>
            </TableCard>
          )}
        </Section>
      </div>
    </div>
  );
}
