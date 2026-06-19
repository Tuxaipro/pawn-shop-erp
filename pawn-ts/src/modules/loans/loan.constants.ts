export const LOAN_CONDITION = { personal: 1, general: 2 } as const;
export const CUSTOMER_TYPE = { general: 1, other: 2 } as const;

export const COMMODITY_LABELS: Record<number, string> = {
  1: 'Gold',
  2: 'Silver',
};

export const SETTLEMENT_LABELS: Record<number, string> = {
  0: 'open',
  1: 'closed',
  2: 'renewed',
};

export function conditionFromCode(code: 'general' | 'personal') {
  return LOAN_CONDITION[code];
}

export function conditionToCode(id: number): 'general' | 'personal' {
  return id === 1 ? 'personal' : 'general';
}

export function customerTypeFromCode(code: 'general' | 'other') {
  return CUSTOMER_TYPE[code];
}

export function customerTypeToCode(id: number): 'general' | 'other' {
  return id === 2 ? 'other' : 'general';
}
