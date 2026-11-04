/** Skip listing-view analytics for empty or common crawler / monitor user agents. */
export function isLikelyBotUserAgent(userAgent: string | undefined): boolean {
  const ua = userAgent?.trim() ?? '';
  if (!ua) return true;

  const lower = ua.toLowerCase();
  const patterns = [
    'bot',
    'spider',
    'crawl',
    'slurp',
    'mediapartners-google',
    'facebookexternalhit',
    'whatsapp',
    'telegrambot',
    'linkedinbot',
    'twitterbot',
    'embedly',
    'quora link preview',
    'preview',
    'lighthouse',
    'pingdom',
    'uptime',
    'datadog',
    'semrush',
    'ahrefs',
    'mj12bot',
    'petalbot',
    'applebot',
    'bytespider',
    'yandex',
    'baiduspider',
    'duckduckbot',
    'headlesschrome',
    'phantomjs',
    'curl/',
    'wget/',
    'python-requests',
    'python-urllib',
    'httpx/',
    'aiohttp',
    'java/',
    'go-http-client',
    'scrapy',
    'libwww-perl',
    'postman',
    'insomnia',
  ];

  return patterns.some((p) => lower.includes(p));
}
