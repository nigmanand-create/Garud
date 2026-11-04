import { throttleLimit, throttleTtl } from './throttle.config';

describe('throttle config', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('uses the original defaults', () => {
    expect(throttleLimit('global')).toBe(120);
    expect(throttleLimit('auth')).toBe(10);
    expect(throttleLimit('authRefresh')).toBe(30);
    expect(throttleLimit('enquiry')).toBe(5);
    expect(throttleTtl('enquiry')).toBe(60_000);
  });

  it('honours env overrides and ignores invalid values', () => {
    process.env.THROTTLE_ENQUIRY_LIMIT = '20';
    process.env.THROTTLE_AUTH_LIMIT = 'abc';
    process.env.THROTTLE_GLOBAL_TTL_MS = '30000';
    expect(throttleLimit('enquiry')).toBe(20);
    expect(throttleLimit('auth')).toBe(10);
    expect(throttleTtl('global')).toBe(30_000);
  });
});
