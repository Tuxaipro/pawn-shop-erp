import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'organization'],
    queryFn: () => settingsApi.getOrganization(),
  });

  const [form, setForm] = useState({ companyName: '', proprietor: '', logoUrl: '' });

  useEffect(() => {
    if (data) {
      setForm({
        companyName: data.companyName,
        proprietor: data.proprietor,
        logoUrl: data.logoUrl ?? '',
      });
    }
  }, [data]);

  const MAX_LOGO_BYTES = 1024 * 1024; // 1 MB

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('organization.logo_invalid'));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError(t('organization.logo_too_large'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError('');
      setForm((f) => ({ ...f, logoUrl: String(reader.result) }));
    };
    reader.onerror = () => setError(t('organization.logo_invalid'));
    reader.readAsDataURL(file);
  };

  const removeLogo = () => setForm((f) => ({ ...f, logoUrl: '' }));

  const saveMutation = useMutation({
    mutationFn: () =>
      settingsApi.updateOrganization({
        companyName: form.companyName.trim(),
        proprietor: form.proprietor.trim(),
        logoUrl: form.logoUrl,
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
        <Field label={t('organization.logo')}>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-sm font-bold text-white">
                  P
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
              />
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                {form.logoUrl ? t('organization.logo_change') : t('organization.logo_upload')}
              </Button>
              {form.logoUrl && (
                <Button type="button" variant="ghost" onClick={removeLogo}>
                  {t('organization.logo_remove')}
                </Button>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">{t('organization.logo_hint')}</p>
        </Field>
        <Field label={t('organization.company_name')} required>
          <Input
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            placeholder="Ganesan Pawn Shop"
            maxLength={100}
            required
          />
        </Field>
        <Field label={t('organization.proprietor')}>
          <Input
            value={form.proprietor}
            onChange={(e) => setForm((f) => ({ ...f, proprietor: e.target.value }))}
            placeholder="Prop.: S. Ganesan, B.A.,"
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
