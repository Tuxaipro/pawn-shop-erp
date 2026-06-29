/** Standard Indian currency denominations (notes and coins). */
export const INR_DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

export type DenominationInput = { denomination: number; quantity: number };

export function sumDenominations(items: DenominationInput[]): number {
  return items.reduce((sum, d) => sum + d.denomination * d.quantity, 0);
}
