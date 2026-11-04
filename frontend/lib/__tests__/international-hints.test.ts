import { describe, expect, it } from 'vitest';
import {
  getInternationalPartnerHints,
  isInternationalPartner,
} from '../platform/international-hints';

describe('international partner hints (P-UX-05)', () => {
  it('flags international company accounts regardless of country', () => {
    expect(isInternationalPartner({ accountType: 'INTERNATIONAL_COMPANY', country: 'India' })).toBe(true);
  });

  it('flags partners outside India', () => {
    expect(isInternationalPartner({ accountType: 'OEM', country: 'Germany' })).toBe(true);
  });

  it('does not flag Indian or empty-country partners', () => {
    expect(isInternationalPartner({ accountType: 'MANUFACTURER', country: ' india ' })).toBe(false);
    expect(isInternationalPartner({ country: '' })).toBe(false);
    expect(getInternationalPartnerHints({ accountType: 'DEALER', country: 'India' })).toBeNull();
  });

  it('returns hints with an India-entry enquiry link', () => {
    const hints = getInternationalPartnerHints({ country: 'Japan' });
    expect(hints?.items.length).toBeGreaterThan(2);
    expect(hints?.items.some((i) => i.href?.startsWith('/enquiry'))).toBe(true);
  });
});
