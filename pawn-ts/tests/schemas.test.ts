import { describe, expect, it } from 'vitest';
import { createCustomerSchema } from '../src/modules/customers/customer.schema.js';
import { createPartPaymentSchema } from '../src/modules/interest/interest.schema.js';
import { closeLoanSchema, renewLoanSchema } from '../src/modules/renewals/renewal.schema.js';
import { createBankDepositSchema } from '../src/modules/repledges/repledge.schema.js';
import { createEntrySchema } from '../src/modules/accounts/accounts.schema.js';

describe('customer schema', () => {
  it('accepts valid customer with extended fields', () => {
    const data = createCustomerSchema.parse({
      customerId: 1001,
      name: 'Test User',
      fatherHusbandName: 'Father',
      address1: 'Address',
      mobileNo: '9876543210',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600001',
      email: 'test@example.com',
      aadhaarNo: '123456789012',
      panNo: 'ABCDE1234F',
      isBlacklisted: false,
    });
    expect(data.city).toBe('Chennai');
    expect(data.panNo).toBe('ABCDE1234F');
  });

  it('rejects empty name', () => {
    expect(() =>
      createCustomerSchema.parse({
        name: '',
        fatherHusbandName: 'B',
        address1: 'C',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600001',
      })
    ).toThrow();
  });

  it('rejects missing city, state, or postal code', () => {
    const base = {
      name: 'Test User',
      fatherHusbandName: 'Father',
      address1: 'Address',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600001',
    };
    expect(() => createCustomerSchema.parse({ ...base, city: '' })).toThrow();
    expect(() => createCustomerSchema.parse({ ...base, state: '' })).toThrow();
    expect(() => createCustomerSchema.parse({ ...base, pinCode: '' })).toThrow();
  });
});

describe('interest schema', () => {
  it('validates part payment', () => {
    const data = createPartPaymentSchema.parse({
      loanId: 1,
      amount: 500,
      payDate: '2024-06-01',
    });
    expect(data.amount).toBe(500);
  });
});

describe('renewal schema', () => {
  it('validates close loan payload', () => {
    const data = closeLoanSchema.parse({
      settledAmount: 12000,
      loanSettledDate: '2024-06-01',
      securityPin: '1234',
    });
    expect(data.settledAmount).toBe(12000);
  });

  it('validates renew loan payload', () => {
    const data = renewLoanSchema.parse({
      newInvoiceNo: 50002,
      newLoanAmount: 15000,
      loanAmountWords: 'Fifteen thousand Rupees only',
      loanDate: '2024-06-01',
      securityPin: '1234',
    });
    expect(data.newLoanAmount).toBe(15000);
  });
});

describe('repledge schema', () => {
  it('validates bank deposit', () => {
    const data = createBankDepositSchema.parse({
      loanId: 1,
      bankName: 'SBI',
      depositAmount: 10000,
      depositDate: '2024-06-01',
    });
    expect(data.bankName).toBe('SBI');
  });
});

describe('accounts schema', () => {
  it('validates income entry', () => {
    const data = createEntrySchema.parse({
      userName: 'admin',
      description: 'Loan interest',
      category: 1,
      amount: 2500,
      entryDate: '2024-06-01',
    });
    expect(data.category).toBe(1);
  });
});
