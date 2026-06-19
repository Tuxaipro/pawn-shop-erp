import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { branchesApi, type BranchRecord } from '../../api/branches';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { Section } from '../../components/ui/Section';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

type BranchForm = {
  code: string;
  name: string;
  address: string;
  landline: string;
  phone: string;
  whatsapp: string;
};

const emptyForm = (): BranchForm => ({
  code: '',
  name: '',
  address: '',
  landline: '',
  phone: '',
  whatsapp: '',
});

function branchToForm(b: BranchRecord): BranchForm {
  return {
    code: b.code,
    name: b.name,
    address: b.address ?? '',
    landline: b.landline ?? '',
    phone: b.phone ?? '',
    whatsapp: b.whatsapp ?? '',
  };
}

export function SettingsBranchesPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { user } = useAuth();
  const { refreshBranches } = useBranch();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: () => branchesApi.list(true),
  });

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setError('');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const profile = {
        name: form.name.trim(),
        address: form.address.trim(),
        landline: form.landline.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
      };
      if (editingId) return branchesApi.update(editingId, profile);
      return branchesApi.create({ code: form.code.trim().toUpperCase(), ...profile });
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      await refreshBranches();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (user?.role !== 'SUPER_ADMIN') {
    return <Alert>{t('common:branches.errors.forbidden')}</Alert>;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || (!editingId && !form.code.trim())) {
      setError(t('common:branches.errors.required'));
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card className="mb-6 p-4">
        <h2 className="text-sm font-semibold text-zinc-950">
          {editingId ? t('common:branches.edit_title') : t('common:branches.add_title')}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{t('common:branches.profile_hint')}</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {!editingId && (
            <Field label={t('common:branches.fields.code')} className="max-w-xs" required>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="NORTH"
                maxLength={20}
                required
              />
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t('branches.branch_name')} className="sm:col-span-2" required>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Main"
                maxLength={100}
                required
              />
              <p className="mt-1 text-xs text-zinc-500">{t('branches.branch_name_hint')}</p>
            </Field>
            <Field label={t('common:branches.fields.address')} className="sm:col-span-2 lg:col-span-3">
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                maxLength={250}
              />
            </Field>
            <Field label={t('common:branches.fields.landline')}>
              <Input value={form.landline} onChange={(e) => setForm((f) => ({ ...f, landline: e.target.value }))} maxLength={30} />
            </Field>
            <Field label={t('common:branches.fields.mobile')}>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} maxLength={20} />
            </Field>
            <Field label={t('common:branches.fields.whatsapp')}>
              <Input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} maxLength={20} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending
                ? t('common:loading')
                : editingId
                  ? t('common:branches.save_button')
                  : t('common:branches.add_button')}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                {t('common:actions.cancel')}
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Section title={t('common:branches.list_title')}>
        {isLoading ? (
          <p className="text-sm text-zinc-500">{t('common:loading')}</p>
        ) : (
          <TableCard>
            <DataTable>
              <THead>
                <tr>
                  <TH>{t('common:branches.fields.code')}</TH>
                  <TH>{t('branches.branch_name')}</TH>
                  <TH>{t('common:branches.fields.address')}</TH>
                  <TH>{t('common:branches.fields.landline')}</TH>
                  <TH>{t('common:branches.fields.mobile')}</TH>
                  <TH>{t('common:branches.fields.whatsapp')}</TH>
                  <TH>{t('common:branches.fields.status')}</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {branches.map((b) => (
                  <tr key={b.id}>
                    <TD className="font-medium">{b.code}</TD>
                    <TD>{b.name}</TD>
                    <TD className="max-w-[200px] truncate">{b.address || '—'}</TD>
                    <TD>{b.landline || '—'}</TD>
                    <TD>{b.phone || '—'}</TD>
                    <TD>{b.whatsapp || '—'}</TD>
                    <TD>
                      <Badge variant={b.isActive !== false ? 'open' : 'closed'}>
                        {b.isActive !== false ? t('common:branches.status_active') : t('common:branches.status_inactive')}
                      </Badge>
                    </TD>
                    <TD>
                      <Button type="button" variant="ghost" onClick={() => { setEditingId(b.id); setForm(branchToForm(b)); }}>
                        {t('common:actions.edit')}
                      </Button>
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
