import { describe, expect, it } from 'vitest';
import {
  PARTNERSHIP_STATUS_LABELS,
  PARTNERSHIP_TYPE_LABELS,
  SERVICE_VERTICALS,
} from '../platform/labels';

describe('partner dashboard labels', () => {
  it('covers every partnership type and status', () => {
    expect(Object.keys(PARTNERSHIP_TYPE_LABELS)).toHaveLength(7);
    expect(Object.keys(PARTNERSHIP_STATUS_LABELS)).toEqual([
      'SUBMITTED',
      'UNDER_REVIEW',
      'APPROVED',
      'DECLINED',
      'WITHDRAWN',
    ]);
  });

  it('maps each service vertical to at least one catalog category', () => {
    for (const v of SERVICE_VERTICALS) {
      expect(v.categories.length).toBeGreaterThan(0);
    }
    expect(SERVICE_VERTICALS.map((v) => v.key)).toContain('repair');
  });
});
