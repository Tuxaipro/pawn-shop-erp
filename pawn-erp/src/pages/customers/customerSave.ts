import { customersApi } from '../../api/customers';
import type { CustomerFormSubmitResult } from './CustomerForm';

export async function saveCustomerWithUploads(
  customerDbId: number | null,
  result: CustomerFormSubmitResult
) {
  const { data, photoFile, kycFiles } = result;
  const customer = customerDbId
    ? await customersApi.update(customerDbId, data)
    : await customersApi.create(data);

  if (photoFile) {
    await customersApi.uploadPhoto(customer.id, photoFile);
  }
  for (const kyc of kycFiles) {
    await customersApi.uploadKyc(customer.id, kyc.type, kyc.file);
  }

  return customersApi.get(customer.id);
}
