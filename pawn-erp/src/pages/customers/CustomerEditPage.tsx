import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { customersApi } from '../../api/customers';
import { PageHeader } from '../../components/PageHeader';
import { CustomerForm } from './CustomerForm';
import { saveCustomerWithUploads } from './customerSave';

export function CustomerEditPage() {
  const { t } = useTranslation('customer');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const customerId = Number(id);

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customers', customerId],
    queryFn: () => customersApi.get(customerId),
    enabled: !Number.isNaN(customerId),
  });

  if (isLoading) return <p className="text-zinc-500">{t('common:loading', { ns: 'common' })}</p>;
  if (error || !customer) return <p className="text-red-600">{(error as Error)?.message ?? 'Not found'}</p>;

  return (
    <div>
      <PageHeader compact title={t('title_edit')} subtitle={customer.name} />
      <CustomerForm
        initial={customer}
        photoUrl={customer.photoUrl}
        kycDocuments={customer.kycDocuments}
        blacklistedAt={customer.blacklistedAt}
        customerIdReadOnly
        submitLabel={t('save')}
        onCancel={() => navigate(`/customers/${customer.id}`)}
        onDeleteKyc={async (docId) => {
          await customersApi.deleteKyc(customer.id, docId);
          await queryClient.invalidateQueries({ queryKey: ['customers', customerId] });
        }}
        onSubmit={async (result) => {
          const saved = await saveCustomerWithUploads(customer.id, result);
          navigate(`/customers/${saved.id}`);
        }}
      />
    </div>
  );
}
