import { describe, expect, it } from 'vitest';
import { parseIntent } from '../intent';
import { rankListings } from '../scoring';
import { DEMO_LISTINGS } from './fixtures';

describe('rankListings', () => {
  it('ranks agri X1 for spraying under 3 lakh', () => {
    const intent = parseIntent('Cheapest option under 3 lakh for spraying.');
    const ranked = rankListings(DEMO_LISTINGS, intent, 5);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].listing.id).toBe('agri-x1');
  });

  it('ranks survey listings for PPK mapping query', () => {
    const intent = parseIntent('PPK mapping drone for construction site survey.');
    const ranked = rankListings(DEMO_LISTINGS, intent, 3);
    expect(ranked[0].listing.category).toBe('SURVEY_MAPPING_DRONE');
    expect(ranked.some((r) => r.listing.id === 'survey-pro')).toBe(true);
  });

  it('prefers training listing for course quick reply', () => {
    const intent = parseIntent('Training / DGCA course');
    const ranked = rankListings(DEMO_LISTINGS, intent, 3);
    expect(ranked[0].listing.category).toBe('TRAINING');
  });
});
