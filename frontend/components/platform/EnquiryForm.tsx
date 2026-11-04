'use client';

import { useMemo, useState } from 'react';
import { submitEnquiry } from '@/lib/api/enquiries';
import { ApiError } from '@/lib/api/types';
import type { EnquiryIntent } from '@/lib/api/types';

const SERVICE_SUBJECTS: Record<string, string> = {
  compliance: 'DGCA & Regulatory Compliance',
  repair: 'Drone Repair / AMC',
  finance: 'Drone Finance & Insurance',
  recycling: 'Scrap / Buyback Valuation',
  training: 'Drone Training & Licensing',
};

type EnquiryFormProps = {
  defaultSubject?: string;
  serviceKey?: string;
  sourcePage?: string;
  /** Marketplace listing context — routes the enquiry to that vendor. */
  listingId?: string;
  /** Verified partner context — routes the enquiry to that partner. */
  organizationId?: string;
  intent?: EnquiryIntent;
};

export function EnquiryForm({
  defaultSubject = '',
  serviceKey,
  sourcePage,
  listingId,
  organizationId,
  intent,
}: EnquiryFormProps) {
  const routedToPartner = Boolean(listingId || organizationId);
  const initialSubject = useMemo(() => {
    if (defaultSubject) return defaultSubject;
    if (serviceKey && SERVICE_SUBJECTS[serviceKey]) {
      return SERVICE_SUBJECTS[serviceKey];
    }
    return '';
  }, [defaultSubject, serviceKey]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitEnquiry({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
        sourcePage:
          sourcePage ||
          (typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined),
        intent,
        serviceKey,
        listingId,
        organizationId,
      });
      setSuccessId(res.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit enquiry');
    } finally {
      setSubmitting(false);
    }
  }

  if (successId) {
    return (
      <div className="platform-card platform-success" role="status">
        <h2 style={{ marginTop: 0 }}>Thank you — we received your enquiry</h2>
        <p>
          Reference <code>{successId.slice(0, 8)}</code>. Our team will respond on{' '}
          <strong>{email}</strong> within 1–2 business days.
        </p>
      </div>
    );
  }

  return (
    <form className="platform-card platform-form" onSubmit={handleSubmit}>
      <p className="platform-form-section-desc">
        {routedToPartner
          ? 'Your enquiry goes to the supplier for this listing or partner; the Garud team is copied for support.'
          : 'Submit a platform enquiry — the Garud team will review it and route it to the right partner if needed.'}
      </p>
      {error && (
        <div className="platform-error" role="alert">
          {error}
        </div>
      )}
      <div className="platform-form-field-pair">
        <div>
          <label htmlFor="enquiry-name">Full name</label>
          <input
            id="enquiry-name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="enquiry-email">Work email</label>
          <input
            id="enquiry-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
      </div>
      <div className="platform-form-field-pair">
        <div>
          <label htmlFor="enquiry-phone">Phone (optional)</label>
          <input
            id="enquiry-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
        <div>
          <label htmlFor="enquiry-subject">Subject</label>
          <input
            id="enquiry-subject"
            required
            minLength={2}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label htmlFor="enquiry-message">How can we help?</label>
        <textarea
          id="enquiry-message"
          required
          minLength={10}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <div className="platform-form-actions">
        <button
          type="submit"
          className="platform-btn platform-btn-cta"
          disabled={submitting}
        >
          {submitting ? 'Sending…' : 'Send enquiry'}
        </button>
      </div>
    </form>
  );
}
