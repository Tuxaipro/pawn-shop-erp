import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { settingsApi } from '../../api/settings';
import { OPTIONAL_MODULE_KEYS } from '../../lib/appModules';
import { MIN_DASHBOARD_REFRESH_SECONDS } from '../../lib/dashboardRefresh';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';

const MODULE_LABEL_KEYS: Record<(typeof OPTIONAL_MODULE_KEYS)[number], string> = {
  bankLoans: 'organization.modules.bank_loans',
  auctions: 'organization.modules.auctions',
  investments: 'organization.modules.investments',
  gl: 'organization.modules.gl',
  notifications: 'organization.modules.notifications',
};

const MIN_SESSION_MINUTES = 5;
const MAX_SESSION_MINUTES = 480;

export function ApplicationSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'organization'],
    queryFn: () => settingsApi.getOrganization(),
  });

  const [form, setForm] = useState({
    dashboardRefreshSeconds: '60',
    sessionTimeoutMinutes: '30',
    modules: {
      bankLoans: false,
      auctions: false,
      investments: false,
      gl: false,
      notifications: false,
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        dashboardRefreshSeconds: String(data.dashboardRefreshSeconds),
        sessionTimeoutMinutes: String(data.sessionTimeoutMinutes),
        modules: { ...data.modules },
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      settingsApi.updatePreferences({
        dashboardRefreshSeconds: Number(form.dashboardRefreshSeconds),
        sessionTimeoutMinutes: Number(form.sessionTimeoutMinutes),
        modules: form.modules,
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
    return <Alert>{t('common:branches.errors.forbidden')}</Alert>;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const refreshSeconds = Number(form.dashboardRefreshSeconds);
    const sessionMinutes = Number(form.sessionTimeoutMinutes);
    if (
      !Number.isInteger(refreshSeconds) ||
      refreshSeconds < MIN_DASHBOARD_REFRESH_SECONDS
    ) {
      setError(t('organization.dashboard_refresh_min', { min: MIN_DASHBOARD_REFRESH_SECONDS }));
      return;
    }
    if (
      !Number.isInteger(sessionMinutes) ||
      sessionMinutes < MIN_SESSION_MINUTES ||
      sessionMinutes > MAX_SESSION_MINUTES
    ) {
      setError(t('preferences.session_timeout_range', { min: MIN_SESSION_MINUTES, max: MAX_SESSION_MINUTES }));
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading) return <p className="text-sm text-zinc-500">{t('common:loading')}</p>;

  return (
    <Card className="max-w-2xl p-4">
      <h2 className="text-sm font-semibold text-zinc-950">{t('preferences.title')}</h2>
      <p className="mt-1 text-sm text-zinc-500">{t('preferences.hint')}</p>
      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
      {saved && <p className="mt-3 text-sm font-medium text-emerald-700">{t('preferences.saved')}</p>}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label={t('organization.dashboard_refresh_seconds')} required>
          <Input
            type="number"
            min={MIN_DASHBOARD_REFRESH_SECONDS}
            max={3600}
            step={1}
            value={form.dashboardRefreshSeconds}
            onChange={(e) =>
              setForm((f) => ({ ...f, dashboardRefreshSeconds: e.target.value }))
            }
            required
          />
          <p className="mt-1 text-xs text-zinc-500">
            {t('organization.dashboard_refresh_hint', { min: MIN_DASHBOARD_REFRESH_SECONDS })}
          </p>
        </Field>

        <Field label={t('preferences.session_timeout_minutes')} required>
          <Input
            type="number"
            min={MIN_SESSION_MINUTES}
            max={MAX_SESSION_MINUTES}
            step={1}
            value={form.sessionTimeoutMinutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, sessionTimeoutMinutes: e.target.value }))
            }
            required
          />
          <p className="mt-1 text-xs text-zinc-500">{t('preferences.session_timeout_hint')}</p>
        </Field>

        <div className="border-t border-zinc-200 pt-4">
          <h3 className="text-sm font-semibold text-zinc-950">{t('organization.modules.title')}</h3>
          <p className="mt-1 text-xs text-zinc-500">{t('organization.modules.hint')}</p>
          <div className="mt-3 space-y-2">
            {OPTIONAL_MODULE_KEYS.map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200/80 px-3 py-2.5 hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                  checked={form.modules[key]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      modules: { ...f.modules, [key]: e.target.checked },
                    }))
                  }
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-950">
                    {t(MODULE_LABEL_KEYS[key])}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {t(`organization.modules.${key}_hint`)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? t('common:loading') : t('common:actions.save')}
        </Button>
      </form>
    </Card>
  );
}
