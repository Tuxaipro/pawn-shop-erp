import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { customersApi } from '../../api/customers';
import { PageHeader } from '../../components/PageHeader';
import { CustomerForm } from './CustomerForm';
import { saveCustomerWithUploads } from './customerSave';

export function CustomerCreatePage() {
  const { t } = useTranslation('customer');
  const navigate = useNavigate();

  const { data: nextId, isLoading } = useQuery({
    queryKey: ['customers', 'next-id'],
    queryFn: () => customersApi.nextId(),
  });

  if (isLoading || !nextId) return <p className="text-zinc-500">{t('common:loading', { ns: 'common' })}</p>;

  return (
    <div>
      <PageHeader compact title={t('title_new')} subtitle={t('subtitle')} />
      <CustomerForm
        initial={{ customerId: nextId.customerId }}
        customerIdReadOnly={false}
        submitLabel={t('save')}
        onCancel={() => navigate('/customers')}
        onSubmit={async (result) => {
          const saved = await saveCustomerWithUploads(null, result);
          navigate(`/customers/${saved.id}`);
        }}
      />
    </div>
  );
}
