'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/components/platform/AuthProvider';
import { startConversation } from '@/lib/api/messages';
import { ApiError } from '@/lib/api/types';

type Props = {
  organizationId: string;
  listingId?: string;
  defaultSubject: string;
  className?: string;
};

/** Buyer-only "Message supplier" entry point: starts a threaded conversation. */
export function MessageSupplierButton({
  organizationId,
  listingId,
  defaultSubject,
  className = 'platform-btn platform-btn-secondary platform-btn-full',
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBuyer = user?.role === 'BUYER' || user?.role === 'GOVERNMENT';
  if (user && !isBuyer) return null; // partners/admins cannot start buyer threads

  if (!user) {
    return (
      <Link href="/auth/login" className={className}>
        <span aria-hidden>✉️</span> Sign in to message supplier
      </Link>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await startConversation({
        organizationId,
        listingId,
        subject,
        body,
      });
      router.push(`/buyer/messages?c=${res.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send message');
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <span aria-hidden>✉️</span> Message supplier
      </button>
    );
  }

  return (
    <form className="platform-card platform-form" onSubmit={onSubmit}>
      {error && <div className="platform-error" role="alert">{error}</div>}
      <label htmlFor="msg-subject">Subject</label>
      <input
        id="msg-subject"
        required
        minLength={2}
        maxLength={200}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <label htmlFor="msg-body">Message</label>
      <textarea
        id="msg-body"
        required
        rows={4}
        maxLength={4000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="platform-form-actions">
        <button type="submit" className="platform-btn platform-btn-cta" disabled={sending}>
          {sending ? 'Sending…' : 'Send'}
        </button>
        <button type="button" className="platform-btn platform-btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
