'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  getConversation,
  listConversations,
  markConversationRead,
  sendMessage,
  type ConversationList,
  type ConversationThread,
  type MessagesRole,
} from '@/lib/api/messages';
import { EmptyState } from '@/components/platform/EmptyState';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { ApiError } from '@/lib/api/types';

const POLL_MS = 15_000;

/** Two-pane threaded inbox shared by buyer and partner messaging pages. */
export function MessageThreads({ role }: { role: MessagesRole }) {
  const [list, setList] = useState<ConversationList | null>(null);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const mySide = role === 'buyer' ? 'BUYER' : 'PARTNER';

  const refreshList = useCallback(() => {
    listConversations(role)
      .then(setList)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load messages'),
      );
  }, [role]);

  const openThread = useCallback(
    async (id: string) => {
      try {
        const t = await getConversation(role, id);
        setThread(t);
        if (t.unread) {
          await markConversationRead(role, id);
          refreshList();
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Failed to open conversation');
      }
    },
    [role, refreshList],
  );

  useEffect(() => {
    refreshList();
    const id = new URLSearchParams(window.location.search).get('c');
    if (id) setSelectedId(id);
  }, [refreshList]);

  useEffect(() => {
    if (selectedId) void openThread(selectedId);
  }, [selectedId, openThread]);

  // Lightweight polling keeps the MVP "live" without websockets.
  useEffect(() => {
    const timer = setInterval(() => {
      refreshList();
      if (selectedId) void openThread(selectedId);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshList, openThread, selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [thread?.messages.length]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(role, selectedId, draft.trim());
      setDraft('');
      await openThread(selectedId);
      refreshList();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  const counterpart = (c: { partnerOrganization: { companyName: string }; buyerOrganization?: { companyName: string } | null }) =>
    role === 'buyer'
      ? c.partnerOrganization.companyName
      : (c.buyerOrganization?.companyName ?? 'Buyer');

  if (!list && !error) return <PlatformLoading />;

  return (
    <>
      {error && <div className="platform-card platform-error" role="alert">{error}</div>}

      {list && list.items.length === 0 && (
        <EmptyState
          title="No conversations yet"
          description={
            role === 'buyer'
              ? 'Use “Message supplier” on a listing or vendor profile to start a conversation.'
              : 'When a buyer messages you from a listing or your profile, the thread appears here.'
          }
          primaryAction={
            role === 'buyer'
              ? { label: 'Browse marketplace', href: '/marketplace' }
              : { label: 'Manage catalog', href: '/partner/catalog' }
          }
          icon="💬"
        />
      )}

      {list && list.items.length > 0 && (
        <div className="platform-messages">
          <aside className="platform-messages-list" aria-label="Conversations">
            {list.items.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`platform-messages-item${selectedId === c.id ? ' platform-messages-item--active' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <span className="platform-messages-item-title">
                  {c.unread && <span aria-label="Unread">● </span>}
                  {counterpart(c)}
                </span>
                <span className="platform-messages-item-subject">{c.subject}</span>
                {c.lastMessage && (
                  <span className="platform-muted platform-text-sm platform-messages-item-preview">
                    {c.lastMessage.body.slice(0, 80)}
                  </span>
                )}
                <span className="platform-muted platform-text-sm">
                  {new Date(c.lastMessageAt).toLocaleString('en-IN')}
                </span>
              </button>
            ))}
          </aside>

          <section className="platform-card platform-messages-thread" aria-live="polite">
            {!thread && <p className="platform-muted">Select a conversation.</p>}
            {thread && (
              <>
                <header>
                  <h2 style={{ marginTop: 0 }}>{thread.subject}</h2>
                  <p className="platform-muted platform-text-sm">
                    {role === 'buyer' ? 'With' : 'From'} {counterpart(thread)}
                    {thread.listing && (
                      <>
                        {' · '}
                        <Link href={`/marketplace/listings/${thread.listing.id}`}>
                          {thread.listing.name}
                        </Link>
                      </>
                    )}
                  </p>
                </header>
                <div className="platform-messages-scroll">
                  {thread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`platform-message-bubble${m.senderSide === mySide ? ' platform-message-bubble--mine' : ''}`}
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                      <div className="platform-muted platform-text-sm">
                        {new Date(m.createdAt).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <form className="platform-form" onSubmit={onSend}>
                  <label htmlFor="message-draft" className="platform-sr-only">
                    Reply
                  </label>
                  <textarea
                    id="message-draft"
                    rows={3}
                    maxLength={4000}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a reply…"
                  />
                  <div className="platform-form-actions">
                    <button
                      type="submit"
                      className="platform-btn platform-btn-cta"
                      disabled={sending || !draft.trim()}
                    >
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
