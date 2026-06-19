import { describe, expect, it } from 'vitest';
import { buildCustomerPhotoKey, buildKycKey } from '../src/lib/storage.js';

describe('storage keys', () => {
  it('builds customer photo path', () => {
    expect(buildCustomerPhotoKey(42, 'image/jpeg')).toBe('customers/42/photo.jpg');
  });

  it('builds kyc document path with type prefix', () => {
    const key = buildKycKey(42, 'aadhaar', 'application/pdf');
    expect(key).toMatch(/^customers\/42\/kyc\/aadhaar-/);
    expect(key.endsWith('.pdf')).toBe(true);
  });
});
