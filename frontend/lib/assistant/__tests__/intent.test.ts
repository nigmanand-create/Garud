import { describe, expect, it } from 'vitest';
import { intentNeedsClarification, normalizeMessage, parseIntent } from '../intent';

describe('parseIntent', () => {
  it('detects agriculture spraying and DGCA hints', () => {
    const intent = parseIntent(
      'I need a drone for pesticide spraying in Punjab, DGCA compliant.',
    );
    expect(intent.primaryCategory).toBe('AGRICULTURE_DRONE');
    expect(intent.requiresDgcaHint).toBe(true);
    expect(intent.listingType).toBe('PRODUCT');
  });

  it('parses survey PPK keywords', () => {
    const intent = parseIntent('PPK mapping drone for construction site survey.');
    expect(intent.primaryCategory).toBe('SURVEY_MAPPING_DRONE');
  });

  it('extracts budget under 3 lakh', () => {
    const intent = parseIntent('Cheapest option under 3 lakh for spraying.');
    expect(intent.primaryCategory).toBe('AGRICULTURE_DRONE');
    expect(intent.budgetMaxInr).toBe(300_000);
  });

  it('maps quick reply agriculture spraying', () => {
    const intent = parseIntent('Agriculture spraying');
    expect(intent.primaryCategory).toBe('AGRICULTURE_DRONE');
    expect(intent.fromQuickReply).toBe(true);
    expect(intentNeedsClarification(intent)).toBe(false);
  });

  it('normalizes lakh amounts in text', () => {
    expect(normalizeMessage('under 5 lakh')).toContain('500000');
  });
});
