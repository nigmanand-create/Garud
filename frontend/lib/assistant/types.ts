import type { CatalogCategory, ListingType } from '@/lib/api/types';
import type { ListingCardData } from '@/components/platform/ListingCard';

/** Public listing row plus fields used for scoring (returned by list API). */
export type AssistantListing = ListingCardData & {
  brand?: string | null;
  sku?: string | null;
  description?: string | null;
  technicalSpecs?: string | null;
  applications?: string[];
  minOrderQuantity?: number | null;
  updatedAt?: string;
};

export type ParsedIntent = {
  rawMessage: string;
  tokens: string[];
  primaryCategory: CatalogCategory | null;
  secondaryCategories: CatalogCategory[];
  categoryConfidence: 'high' | 'medium' | 'low';
  listingType: ListingType | null;
  budgetMaxInr: number | null;
  budgetMinInr: number | null;
  requiresDgcaHint: boolean;
  payloadKgMin: number | null;
  enduranceMinutesMin: number | null;
  applicationTags: string[];
  searchKeywords: string[];
  fromQuickReply: boolean;
};

export type ScoredListing = {
  listing: AssistantListing;
  score: number;
  rationaleLines: string[];
};

export type AssistantAction = { label: string; href: string };

export type ChatMessage =
  | { id: string; role: 'user' | 'assistant'; kind: 'text'; text: string }
  | {
      id: string;
      role: 'assistant';
      kind: 'listings';
      items: ScoredListing[];
      reason?: string;
    }
  | { id: string; role: 'assistant'; kind: 'actions'; actions: AssistantAction[] }
  | { id: string; role: 'assistant'; kind: 'quick_replies'; options: string[] };

export type RecommendResult =
  | {
      kind: 'recommendations';
      intro: string;
      scored: ScoredListing[];
      actions: AssistantAction[];
    }
  | {
      kind: 'clarify';
      question: string;
      quickReplies: string[];
    }
  | {
      kind: 'faq';
      text: string;
      actions?: AssistantAction[];
    }
  | {
      kind: 'out_of_scope';
      text: string;
      quickReplies: string[];
    }
  | {
      kind: 'fallback';
      text: string;
      actions: AssistantAction[];
    }
  | {
      kind: 'error';
      text: string;
      actions: AssistantAction[];
    };

export const ASSISTANT_QUICK_REPLIES = [
  'Agriculture spraying',
  'Survey & mapping',
  'Budget under ₹5L',
  'DGCA compliant',
  'Training / DGCA course',
] as const;
