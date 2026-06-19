import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { customersApi } from '../../api/customers';
import { CustomerActivityTimeline } from '../../components/customers/CustomerActivityTimeline';
import { PageHeader } from '../../components/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';

export function CustomerDetailPage() {
  const { t } = useTranslation(['customer', 'common']);
  const { id } = useParams<{ id: string }>();
  const customerId = Number(id);

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customers', customerId],
    queryFn: () => customersApi.get(customerId),
    enabled: !Number.isNaN(customerId),
  });

  if (isLoading) return <p className="text-sm/6 text-zinc-500">{t('common:loading')}</p>;
  if (error || !customer) return <p className="text-red-600">{(error as Error)?.message ?? 'Not found'}</p>;

  return (
    <div>
      <PageHeader
        compact
        title={customer.name}
        subtitle={`${t('fields.customer_id')}: ${customer.customerId}`}
      />

      {customer.isBlacklisted && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <Badge variant="danger">{t('fields.blacklisted')}</Badge>
          {customer.blacklistReason && (
            <p className="mt-2 text-sm text-red-800">{customer.blacklistReason}</p>
          )}
          {customer.blacklistedAt && (
            <p className="mt-1 text-xs text-red-600">
              {t('fields.blacklisted_at')}: {new Date(customer.blacklistedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardTitle>{t('fields.photo')}</CardTitle>
          {customer.photoUrl ? (
            <div className="mt-4 flex min-h-40 items-center justify-center rounded-lg bg-zinc-100 ring-1 ring-zinc-950/5">
              <img
                src={customer.photoUrl}
                alt={customer.name}
                className="max-h-52 w-full rounded-lg object-contain"
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">{t('photo.no_photo')}</p>
          )}
        </Card>

        <Card>
          <CardTitle>{t('sections.contact')}</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-zinc-500">{t('fields.mobile')}</dt><dd className="font-medium">{customer.mobileNo || '—'}</dd></div>
            <div><dt className="text-zinc-500">{t('fields.whatsapp')}</dt><dd className="font-medium">{customer.whatsappNo || '—'}</dd></div>
            <div><dt className="text-zinc-500">{t('fields.email')}</dt><dd className="font-medium">{customer.email || '—'}</dd></div>
            <div><dt className="text-zinc-500">{t('fields.occupation')}</dt><dd className="font-medium">{customer.occupation || '—'}</dd></div>
          </dl>
        </Card>

        <Card>
          <CardTitle>{t('sections.address')}</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-zinc-500">{t('fields.address1')}</dt><dd className="font-medium">{customer.address1}</dd></div>
            {customer.address2 && (
              <div><dt className="text-zinc-500">{t('fields.address2')}</dt><dd>{customer.address2}</dd></div>
            )}
            <div><dt className="text-zinc-500">{t('fields.city')}</dt><dd>{customer.city || '—'}</dd></div>
            <div><dt className="text-zinc-500">{t('fields.state')}</dt><dd>{customer.state || '—'}</dd></div>
            <div><dt className="text-zinc-500">{t('fields.postal_code')}</dt><dd>{customer.pinCode || '—'}</dd></div>
            <div><dt className="text-zinc-500">{t('fields.country')}</dt><dd>{customer.country || '—'}</dd></div>
          </dl>
        </Card>

        <Card>
          <CardTitle>{t('sections.kyc')}</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-zinc-500">{t('fields.aadhaar')}</dt><dd className="font-medium">{customer.aadhaarNo || '—'}</dd></div>
            <div><dt className="text-zinc-500">{t('fields.pan')}</dt><dd className="font-medium">{customer.panNo || '—'}</dd></div>
          </dl>
          {customer.kycDocuments.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {customer.kycDocuments.map((d) => (
                <li key={d.id}>
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-zinc-950 underline">
                    {d.fileName}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>{t('sections.nominee')}</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-zinc-500">{t('fields.nominee_name')}</dt><dd>{customer.nomineeName || '—'}</dd></div>
            <div><dt className="text-zinc-500">{t('fields.nominee_relation')}</dt><dd>{customer.nomineeRelation || '—'}</dd></div>
            <div><dt className="text-zinc-500">{t('fields.nominee_mobile')}</dt><dd>{customer.nomineeMobile || '—'}</dd></div>
          </dl>
        </Card>

        <Card>
          <CardTitle>{t('sections.reference')}</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-zinc-500">{t('fields.reference_name')}</dt><dd>{customer.referenceName || '—'}</dd></div>
            <div><dt className="text-zinc-500">{t('fields.reference_relation')}</dt><dd>{customer.referenceRelation || '—'}</dd></div>
            <div><dt className="text-zinc-500">{t('fields.reference_mobile')}</dt><dd>{customer.referenceMobile || '—'}</dd></div>
          </dl>
        </Card>

        <div className="lg:col-span-3">
          <CustomerActivityTimeline customerId={customer.id} />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Link to="/customers" className="text-sm font-medium text-zinc-500 no-underline hover:text-zinc-950">
          ← {t('common:nav.customers')}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link to={`/loans/new?customerId=${customer.id}&reloan=1`} className="no-underline">
            <Button variant="secondary">{t('common:actions.reloan')}</Button>
          </Link>
          <Link to={`/customers/${customer.id}/edit`} className="no-underline">
            <Button>{t('title_edit')}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
