const IN_MOBILE_RE = /^[6-9]\d{9}$/;

/** Normalize Indian mobile input to E.164 (+91…). Returns null if invalid. */
export function normalizeIndiaPhoneToE164(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) return null;

  let digits = trimmed.replace(/^\+/, '');
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (!IN_MOBILE_RE.test(digits)) {
    return null;
  }
  return `+91${digits}`;
}
