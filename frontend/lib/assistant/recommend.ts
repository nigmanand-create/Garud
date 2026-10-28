import type { CatalogCategory } from '@/lib/api/types';
import { CATEGORY_LABELS } from '@/lib/platform/labels';
import { detectOutOfScope, matchFaq } from './faq';
import { intentNeedsClarification, normalizeMessage, parseIntent } from './intent';
import { rankListings } from './scoring';
import type {
  AssistantAction,
  AssistantListing,
  ParsedIntent,
  RecommendResult,
  ScoredListing,
} from './types';
import { ASSISTANT_QUICK_REPLIES } from './types';

function marketplaceBrowseHref(category?: CatalogCategory | null): string {
  if (!category) return '/marketplace?section=drones';
  if (category === 'TRAINING') return '/marketplace?section=courses&category=TRAINING';
  if (category === 'ACCESSORY') return '/marketplace?section=accessories&category=ACCESSORY';
  if (category === 'COMPONENT' || category === 'PAYLOAD') {
    return '/marketplace?section=components';
  }
  if (
    ['REPAIR_MAINTENANCE', 'CONSULTANCY', 'OTHER'].includes(category)
  ) {
    return '/marketplace?section=services';
  }
  return `/marketplace?section=drones&category=${category}`;
}

function buildListingActions(scored: ScoredListing[]): AssistantAction[] {
  const actions: AssistantAction[] = [];
  for (const { listing } of scored.slice(0, 3)) {
    actions.push({
      label: `View ${listing.name}`,
      href: `/marketplace/listings/${listing.id}`,
    });
    actions.push({
      label: `Get quote — ${listing.name}`,
      href: `/buyer/rfqs/new?listing=${listing.id}`,
    });
  }
  return actions;
}

function introForRecommendations(intent: ParsedIntent, scored: ScoredListing[]): string {
  const parts: string[] = [];
  if (intent.primaryCategory) {
    parts.push(`Here are top matches for **${CATEGORY_LABELS[intent.primaryCategory]}**.`);
  } else {
    parts.push('Here are listings that best match your message.');
  }
  if (intent.requiresDgcaHint) {
    parts.push(
      'DGCA compliance is inferred from listing text only — confirm on the product page or RFQ.',
    );
  }
  if (scored.length === 1) {
    parts.push('One strong match from our published catalog.');
  }
  return parts.join(' ');
}

export function recommendFromMessage(input: {
  message: string;
  listings: AssistantListing[];
  lastQuickReply?: string;
}): RecommendResult {
  const normalized = normalizeMessage(input.message);

  const offScope = detectOutOfScope(normalized);
  if (offScope) {
    return {
      kind: 'out_of_scope',
      text: `I can help with **GarudHub marketplace** drones, training listings, RFQ/cart flows, and partner verification — not ${offScope}. Try a use-case below or browse the catalog.`,
      quickReplies: [...ASSISTANT_QUICK_REPLIES],
    };
  }

  const faq = matchFaq(normalized);
  if (faq) {
    return { kind: 'faq', text: faq.text, actions: faq.actions };
  }

  const intent = parseIntent(input.message, { lastQuickReply: input.lastQuickReply });

  if (intentNeedsClarification(intent)) {
    return {
      kind: 'clarify',
      question:
        'Which use case fits best? Pick one option so I can rank verified listings.',
      quickReplies: [...ASSISTANT_QUICK_REPLIES],
    };
  }

  const scored = rankListings(input.listings, intent, 5);
  if (scored.length === 0) {
    return {
      kind: 'fallback',
      text:
        'No published listings match yet. Browse all drones on the marketplace or submit a general RFQ — partners can quote even when catalog coverage is thin.',
      actions: [
        { label: 'Browse drones', href: marketplaceBrowseHref(intent.primaryCategory) },
        { label: 'General RFQ', href: '/buyer/rfqs/new' },
        { label: 'Contact Garud', href: '/enquiry.php?subject=Listing%20search' },
      ],
    };
  }

  const globalActions: AssistantAction[] = [
    {
      label: 'See all in marketplace',
      href: marketplaceBrowseHref(intent.primaryCategory),
    },
  ];

  return {
    kind: 'recommendations',
    intro: introForRecommendations(intent, scored),
    scored,
    actions: [...buildListingActions(scored), ...globalActions],
  };
}

export function trackAssistantRecommend(intentSummary: string): void {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV === 'development') {
    console.info('[assistant] recommend', intentSummary);
  }
}
