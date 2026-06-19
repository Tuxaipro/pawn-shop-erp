const ONES = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS[t]} ${ONES[o]}` : TENS[t];
}

function threeDigits(n: number): string {
  if (n === 0) return '';
  if (n < 100) return twoDigits(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return rest ? `${ONES[h]} hundred ${twoDigits(rest)}` : `${ONES[h]} hundred`;
}

function convertIndian(n: number): string {
  if (n === 0) return 'zero';
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} thousand`);
  if (rest) parts.push(threeDigits(rest));
  return parts.join(' ');
}

/** Indian English amount in words (e.g. "Ten thousand Rupees only"). */
export function amountInWords(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  if (rounded <= 0) return '';
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);
  const rupeesText = capitalize(convertIndian(rupees));
  if (paise > 0) {
    return `${rupeesText} Rupees and ${convertIndian(paise)} paise only`;
  }
  return `${rupeesText} Rupees only`;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Ensures stored/display amount words end with "Rupees only" (or paise variant). */
export function formatAmountInWords(words: string): string {
  const trimmed = words.trim();
  if (!trimmed) return '';
  if (/\bonly$/i.test(trimmed) && /rupees|paise/i.test(trimmed)) return trimmed;
  if (/paise/i.test(trimmed)) {
    return /\bonly$/i.test(trimmed) ? trimmed : `${trimmed} only`;
  }
  if (/\brupees only$/i.test(trimmed)) return trimmed;
  return `${trimmed} Rupees only`;
}
