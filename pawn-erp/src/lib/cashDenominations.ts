/** Standard Indian currency denominations (notes and coins). */
export const INR_DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

export function sumDenominations(counts: Record<number, number>): number {
  return INR_DENOMINATIONS.reduce((sum, d) => sum + d * (counts[d] ?? 0), 0);
}

export function emptyDenominationCounts(): Record<number, string> {
  return Object.fromEntries(INR_DENOMINATIONS.map((d) => [d, '']));
}

export function denominationsFromCounts(counts: Record<number, string>) {
  return INR_DENOMINATIONS.map((denomination) => ({
    denomination,
    quantity: Number(counts[denomination]) || 0,
  })).filter((d) => d.quantity > 0);
}

export function countsFromDenominations(
  items: Array<{ denomination: number; quantity: number }>
): Record<number, string> {
  const base = emptyDenominationCounts();
  for (const item of items) {
    base[item.denomination] = String(item.quantity);
  }
  return base;
}
