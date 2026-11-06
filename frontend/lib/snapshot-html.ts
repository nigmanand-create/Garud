import { injectSnapshotHeaderCtas } from '@/lib/snapshot-bridge';

const GARUDHUB_ORIGIN =
  /https?:\/\/(?:www\.)?garudhub\.com/gi;

/** Common UTF-8 mojibake on cloned pages (em dash, quotes, ellipsis). */
/** Point high-value marketing CTAs at the React platform (same origin). */
function bridgeMarketingToPlatform(html: string): string {
  let out = html;

  // Static clone marketplace pages → live B2B catalog UI
  out = out.replaceAll('href="/drone-marketplace"', 'href="/marketplace"');
  out = out.replaceAll('href="/drone-marketplace/"', 'href="/marketplace"');
  out = out.replaceAll(
    'href="/drone-accessories"',
    'href="/marketplace?section=accessories"',
  );
  out = out.replaceAll(
    'href="/drone-accessories/"',
    'href="/marketplace?section=accessories"',
  );

  // Partner onboarding (nav + cards); marketing copy pages remain reachable by direct URL
  out = out.replaceAll('href="/become-a-partner/"', 'href="/auth/register?type=partner"');
  out = out.replaceAll('href="../Become-a-Partner/"', 'href="/b2b-partners"');
  out = out.replaceAll('href="Become-a-Partner/"', 'href="/b2b-partners"');
  out = out.replaceAll('href="/Become-a-Partner/"', 'href="/b2b-partners"');

  // Native enquiry + flagship React marketing hubs (home snapshot CTAs)
  // Legacy PHP enquiry links (relative, absolute, ../, with optional query) → native /enquiry
  out = out.replace(
    /href=(["'])(?:\.\.?\/)*\/?enquiry\.php(\?[^"']*)?\1/gi,
    (_m, q: string, query?: string) => `href=${q}/enquiry${query ?? ''}${q}`,
  );
  out = out.replaceAll('href="#services"', 'href="/services"');
  out = out.replaceAll('href="/drone-training"', 'href="/services#training"');
  out = out.replaceAll('href="/drone-training/"', 'href="/services#training"');
  out = out.replaceAll('href="/dgca-compliance"', 'href="/services#compliance"');
  out = out.replaceAll('href="/dgca-compliance/"', 'href="/services#compliance"');
  out = out.replaceAll(
    'href="/repairs-maintenance"',
    'href="/services#repair"',
  );
  out = out.replaceAll(
    'href="/repairs-maintenance/"',
    'href="/services#repair"',
  );
  out = out.replaceAll(
    'href="/edp-professional-services"',
    'href="/services#professional"',
  );
  out = out.replaceAll(
    'href="/edp-professional-services/"',
    'href="/services#professional"',
  );
  out = out.replaceAll(
    'href="/finance-insurance"',
    'href="/services#finance"',
  );
  out = out.replaceAll(
    'href="/finance-insurance/"',
    'href="/services#finance"',
  );
  out = out.replaceAll(
    'href="/government-projects-schemes"',
    'href="/services#government"',
  );
  out = out.replaceAll(
    'href="/government-projects-schemes/"',
    'href="/services#government"',
  );
  out = out.replaceAll('href="/scrap-recycling"', 'href="/services#recycling"');
  out = out.replaceAll('href="/scrap-recycling/"', 'href="/services#recycling"');
  out = out.replaceAll('href="/partner-with-us"', 'href="/b2b-partners"');
  out = out.replaceAll('href="/partner-with-us/"', 'href="/b2b-partners"');
  out = out.replaceAll('href="/loan-calculators.php"', 'href="/services#finance"');
  out = out.replaceAll(
    'href="/loan-calculators.php/"',
    'href="/services#finance"',
  );
  out = out.replaceAll('href="/legal.php?page=privacy"', 'href="/legal/privacy"');
  out = out.replaceAll('href="/legal.php?page=tos"', 'href="/legal/terms"');
  out = out.replaceAll('href="/legal.php?page=refund"', 'href="/legal/refund"');

  out = out.replace(
    /href=(["'])\/blogging\?slug=([^"'&]+)\1/gi,
    (_m, q: string, slug: string) => `href=${q}/blogging/post/${slug}${q}`,
  );
  out = out.replace(
    /href=(["'])\/blogging\?category=([^"'&]+)\1/gi,
    (_m, q: string, category: string) => `href=${q}/blogging/category/${category}${q}`,
  );

  return out;
}

function fixUtf8Mojibake(html: string): string {
  return html
    .replaceAll('â€"', '—')
    .replaceAll('â€™', "'")
    .replaceAll('â€˜', "'")
    .replaceAll('â€œ', '"')
    .replaceAll('â€\u009d', '"')
    .replaceAll('â€¦', '…');
}

export function localizeSnapshotHtml(html: string): string {
  let out = html
    .replaceAll('https://garudhub.com/assets/', '/assets/')
    .replaceAll('http://garudhub.com/assets/', '/assets/')
    .replaceAll('https://www.garudhub.com/assets/', '/assets/')
    .replaceAll('https://garudhub.com/api/v1/', '/platform-api/v1/')
    .replaceAll('http://garudhub.com/api/v1/', '/platform-api/v1/')
    .replaceAll('https://www.garudhub.com/api/v1/', '/platform-api/v1/')
    .replaceAll('https://garudhub.com/api/', '/platform-api/v1/')
    .replaceAll('http://garudhub.com/api/', '/platform-api/v1/')
    .replaceAll('https://www.garudhub.com/api/', '/platform-api/v1/')
    .replaceAll('https://garudhub.com/', '/')
    .replaceAll('http://garudhub.com/', '/')
    .replaceAll('https://www.garudhub.com/', '/');

  // Catch any remaining absolute garudhub URLs (query strings, edge cases)
  out = out.replace(GARUDHUB_ORIGIN, '');

  // Live /about.php is 404; footer still links to it
  out = out.replaceAll('href="/about.php"', 'href="/about-us"');

  out = bridgeMarketingToPlatform(out);
  out = injectSnapshotHeaderCtas(out);

  out = fixUtf8Mojibake(out);

  return out;
}
