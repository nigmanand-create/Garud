'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/platform/AuthProvider';
import {
  getMyGovBid,
  submitGovBid,
  uploadGovBidDocument,
} from '@/lib/api/gov';
import { ApiError } from '@/lib/api/types';
import Link from 'next/link';
import { loginPathForIntent } from '@/lib/platform/auth-login';

type Props = {
  opportunityId: string;
};

export function GovTenderBidForm({ opportunityId }: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [existing, setExisting] = useState<{
    amountInr: string | number;
    hasDocument: boolean;
    submittedAt: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canBid =
    user && (user.role === 'BUYER' || user.role === 'GOVERNMENT');

  useEffect(() => {
    if (!canBid) return;
    getMyGovBid(opportunityId)
      .then((res) => {
        if (res.bid) {
          setExisting(res.bid);
          setAmount(String(res.bid.amountInr));
        }
      })
      .catch(() => {
        /* ignore — form still usable */
      });
  }, [canBid, opportunityId]);

  if (!canBid) {
    return (
      <div className="platform-card platform-muted">
        <p>
          Sign in with a buyer or government account to submit a sealed tender bid.{' '}
          <Link
            href={`${loginPathForIntent('buyer')}?next=${encodeURIComponent(`/government/${opportunityId}`)}`}
          >
            Log in
          </Link>
        </p>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const amountInr = Number(amount);
      if (!Number.isFinite(amountInr) || amountInr < 1) {
        throw new ApiError(400, { message: 'Enter a valid bid amount in INR' });
      }
      let storedRelativePath: string | undefined;
      let originalFilename: string | undefined;
      let mimeType: string | undefined;
      if (file) {
        const uploaded = await uploadGovBidDocument(opportunityId, file);
        storedRelativePath = uploaded.storedRelativePath;
        originalFilename = uploaded.originalFilename;
        mimeType = uploaded.mimeType;
      }
      await submitGovBid(opportunityId, {
        amountInr,
        storedRelativePath,
        originalFilename,
        mimeType,
      });
      setNotice(
        existing
          ? 'Bid updated. Your amount stays private until the tender closes.'
          : 'Bid submitted. Your amount stays private until the tender closes.',
      );
      setExisting({
        amountInr,
        hasDocument: Boolean(storedRelativePath ?? existing?.hasDocument),
        submittedAt: new Date().toISOString(),
      });
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit bid');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="platform-card platform-form" onSubmit={onSubmit}>
      <h2 className="platform-section-heading">Submit sealed bid</h2>
      <p className="platform-muted platform-text-sm">
        Only platform admins see bid amounts after the closing date. You may update your bid until
        then.
      </p>
      {existing && (
        <p className="platform-muted">
          You already have a bid on file (last updated{' '}
          {new Date(existing.submittedAt).toLocaleString('en-IN')}).
        </p>
      )}
      {error && <div className="platform-error">{error}</div>}
      {notice && <div className="platform-notice">{notice}</div>}
      <div className="platform-form-field">
        <label htmlFor="bid-amount">Bid amount (INR)</label>
        <input
          id="bid-amount"
          type="number"
          min={1}
          step={1}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="platform-form-field">
        <label htmlFor="bid-file">Proposal document (optional, PDF or image, max 5 MB)</label>
        <input
          id="bid-file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <button type="submit" className="platform-btn platform-btn-cta" disabled={busy}>
        {busy ? 'Submitting…' : existing ? 'Update sealed bid' : 'Submit sealed bid'}
      </button>
    </form>
  );
}
