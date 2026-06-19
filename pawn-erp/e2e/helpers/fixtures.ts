export function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function uniqueInvoice() {
  return 900_000 + Math.floor(Date.now() % 99_999);
}

export function uniqueMobile() {
  return `9${String(Date.now()).slice(-9)}`;
}

export function yearsAgoISO(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export const TEST_SECURITY_PIN = 'e2e-pin';
