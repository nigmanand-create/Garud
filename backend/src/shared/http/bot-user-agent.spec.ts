import { isLikelyBotUserAgent } from './bot-user-agent';

describe('isLikelyBotUserAgent', () => {
  it('treats empty user-agent as bot', () => {
    expect(isLikelyBotUserAgent(undefined)).toBe(true);
    expect(isLikelyBotUserAgent('')).toBe(true);
    expect(isLikelyBotUserAgent('   ')).toBe(true);
  });

  it('flags common crawlers and CLI clients', () => {
    expect(isLikelyBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isLikelyBotUserAgent('curl/8.4.0')).toBe(true);
    expect(isLikelyBotUserAgent('python-requests/2.31.0')).toBe(true);
  });

  it('allows typical browser user agents', () => {
    expect(
      isLikelyBotUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
  });
});
