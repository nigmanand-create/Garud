'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiDownload, apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { ACCOUNT_TYPE_LABELS, formatEnumLabel } from '@/lib/platform/labels';
import type { AccountType, ApplicationDocumentType, VerificationStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type ApplicationDetail = {
  id: string;
  companyName: string;
  verificationStatus: VerificationStatus;
  gst?: string | null;
  cin?: string | null;
  productsServicesDescription?: string | null;
  owner: { email: string; accountType: AccountType };
  documents: {
    id: string;
    documentType: ApplicationDocumentType;
    fileName: string;
  }[];
};

export default function AdminApplicationDetailPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <DetailInner />
    </RequireAuth>
  );
}

function DetailInner() {
  const params = useParams();
  const id = params.id as string;
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  function load() {
    apiRequest<ApplicationDetail>(`/admin/applications/${id}`, { auth: true })
      .then(setApp)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Not found'),
      );
  }

  useEffect(() => {
    load();
  }, [id]);

  async function approve() {
    setError(null);
    try {
      await apiRequest(`/admin/applications/${id}/approve`, {
        method: 'POST',
        auth: true,
      });
      setMessage('Approved.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Approve failed');
    }
  }

  async function reject(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest(`/admin/applications/${id}/reject`, {
        method: 'POST',
        auth: true,
        body: { reason: rejectReason },
      });
      setMessage('Rejected.');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reject failed');
    }
  }

  if (!app && !error) {
    return <p className="platform-muted">Loading…</p>;
  }

  return (
    <>
      <p>
        <Link href="/admin">← Applications</Link>
      </p>
      {error && <div className="platform-card platform-error">{error}</div>}
      {message && <div className="platform-card platform-success">{message}</div>}
      {app && (
        <>
          <h1 className="platform-title">{app.companyName}</h1>
          <p className="platform-subtitle">
            {formatEnumLabel(app.verificationStatus)} ·{' '}
            {ACCOUNT_TYPE_LABELS[app.owner.accountType]} · {app.owner.email}
          </p>
          <div className="platform-card">
            {app.gst && <p>GST: {app.gst}</p>}
            {app.cin && <p>CIN: {app.cin}</p>}
            {app.productsServicesDescription && (
              <p style={{ whiteSpace: 'pre-wrap' }}>
                {app.productsServicesDescription}
              </p>
            )}
          </div>
          <div className="platform-card">
            <h3>Documents</h3>
            <ul>
              {app.documents.map((d) => (
                <li key={d.id}>
                  {formatEnumLabel(d.documentType)} — {d.fileName}{' '}
                  <button
                    type="button"
                    className="platform-link-btn"
                    onClick={() =>
                      apiDownload(
                        `/admin/documents/${d.id}/download`,
                        d.fileName,
                      )
                    }
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
            {app.documents.length === 0 && (
              <p className="platform-muted">No documents uploaded.</p>
            )}
          </div>
          {(app.verificationStatus === 'SUBMITTED' ||
            app.verificationStatus === 'UNDER_REVIEW') && (
            <div className="platform-card">
              <div className="platform-actions">
                <button type="button" className="platform-btn" onClick={approve}>
                  Approve
                </button>
              </div>
              <form className="platform-form" onSubmit={reject} style={{ marginTop: '1rem' }}>
                <label>Rejection reason</label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <button
                  type="submit"
                  className="platform-btn platform-btn-danger"
                >
                  Reject
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </>
  );
}
