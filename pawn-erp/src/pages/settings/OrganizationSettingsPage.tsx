import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { settingsApi } from '../../api/settings';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';

export function OrganizationSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'organization'],
    queryFn: () => settingsApi.getOrganization(),
  });

  const [form, setForm] = useState({ companyName: '', proprietor: '' });

  useEffect(() => {
    if (data) {
      setForm({ companyName: data.companyName, proprietor: data.proprietor });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      settingsApi.updateOrganization({
        companyName: form.companyName.trim(),
        proprietor: form.proprietor.trim(),
      }),
    onSuccess: async () => {
      setSaved(true);
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['settings', 'organization'] });
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (user?.role !== 'SUPER_ADMIN') {
    return <Alert>{t('common:branches.errors.forbidden', { defaultValue: 'Only super admins can manage settings.' })}</Alert>;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setError(t('common:branches.errors.required'));
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading) return <p className="text-sm text-zinc-500">{t('common:loading')}</p>;

  return (
    <Card className="max-w-2xl p-4">
      <h2 className="text-sm font-semibold text-zinc-950">{t('organization.title')}</h2>
      <p className="mt-1 text-sm text-zinc-500">{t('organization.hint')}</p>
      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
      {saved && <p className="mt-3 text-sm font-medium text-emerald-700">{t('organization.saved')}</p>}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label={t('organization.company_name')} required>
          <Input
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            placeholder="Kabilan Pawn Shop"
            maxLength={100}
            required
          />
        </Field>
        <Field label={t('organization.proprietor')}>
          <Input
            value={form.proprietor}
            onChange={(e) => setForm((f) => ({ ...f, proprietor: e.target.value }))}
            placeholder="Prop.: M. Kabilan, M.E.,"
            maxLength={100}
          />
        </Field>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? t('common:loading') : t('common:actions.save')}
        </Button>
      </form>
    </Card>
  );
}
