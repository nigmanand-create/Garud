export type InternationalHintContext = {
  accountType?: string | null;
  country?: string | null;
};

export type InternationalHints = {
  title: string;
  items: { text: string; href?: string; linkLabel?: string }[];
};

function isIndia(country: string | null | undefined): boolean {
  const c = (country ?? '').trim().toLowerCase();
  return c === 'india' || c === 'in' || c === 'bharat';
}

/** True for international-company accounts or any partner registering outside India. */
export function isInternationalPartner({
  accountType,
  country,
}: InternationalHintContext): boolean {
  if (accountType === 'INTERNATIONAL_COMPANY') return true;
  const c = (country ?? '').trim();
  return c.length > 0 && !isIndia(c);
}

/** Onboarding hints for international partners (P-UX-05); null when not applicable. */
export function getInternationalPartnerHints(
  ctx: InternationalHintContext,
): InternationalHints | null {
  if (!isInternationalPartner(ctx)) return null;
  return {
    title: 'Entering the Indian market from abroad?',
    items: [
      {
        text: 'Use your home-country company registration; Indian GST/CIN are optional unless you already have an Indian entity.',
      },
      {
        text: 'Upload a company registration certificate and an authorization letter naming your Indian distributor, if any.',
      },
      {
        text: 'Add an international mobile number with country code (e.g. +49…) so buyers and Garud can reach you.',
      },
      {
        text: 'Need help with DGCA, import or local entity setup?',
        href: '/enquiry?intent=PARTNER&subject=India%20market%20entry%20support',
        linkLabel: 'Talk to our India-entry team',
      },
    ],
  };
}
