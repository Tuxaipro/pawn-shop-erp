import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomerFormData, KycDocument, KycDocumentType } from '../../api/customers';
import { KycDocumentsSection } from '../../components/customers/KycDocumentsSection';
import { PhotoCapture } from '../../components/customers/PhotoCapture';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Textarea } from '../../components/ui/Input';

export interface CustomerFormSubmitResult {
  data: CustomerFormData;
  photoFile: File | null;
  kycFiles: Array<{ type: KycDocumentType; file: File }>;
}

interface CustomerFormProps {
  initial?: Partial<CustomerFormData>;
  photoUrl?: string | null;
  kycDocuments?: KycDocument[];
  blacklistedAt?: string | null;
  customerIdReadOnly?: boolean;
  submitLabel?: string;
  onSubmit: (result: CustomerFormSubmitResult) => Promise<void>;
  onDeleteKyc?: (docId: number) => Promise<void>;
  onCancel: () => void;
}

const emptyForm = (initial?: Partial<CustomerFormData>): CustomerFormData => ({
  customerId: initial?.customerId,
  name: initial?.name ?? '',
  fatherHusbandName: initial?.fatherHusbandName ?? '',
  address1: initial?.address1 ?? '',
  address2: initial?.address2 ?? '',
  mobileNo: initial?.mobileNo ?? '',
  whatsappNo: initial?.whatsappNo ?? '',
  email: initial?.email ?? '',
  city: initial?.city ?? '',
  state: initial?.state ?? '',
  country: initial?.country ?? 'India',
  pinCode: initial?.pinCode ?? '',
  aadhaarNo: initial?.aadhaarNo ?? '',
  panNo: initial?.panNo ?? '',
  occupation: initial?.occupation ?? '',
  nomineeName: initial?.nomineeName ?? '',
  nomineeRelation: initial?.nomineeRelation ?? '',
  nomineeMobile: initial?.nomineeMobile ?? '',
  referenceName: initial?.referenceName ?? '',
  referenceRelation: initial?.referenceRelation ?? '',
  referenceMobile: initial?.referenceMobile ?? '',
  isBlacklisted: initial?.isBlacklisted ?? false,
  blacklistReason: initial?.blacklistReason ?? '',
});

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function CustomerForm({
  initial,
  photoUrl,
  kycDocuments = [],
  blacklistedAt,
  customerIdReadOnly,
  submitLabel,
  onSubmit,
  onDeleteKyc,
  onCancel,
}: CustomerFormProps) {
  const { t } = useTranslation(['customer', 'common']);
  const [form, setForm] = useState<CustomerFormData>(() => emptyForm(initial));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [pendingKyc, setPendingKyc] = useState<Array<{ type: KycDocumentType; file: File }>>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field: keyof CustomerFormData, value: string | number | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'isBlacklisted' && value === false) {
        next.blacklistReason = '';
      }
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.isBlacklisted && !form.blacklistReason?.trim()) {
      setError(t('blacklist_reason_required'));
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSubmit({ data: form, photoFile, kycFiles: pendingKyc });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:errors.save_failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <Card>
            <CardTitle>{t('sections.identity')}</CardTitle>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row">
              <PhotoCapture compact currentUrl={photoUrl} onFileSelected={setPhotoFile} />
              <div className="min-w-0 flex-1 grid gap-4 sm:grid-cols-2">
                <Field label={t('fields.customer_id')} required>
                  <Input
                    type="number"
                    value={form.customerId ?? ''}
                    readOnly={customerIdReadOnly}
                    onChange={(e) => update('customerId', Number(e.target.value))}
                    required
                  />
                </Field>
                <Field label={t('fields.occupation')}>
                  <Input value={form.occupation ?? ''} onChange={(e) => update('occupation', e.target.value)} />
                </Field>
                <Field label={t('fields.name')} className="sm:col-span-2" required>
                  <Input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    required
                    maxLength={200}
                  />
                </Field>
                <Field label={t('fields.father_husband')} className="sm:col-span-2" required>
                  <Input
                    value={form.fatherHusbandName}
                    onChange={(e) => update('fatherHusbandName', e.target.value)}
                    required
                    maxLength={200}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>{t('sections.contact')}</CardTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('fields.mobile')}>
                <Input type="tel" value={form.mobileNo ?? ''} onChange={(e) => update('mobileNo', e.target.value)} />
              </Field>
              <Field label={t('fields.whatsapp')}>
                <Input type="tel" value={form.whatsappNo ?? ''} onChange={(e) => update('whatsappNo', e.target.value)} />
              </Field>
              <Field label={t('fields.email')} className="sm:col-span-2">
                <Input type="email" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardTitle>{t('sections.address')}</CardTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('fields.address1')} className="sm:col-span-2" required>
                <Input value={form.address1} onChange={(e) => update('address1', e.target.value)} required />
              </Field>
              <Field label={t('fields.address2')} className="sm:col-span-2">
                <Input value={form.address2 ?? ''} onChange={(e) => update('address2', e.target.value)} />
              </Field>
              <Field label={t('fields.city')} required>
                <Input
                  value={form.city ?? ''}
                  onChange={(e) => update('city', e.target.value)}
                  required
                  maxLength={100}
                />
              </Field>
              <Field label={t('fields.state')} required>
                <Input
                  value={form.state ?? ''}
                  onChange={(e) => update('state', e.target.value)}
                  required
                  maxLength={60}
                />
              </Field>
              <Field label={t('fields.postal_code')} required>
                <Input
                  value={form.pinCode ?? ''}
                  onChange={(e) => update('pinCode', e.target.value)}
                  required
                  maxLength={10}
                />
              </Field>
              <Field label={t('fields.country')}>
                <Input value={form.country ?? 'India'} onChange={(e) => update('country', e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardTitle>{t('sections.kyc')}</CardTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('fields.aadhaar')}>
                <Input
                  value={form.aadhaarNo ?? ''}
                  onChange={(e) => update('aadhaarNo', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  maxLength={12}
                  inputMode="numeric"
                />
              </Field>
              <Field label={t('fields.pan')}>
                <Input
                  value={form.panNo ?? ''}
                  onChange={(e) => update('panNo', e.target.value.toUpperCase().slice(0, 10))}
                  maxLength={10}
                />
              </Field>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-zinc-950">{t('kyc.title')}</p>
              <KycDocumentsSection
                documents={kycDocuments}
                pendingFiles={pendingKyc}
                onAddPending={(type, file) => setPendingKyc((p) => [...p, { type, file }])}
                onRemovePending={(i) => setPendingKyc((p) => p.filter((_, idx) => idx !== i))}
                onDeleteExisting={onDeleteKyc ? (id) => void onDeleteKyc(id) : undefined}
              />
            </div>
          </Card>

          <Card>
            <CardTitle>{t('sections.relations')}</CardTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('fields.nominee_name')}>
                <Input value={form.nomineeName ?? ''} onChange={(e) => update('nomineeName', e.target.value)} />
              </Field>
              <Field label={t('fields.nominee_relation')}>
                <Input value={form.nomineeRelation ?? ''} onChange={(e) => update('nomineeRelation', e.target.value)} />
              </Field>
              <Field label={t('fields.nominee_mobile')}>
                <Input value={form.nomineeMobile ?? ''} onChange={(e) => update('nomineeMobile', e.target.value)} />
              </Field>
              <div className="hidden sm:block" />
              <Field label={t('fields.reference_name')}>
                <Input value={form.referenceName ?? ''} onChange={(e) => update('referenceName', e.target.value)} />
              </Field>
              <Field label={t('fields.reference_relation')}>
                <Input
                  value={form.referenceRelation ?? ''}
                  onChange={(e) => update('referenceRelation', e.target.value)}
                />
              </Field>
              <Field label={t('fields.reference_mobile')} className="sm:col-span-2">
                <Input value={form.referenceMobile ?? ''} onChange={(e) => update('referenceMobile', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardTitle>{t('sections.status')}</CardTitle>
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.isBlacklisted ?? false}
                  onChange={(e) => update('isBlacklisted', e.target.checked)}
                  className="rounded border-zinc-300"
                />
                {t('fields.blacklisted')}
              </label>
              {form.isBlacklisted && (
                <>
                  <Field label={t('fields.blacklist_reason')} required>
                    <Textarea
                      value={form.blacklistReason ?? ''}
                      onChange={(e) => update('blacklistReason', e.target.value)}
                      maxLength={500}
                      rows={3}
                      required
                      placeholder={t('fields.blacklist_reason_placeholder')}
                    />
                  </Field>
                  {blacklistedAt && (
                    <p className="text-xs text-zinc-500">
                      {t('fields.blacklisted_at')}: {formatWhen(blacklistedAt)}
                    </p>
                  )}
                  <p className="text-sm text-amber-700">{t('blacklist_warning')}</p>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('common:actions.cancel')}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t('saving') : (submitLabel ?? t('save'))}
        </Button>
      </div>
    </form>
  );
}
