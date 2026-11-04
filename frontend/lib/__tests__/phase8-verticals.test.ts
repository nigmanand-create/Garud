import { describe, expect, it } from 'vitest';
import {
  buildRequestDetails,
  canRequesterCancel,
  categoryForServiceKey,
  closingLabel,
  daysUntil,
  formatDetailKey,
  formatInrCompact,
  missingRequiredFields,
  resolveVerticalConfig,
  SERVICE_REQUEST_CATEGORIES,
  SERVICE_VERTICAL_CONFIGS,
  seatsLeft,
  statusStepIndex,
  tenderEnquiryDefaults,
} from '../platform/verticals';

describe('service request categories', () => {
  it('has an intake config for every category', () => {
    expect(SERVICE_VERTICAL_CONFIGS.map((c) => c.category).sort()).toEqual(
      [...SERVICE_REQUEST_CATEGORIES].sort(),
    );
  });

  it('maps Phase 1 service keys to categories', () => {
    expect(categoryForServiceKey('repair')).toBe('REPAIR_AMC');
    expect(categoryForServiceKey(' Finance ')).toBe('FINANCE_INSURANCE');
    expect(categoryForServiceKey('recycling')).toBe('SCRAP_RECYCLING');
    expect(categoryForServiceKey('training')).toBeNull();
    expect(categoryForServiceKey(null)).toBeNull();
  });

  it('resolves config from enum value, service key, or falls back to repair', () => {
    expect(resolveVerticalConfig('FINANCE_INSURANCE').category).toBe('FINANCE_INSURANCE');
    expect(resolveVerticalConfig('compliance').category).toBe('COMPLIANCE');
    expect(resolveVerticalConfig('nonsense').category).toBe('REPAIR_AMC');
    expect(resolveVerticalConfig(null).category).toBe('REPAIR_AMC');
  });

  it('uses field names the backend accepts as detail keys', () => {
    const keyRe = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
    for (const c of SERVICE_VERTICAL_CONFIGS) {
      for (const f of c.fields) expect(f.name).toMatch(keyRe);
    }
  });
});

describe('intake details', () => {
  const repair = resolveVerticalConfig('REPAIR_AMC');

  it('reports missing required fields by label', () => {
    expect(missingRequiredFields(repair, {})).toEqual(['Drone make / model', 'Issue']);
    expect(
      missingRequiredFields(repair, { droneModel: 'T30', issueType: 'Battery' }),
    ).toEqual([]);
  });

  it('builds flat details: coerces numbers, drops empties and unknown keys', () => {
    expect(
      buildRequestDetails(repair, {
        droneModel: ' DJI T30 ',
        fleetSize: '3',
        issueType: '',
        bogus: 'x',
      }),
    ).toEqual({ droneModel: 'DJI T30', fleetSize: 3 });
    expect(buildRequestDetails(repair, { fleetSize: 'abc' })).toEqual({});
  });

  it('humanises detail keys', () => {
    expect(formatDetailKey('loanAmountInr')).toBe('Loan amount inr');
  });
});

describe('request status tracking', () => {
  it('orders Submit → Match → Connect → Complete', () => {
    expect(statusStepIndex('SUBMITTED')).toBe(0);
    expect(statusStepIndex('MATCHED')).toBe(1);
    expect(statusStepIndex('IN_PROGRESS')).toBe(2);
    expect(statusStepIndex('COMPLETED')).toBe(3);
    expect(statusStepIndex('CANCELLED')).toBe(-1);
  });

  it('only allows cancelling open requests', () => {
    expect(canRequesterCancel('SUBMITTED')).toBe(true);
    expect(canRequesterCancel('IN_PROGRESS')).toBe(true);
    expect(canRequesterCancel('COMPLETED')).toBe(false);
    expect(canRequesterCancel('CANCELLED')).toBe(false);
  });
});

describe('training helpers', () => {
  it('never reports negative seats', () => {
    expect(seatsLeft({ seats: 20, seatsFilled: 5 })).toBe(15);
    expect(seatsLeft({ seats: 10, seatsFilled: 12 })).toBe(0);
  });
});

describe('government helpers', () => {
  const now = new Date('2026-11-05T00:00:00Z');

  it('labels closing dates', () => {
    expect(closingLabel(null, now)).toBe('Open-ended');
    expect(closingLabel('2026-11-01T00:00:00Z', now)).toBe('Closed');
    expect(closingLabel('2026-11-05T00:00:00Z', now)).toBe('Closes today');
    expect(closingLabel('2026-11-06T00:00:00Z', now)).toBe('Closes tomorrow');
    expect(closingLabel('2026-11-15T00:00:00Z', now)).toBe('Closes in 10 days');
    expect(daysUntil('not-a-date', now)).toBeNull();
  });

  it('formats rupee values in Indian units', () => {
    expect(formatInrCompact(null)).toBe('Not disclosed');
    expect(formatInrCompact('45000000')).toBe('₹4.5 Cr');
    expect(formatInrCompact(1_250_000)).toBe('₹12.5 L');
    expect(formatInrCompact(85000)).toBe('₹85,000');
  });

  it('prefills tender interest enquiries', () => {
    const d = tenderEnquiryDefaults({
      title: 'Agri drone procurement',
      issuingBody: 'Dept of Agriculture',
      referenceNo: 'AGR/2026/11',
    });
    expect(d.subject).toBe('Interest in: Agri drone procurement');
    expect(d.message).toContain('Dept of Agriculture');
    expect(d.message).toContain('AGR/2026/11');
  });
});
