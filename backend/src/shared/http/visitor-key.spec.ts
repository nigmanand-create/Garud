import { resolveVisitorKey, VISITOR_SESSION_COOKIE } from './visitor-key';

describe('resolveVisitorKey', () => {
  it('prefers the visitor session cookie', () => {
    const req = {
      cookies: { [VISITOR_SESSION_COOKIE]: 'session-abc-12345678' },
      headers: {},
      ip: '1.2.3.4',
    } as unknown as import('express').Request;
    expect(resolveVisitorKey(req)).toBe('session-abc-12345678');
  });

  it('hashes ip and user-agent when no cookie', () => {
    const req = {
      cookies: {},
      headers: { 'user-agent': 'TestBot/1.0' },
      ip: '10.0.0.1',
    } as unknown as import('express').Request;
    const a = resolveVisitorKey(req);
    const b = resolveVisitorKey(req);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
