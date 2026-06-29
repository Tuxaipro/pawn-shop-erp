import type { LoanDetail } from '../api/loans';

type LoanItem = LoanDetail['items'][number];

/**
 * Tamil names for the fixed purity vocabulary. The purity master stores English
 * text in its Tamil column for some rows, so we map the known set here to
 * guarantee a Tamil label regardless of the seeded data.
 */
const PURITY_TA: Record<string, string> = {
  Ordinary: 'சாதாரண',
  Hallmark: 'ஹால்மார்க்',
  'KDM 916': 'KDM 916',
  'N/A': 'பொருந்தாது',
};

function localizedPurity(item: LoanItem, ta: boolean): string {
  if (!ta) return item.purityNameEn;
  return (
    PURITY_TA[item.purityNameEn] ??
    (item.purityNameTa && item.purityNameTa !== item.purityNameEn
      ? item.purityNameTa
      : item.purityNameEn)
  );
}

/**
 * Pick the sub-category, item, and purity names for a loan collateral item in
 * the active language. Tamil sub-category / item names fall back to English
 * when not entered.
 */
export function localizedItemNames(item: LoanItem, language: string | undefined) {
  const ta = Boolean(language?.startsWith('ta'));
  return {
    subCategory: ta && item.subCategoryNameTa ? item.subCategoryNameTa : item.subCategoryName,
    item: ta && item.itemNameTa ? item.itemNameTa : item.itemName,
    purity: localizedPurity(item, ta),
  };
}

/** Tamil names for the fixed commodity types (the API label is English-only). */
const COMMODITY_TA: Record<string, string> = {
  gold: 'தங்கம்',
  silver: 'வெள்ளி',
};

/**
 * Localized commodity-type label. `code` is the loan's commodityTypeCode
 * ('gold' | 'silver'); falls back to the English label from the API.
 */
export function localizedCommodity(
  code: string | undefined,
  fallbackLabel: string,
  language: string | undefined
): string {
  const ta = Boolean(language?.startsWith('ta'));
  if (ta && code && COMMODITY_TA[code]) return COMMODITY_TA[code];
  return fallbackLabel;
}
