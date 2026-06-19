import { describe, expect, it } from 'vitest';
import {
  calculateInterestAmount,
  calculateInterestMonths,
  calculatePartPaymentRemaining,
} from '../src/lib/interest-engine.js';

describe('calculateInterestMonths', () => {
  it('counts half month when days are 1-3', () => {
    const loanDate = new Date('2024-01-01');
    const asOf = new Date('2024-02-02');
    const result = calculateInterestMonths(loanDate, asOf);
    expect(result.totMonth).toBe(1.5);
  });

  it('counts full month when days exceed 3', () => {
    const loanDate = new Date('2024-01-01');
    const asOf = new Date('2024-02-05');
    const result = calculateInterestMonths(loanDate, asOf);
    expect(result.totMonth).toBe(2);
  });

  it('defaults to half month on same-day loan', () => {
    const d = new Date('2024-06-10');
    const result = calculateInterestMonths(d, d);
    expect(result.totMonth).toBe(0.5);
  });
});

describe('calculateInterestAmount', () => {
  it('computes interest for a 12-month gold loan', () => {
    const loanDate = new Date('2023-06-01');
    const asOf = new Date('2024-06-01');
    const result = calculateInterestAmount(10000, 2.5, loanDate, 0, asOf);
    expect(result.status).toBe(1);
    if (result.status === 1) {
      expect(result.interestAmount).toBe(3000);
      expect(result.totalPayable).toBe(13000);
      expect(result.netPayable).toBe(13000);
    }
  });

  it('reduces net payable by part payments', () => {
    const loanDate = new Date('2023-06-01');
    const asOf = new Date('2024-06-01');
    const result = calculateInterestAmount(10000, 2.5, loanDate, 5000, asOf);
    expect(result.status).toBe(1);
    if (result.status === 1) {
      expect(result.partPaymentTotal).toBe(5000);
      expect(result.netPayable).toBe(8000);
    }
  });

  it('rejects zero loan amount', () => {
    const result = calculateInterestAmount(0, 2.5, new Date());
    expect(result.status).toBe(0);
  });
});

describe('calculatePartPaymentRemaining', () => {
  it('sums multiple payments', () => {
    const loanDate = new Date('2024-01-01');
    const asOf = new Date('2024-07-01');
    const result = calculatePartPaymentRemaining(
      20000,
      2,
      loanDate,
      [1000, 2000],
      asOf
    );
    expect(result.status).toBe(1);
    if (result.status === 1) {
      expect(result.partPaymentTotal).toBe(3000);
      expect(result.remainingPayable).toBe(result.netPayable);
    }
  });
});
