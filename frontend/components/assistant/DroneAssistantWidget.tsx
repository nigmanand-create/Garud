'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useReducer, useRef, useState } from 'react';
import { ListingCard } from '@/components/platform/ListingCard';
import { isAssistantEnabled } from '@/lib/assistant/config';
import { fetchAssistantListings } from '@/lib/assistant/listing-cache';
import { recommendFromMessage, trackAssistantRecommend } from '@/lib/assistant/recommend';
import type { ChatMessage, ScoredListing } from '@/lib/assistant/types';
import { ASSISTANT_QUICK_REPLIES } from '@/lib/assistant/types';

type State = { messages: ChatMessage[]; lastQuickReply?: string };

type Action =
  | { type: 'append'; messages: ChatMessage[] }
  | { type: 'set_last_quick_reply'; value: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'append':
      return { ...state, messages: [...state.messages, ...action.messages] };
    case 'set_last_quick_reply':
      return { ...state, lastQuickReply: action.value };
    default:
      return state;
  }
}

let msgCounter = 0;
function nextId(): string {
  msgCounter += 1;
  return `assistant-msg-${msgCounter}`;
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function AssistantListingResults({
  items,
  reason,
  showAll,
  onShowMore,
}: {
  items: ScoredListing[];
  reason?: string;
  showAll: boolean;
  onShowMore: () => void;
}) {
  const visible = showAll ? items : items.slice(0, 3);
  return (
    <div className="platform-assistant-listings">
      {reason && <p className="platform-assistant-listings-reason">{reason}</p>}
      {visible.map(({ listing, rationaleLines }) => (
        <div key={listing.id} className="platform-assistant-listing-block">
          <ListingCard item={listing} />
          {rationaleLines.length > 0 && (
            <ul className="platform-assistant-rationale">
              {rationaleLines.map((line) => (
                <li key={line}>
                  <RichText text={line} />
                </li>
              ))}
            </ul>
          )}
          <div className="platform-assistant-listing-links">
            <Link href={`/marketplace/listings/${listing.id}`}>View details</Link>
            <Link href={`/buyer/rfqs/new?listing=${listing.id}`}>Get quote</Link>
          </div>
        </div>
      ))}
      {!showAll && items.length > 3 && (
        <button type="button" className="platform-assistant-show-more" onClick={onShowMore}>
          Show {items.length - 3} more
        </button>
      )}
    </div>
  );
}

const WELCOME_TEXT =
  'Hi — I\'m Garud\'s listing assistant. Tell me your use case (spraying, survey, budget, DGCA) and I\'ll suggest verified marketplace listings. I don\'t replace legal advice or live partner chat — use RFQ or enquiry to reach suppliers.';

function initialMessages(): ChatMessage[] {
  return [
    { id: nextId(), role: 'assistant', kind: 'text', text: WELCOME_TEXT },
    {
      id: nextId(),
      role: 'assistant',
      kind: 'quick_replies',
      options: [...ASSISTANT_QUICK_REPLIES],
    },
  ];
}

export function DroneAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [expandedListingTurns, setExpandedListingTurns] = useState<Set<string>>(
    () => new Set(),
  );
  const [{ messages, lastQuickReply }, dispatch] = useReducer(reducer, undefined, () => ({
    messages: initialMessages(),
    lastQuickReply: undefined,
  }));

  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      void fetchAssistantListings().catch(() => setCatalogError(true));
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const pushAssistantResult = useCallback(
    async (userText: string, quickReply?: string) => {
      setBusy(true);
      try {
        let listings;
        try {
          listings = await fetchAssistantListings();
          setCatalogError(false);
        } catch {
          setCatalogError(true);
          dispatch({
            type: 'append',
            messages: [
              {
                id: nextId(),
                role: 'assistant',
                kind: 'text',
                text: 'Catalog temporarily unavailable. Try marketplace browse.',
              },
              {
                id: nextId(),
                role: 'assistant',
                kind: 'actions',
                actions: [
                  { label: 'Browse marketplace', href: '/marketplace' },
                  { label: 'General RFQ', href: '/buyer/rfqs/new' },
                ],
              },
            ],
          });
          return;
        }

        const result = recommendFromMessage({
          message: userText,
          listings,
          lastQuickReply: quickReply ?? lastQuickReply,
        });

        const batch: ChatMessage[] = [];

        if (result.kind === 'recommendations') {
          trackAssistantRecommend(userText.slice(0, 80));
          batch.push({
            id: nextId(),
            role: 'assistant',
            kind: 'text',
            text: result.intro,
          });
          batch.push({
            id: nextId(),
            role: 'assistant',
            kind: 'listings',
            items: result.scored,
          });
          batch.push({
            id: nextId(),
            role: 'assistant',
            kind: 'actions',
            actions: result.actions,
          });
        } else if (result.kind === 'clarify') {
          batch.push({
            id: nextId(),
            role: 'assistant',
            kind: 'text',
            text: result.question,
          });
          batch.push({
            id: nextId(),
            role: 'assistant',
            kind: 'quick_replies',
            options: result.quickReplies,
          });
        } else if (result.kind === 'faq' || result.kind === 'fallback' || result.kind === 'error') {
          batch.push({
            id: nextId(),
            role: 'assistant',
            kind: 'text',
            text: result.text,
          });
          if (result.actions?.length) {
            batch.push({
              id: nextId(),
              role: 'assistant',
              kind: 'actions',
              actions: result.actions,
            });
          }
        } else if (result.kind === 'out_of_scope') {
          batch.push({
            id: nextId(),
            role: 'assistant',
            kind: 'text',
            text: result.text,
          });
          batch.push({
            id: nextId(),
            role: 'assistant',
            kind: 'quick_replies',
            options: result.quickReplies,
          });
        }

        dispatch({ type: 'append', messages: batch });
      } finally {
        setBusy(false);
      }
    },
    [lastQuickReply],
  );

  const sendUserMessage = useCallback(
    (text: string, fromQuickReply = false) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      if (fromQuickReply) {
        dispatch({ type: 'set_last_quick_reply', value: trimmed });
      }

      dispatch({
        type: 'append',
        messages: [{ id: nextId(), role: 'user', kind: 'text', text: trimmed }],
      });
      setInput('');
      void pushAssistantResult(trimmed, fromQuickReply ? trimmed : undefined);
    },
    [busy, pushAssistantResult],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) return;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
    }, 800);
    sendUserMessage(input, false);
  };

  if (!isAssistantEnabled()) return null;

  return (
    <div className="platform-assistant-root" data-open={open ? 'true' : 'false'}>
      {open && (
        <button
          type="button"
          className="platform-assistant-backdrop"
          aria-label="Close assistant"
          onClick={() => setOpen(false)}
        />
      )}
      <section
        id={panelId}
        className="platform-assistant-panel"
        role="dialog"
        aria-label="Ask Garud assistant"
        aria-hidden={!open}
        hidden={!open}
      >
        <header className="platform-assistant-header">
          <div>
            <h2 className="platform-assistant-title">Ask Garud</h2>
            <p className="platform-assistant-subtitle">Marketplace discovery · RFQ help</p>
          </div>
          <button
            type="button"
            className="platform-assistant-close"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </header>
        {catalogError && (
          <p className="platform-assistant-banner" role="status">
            Catalog may be stale — browse the marketplace if results look empty.
          </p>
        )}
        <div className="platform-assistant-messages" ref={listRef}>
          {messages.map((msg) => {
            if (msg.kind === 'text') {
              return (
                <div
                  key={msg.id}
                  className={`platform-assistant-bubble platform-assistant-bubble--${msg.role}`}
                >
                  <RichText text={msg.text} />
                </div>
              );
            }
            if (msg.kind === 'quick_replies') {
              return (
                <div key={msg.id} className="platform-assistant-quick-replies">
                  {msg.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="platform-assistant-chip"
                      disabled={busy}
                      onClick={() => sendUserMessage(opt, true)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              );
            }
            if (msg.kind === 'listings') {
              return (
                <AssistantListingResults
                  key={msg.id}
                  items={msg.items}
                  reason={msg.reason}
                  showAll={expandedListingTurns.has(msg.id)}
                  onShowMore={() =>
                    setExpandedListingTurns((prev) => new Set(prev).add(msg.id))
                  }
                />
              );
            }
            if (msg.kind === 'actions') {
              return (
                <div key={msg.id} className="platform-assistant-actions">
                  {msg.actions.map((action) => (
                    <Link key={action.href + action.label} href={action.href}>
                      {action.label}
                    </Link>
                  ))}
                </div>
              );
            }
            return null;
          })}
          {busy && (
            <div className="platform-assistant-bubble platform-assistant-bubble--assistant">
              Finding listings…
            </div>
          )}
        </div>
        <form className="platform-assistant-compose" onSubmit={onSubmit}>
          <label htmlFor={`${panelId}-input`} className="visually-hidden">
            Message
          </label>
          <input
            id={`${panelId}-input`}
            ref={inputRef}
            type="text"
            autoComplete="off"
            placeholder="e.g. spray drone under 3 lakh DGCA"
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="platform-assistant-send" disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
      </section>
      <button
        type="button"
        className="platform-assistant-launcher"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="platform-assistant-launcher-icon" aria-hidden>
          <i className="ph ph-chat-circle-dots" />
        </span>
        <span className="platform-assistant-launcher-label">Ask Garud</span>
      </button>
    </div>
  );
}
