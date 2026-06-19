export type BilingualName = { nameEn: string; nameTa?: string; name?: string };

export function localizedName(item: BilingualName, lang: string): string {
  if (lang.startsWith('ta') && item.nameTa?.trim()) return item.nameTa.trim();
  return item.nameEn || item.name || '';
}
