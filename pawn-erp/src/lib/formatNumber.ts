const twoDecimal = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Weight in grams with exactly 2 decimal places. */
export function formatWeight(value: number): string {
  return twoDecimal.format(value);
}

export function formatWeightGrams(value: number): string {
  return `${formatWeight(value)} g`;
}

/** Rupee amount with exactly 2 decimal places. */
export function formatMoneyIN(value: number): string {
  return `₹${twoDecimal.format(value)}`;
}
