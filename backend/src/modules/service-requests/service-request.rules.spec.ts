import { EnquiryIntent, ServiceRequestCategory } from '@prisma/client';
import {
  canTransition,
  categoryForServiceKey,
  formatDetailsForMessage,
  intentForServiceKey,
  isTerminal,
  MAX_MATCHES,
  MatchCandidate,
  rankCandidates,
  sanitizeDetails,
} from './service-request.rules';

const c = (id: string, over: Partial<MatchCandidate> = {}): MatchCandidate => ({
  id,
  state: null,
  serviceStates: [],
  declaredCategory: true,
  ...over,
});

describe('service request rules', () => {
  describe('rankCandidates', () => {
    it('prefers providers covering the request state', () => {
      const res = rankCandidates(
        [
          c('a', { serviceStates: ['Karnataka'] }),
          c('b', { state: 'karnataka' }),
          c('c', { serviceStates: ['Delhi'] }),
          c('d'),
        ],
        ' Karnataka ',
      );
      expect(res.scope).toBe('STATE');
      expect(res.picked.map((p) => p.id).sort()).toEqual(['a', 'b']);
    });

    it('uses declared coverage over home state', () => {
      const res = rankCandidates(
        [c('a', { state: 'Karnataka', serviceStates: ['Kerala'] })],
        'Karnataka',
      );
      expect(res.scope).toBe('NONE');
    });

    it('falls back to unrestricted providers when nobody covers the state', () => {
      const res = rankCandidates(
        [c('a', { serviceStates: ['Delhi'] }), c('b', { state: 'Goa' })],
        'Assam',
      );
      expect(res.scope).toBe('NATIONAL');
      expect(res.picked.map((p) => p.id)).toEqual(['b']);
    });

    it('uses unrestricted providers when the request has no state', () => {
      const res = rankCandidates([c('a'), c('b', { serviceStates: ['Goa'] })]);
      expect(res).toMatchObject({ scope: 'NATIONAL' });
      expect(res.picked.map((p) => p.id)).toEqual(['a']);
    });

    it('ranks declared categories first and caps the result', () => {
      const many = Array.from({ length: 8 }, (_, i) =>
        c(`p${i}`, { declaredCategory: i >= 6 }),
      );
      const res = rankCandidates(many, null);
      expect(res.picked).toHaveLength(MAX_MATCHES);
      expect(res.picked[0].declaredCategory).toBe(true);
      expect(res.picked[1].declaredCategory).toBe(true);
    });

    it('returns NONE for no candidates', () => {
      expect(rankCandidates([], 'Goa')).toEqual({ scope: 'NONE', picked: [] });
    });
  });

  describe('status workflow', () => {
    it('allows Submit → Matched → In progress → Completed', () => {
      expect(canTransition('SUBMITTED', 'MATCHED')).toBe(true);
      expect(canTransition('MATCHED', 'IN_PROGRESS')).toBe(true);
      expect(canTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
    });

    it('blocks skipping steps and leaving terminal states', () => {
      expect(canTransition('SUBMITTED', 'IN_PROGRESS')).toBe(false);
      expect(canTransition('MATCHED', 'COMPLETED')).toBe(false);
      expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
      expect(isTerminal('COMPLETED')).toBe(true);
      expect(isTerminal('CANCELLED')).toBe(true);
      expect(isTerminal('IN_PROGRESS')).toBe(false);
    });

    it('lets a matched request fall back to submitted (all declined)', () => {
      expect(canTransition('MATCHED', 'SUBMITTED')).toBe(true);
    });
  });

  describe('service keys', () => {
    it('maps Phase 1 service keys to categories', () => {
      expect(categoryForServiceKey('Repair')).toBe(
        ServiceRequestCategory.REPAIR_AMC,
      );
      expect(categoryForServiceKey('recycling')).toBe(
        ServiceRequestCategory.SCRAP_RECYCLING,
      );
      expect(categoryForServiceKey('training')).toBeNull();
      expect(categoryForServiceKey(undefined)).toBeNull();
    });

    it('maps service keys to vertical lead types', () => {
      expect(intentForServiceKey('repair')).toBe(EnquiryIntent.REPAIR);
      expect(intentForServiceKey('finance')).toBe(EnquiryIntent.FINANCE);
      expect(intentForServiceKey('recycling')).toBe(EnquiryIntent.SCRAP);
      expect(intentForServiceKey('training')).toBe(EnquiryIntent.TRAINING);
      expect(intentForServiceKey('tender')).toBe(EnquiryIntent.TENDER);
      expect(intentForServiceKey('compliance')).toBe(EnquiryIntent.SERVICE);
      expect(intentForServiceKey(null)).toBeNull();
    });
  });

  describe('details', () => {
    it('keeps flat primitives only and trims long values', () => {
      const out = sanitizeDetails({
        droneModel: '  DJI Agras T40 ',
        qty: 3,
        urgent: true,
        nested: { a: 1 },
        'bad key': 'x',
        empty: '   ',
        long: 'x'.repeat(900),
      });
      expect(out).toMatchObject({
        droneModel: 'DJI Agras T40',
        qty: 3,
        urgent: true,
      });
      expect(out).not.toHaveProperty('nested');
      expect(out).not.toHaveProperty('bad key');
      expect(out).not.toHaveProperty('empty');
      expect((out as Record<string, string>).long).toHaveLength(500);
    });

    it('returns null for junk and formats lines for the enquiry message', () => {
      expect(sanitizeDetails('x')).toBeNull();
      expect(sanitizeDetails([1])).toBeNull();
      expect(sanitizeDetails({})).toBeNull();
      expect(formatDetailsForMessage(null)).toBe('');
      expect(formatDetailsForMessage({ droneModel: 'T40', qty: 2 })).toBe(
        'drone model: T40\nqty: 2',
      );
    });
  });
});
