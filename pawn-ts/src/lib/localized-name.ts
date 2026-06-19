export type BilingualName = { nameEn: string; nameTa?: string | null };

export function pickLocalizedName(row: BilingualName, lang = 'en'): string {
  if (lang.startsWith('ta') && row.nameTa?.trim()) return row.nameTa.trim();
  return row.nameEn;
}

export function serializeBilingualName(row: BilingualName) {
  return {
    nameEn: row.nameEn,
    nameTa: row.nameTa ?? '',
    name: row.nameEn,
  };
}
