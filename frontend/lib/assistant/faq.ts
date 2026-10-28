import type { AssistantAction } from './types';

export type FaqHit = { text: string; actions?: AssistantAction[] };

const OUT_OF_SCOPE_PATTERNS: { pattern: RegExp; topic: string }[] = [
  { pattern: /\b(lawyer|legal advice|sue|lawsuit|court)\b/, topic: 'legal advice' },
  { pattern: /\b(medical|doctor|prescription|health)\b/, topic: 'medical topics' },
  { pattern: /\b(weather|forecast|rain today|temperature)\b/, topic: 'weather' },
  { pattern: /\b(dji\.com|amazon|flipkart|alibaba|aliexpress)\b/, topic: 'off-platform shopping' },
  { pattern: /\b(bitcoin|crypto|stock|forex)\b/, topic: 'unrelated finance' },
  { pattern: /\b(recipe|cooking|movie|football|cricket score)\b/, topic: 'non-drone topics' },
];

export function detectOutOfScope(normalizedMessage: string): string | null {
  for (const { pattern, topic } of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(normalizedMessage)) return topic;
  }
  return null;
}

export function matchFaq(normalizedMessage: string): FaqHit | null {
  if (/\bwhat is rfq\b|\brfq mean\b|\brequest for quote\b/.test(normalizedMessage)) {
    return {
      text:
        'An **RFQ (Request for Quote)** on GarudHub lets verified buyers describe quantity, specs, and budget. Partners respond with formal quotes — ideal for fleet deals, price-on-request listings, and DGCA paperwork.',
      actions: [
        { label: 'Create an RFQ', href: '/buyer/rfqs/new' },
        { label: 'Browse marketplace', href: '/marketplace' },
      ],
    };
  }

  if (/\bdgca\b|type cert|drone rules/.test(normalizedMessage) && !/drone for|need a|looking for|spray|survey/.test(normalizedMessage)) {
    return {
      text:
        '**DGCA type certification** and operating rules depend on your drone class and operation. Garud listings and RFQs capture compliance needs — this assistant cannot provide legal or regulatory sign-off. Check listing descriptions and use RFQ for formal requirements.',
      actions: [
        { label: 'DGCA compliance services', href: '/marketplace?section=services' },
        { label: 'Submit RFQ with DGCA flag', href: '/buyer/rfqs/new' },
      ],
    };
  }

  if (/verified partner|trust|kyc|moderation/.test(normalizedMessage)) {
    return {
      text:
        'GarudHub **verified partners** complete KYC and listing moderation before products appear on the public marketplace. Look for approved organization badges on listing and partner pages.',
      actions: [{ label: 'Browse verified listings', href: '/marketplace' }],
    };
  }

  if (/cart vs rfq|rfq vs cart|add to cart|price on request/.test(normalizedMessage)) {
    return {
      text:
        '**Fixed-price listings** can go to cart (login required). **Price on request** or fleet MOQ listings should use **RFQ** so partners quote for your volume, location, and compliance needs.',
      actions: [
        { label: 'Marketplace', href: '/marketplace' },
        { label: 'New RFQ', href: '/buyer/rfqs/new' },
      ],
    };
  }

  if (/human|talk to someone|contact|call me|phone/.test(normalizedMessage)) {
    return {
      text: 'For sales or partnership questions, reach the Garud team via enquiry — the assistant only helps you discover marketplace listings.',
      actions: [
        {
          label: 'Contact Garud',
          href: '/enquiry.php?subject=Drone%20assistant%20handoff',
        },
      ],
    };
  }

  return null;
}
