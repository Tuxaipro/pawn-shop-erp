import { describe, expect, it } from 'vitest';
import { computeRenewalDate, formatDateOnly, parseDateOnly } from '../src/lib/loan-dates.js';

describe('computeRenewalDate', () => {
  it('adds 12 months for general condition', () => {
    const loanDate = new Date('2024-03-15T12:00:00');
    const { renewalDate, deadLineMonth } = computeRenewalDate(loanDate, 'general');
    expect(deadLineMonth).toBe(12);
    expect(renewalDate.getFullYear()).toBe(2025);
    expect(renewalDate.getMonth()).toBe(loanDate.getMonth());
  });

  it('adds weeks for personal condition type 1', () => {
    const loanDate = new Date('2024-01-01T12:00:00');
    const { renewalDate } = computeRenewalDate(loanDate, 'personal', 2, 1);
    const diffDays = Math.round((renewalDate.getTime() - loanDate.getTime()) / 86400000);
    expect(diffDays).toBe(14);
  });

  it('adds months for personal condition type 2', () => {
    const loanDate = new Date('2024-01-01T12:00:00');
    const { renewalDate } = computeRenewalDate(loanDate, 'personal', 3, 2);
    expect(renewalDate.getMonth()).toBe(3);
    expect(renewalDate.getFullYear()).toBe(2024);
  });
});

describe('parseDateOnly', () => {
  it('parses ISO date string as UTC calendar date', () => {
    const d = parseDateOnly('2024-06-10');
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(5);
    expect(d.getUTCDate()).toBe(10);
  });

  it('round-trips with formatDateOnly', () => {
    const d = parseDateOnly('2026-06-15');
    expect(formatDateOnly(d)).toBe('2026-06-15');
  });
});
