'use client';

import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiDownload, apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { Button } from '@/components/platform/Button';
import { FormField } from '@/components/platform/FormField';
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
    return (
      <>
        <PlatformPageHeader title="Partner application" subtitle="Loading application details…" />
        <AdminSubnav />
        <p className="platform-muted platform-loading-center">Loading…</p>
      </>
    );
  }

  return (
    <>
      <PlatformPageHeader
        title={app?.companyName ?? 'Partner application'}
        subtitle={
          app ? (
            <>
              <StatusBadge status={app.verificationStatus} /> ·{' '}
              {ACCOUNT_TYPE_LABELS[app.owner.accountType]} · {app.owner.email}
            </>
          ) : (
            'Application review'
          )
        }
        backHref="/admin"
        backLabel="Applications"
      />
      <AdminSubnav />

      {error && <div className="platform-card platform-error">{error}</div>}
      {message && <div className="platform-card platform-success">{message}</div>}

      {app && (
        <div className="platform-admin-application-grid">
          <div className="platform-stack platform-stack--lg">
            <div className="platform-card">
              <h2 className="platform-section-heading">Business profile</h2>
              {app.gst && <p>GST: {app.gst}</p>}
              {app.cin && <p>CIN: {app.cin}</p>}
              {app.productsServicesDescription && (
                <p className="platform-pre-wrap">{app.productsServicesDescription}</p>
              )}
              {!app.gst && !app.cin && !app.productsServicesDescription && (
                <p className="platform-muted">No additional profile details submitted.</p>
              )}
            </div>

            <div className="platform-card">
              <h2 className="platform-section-heading">Documents</h2>
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
          </div>

          {(app.verificationStatus === 'SUBMITTED' ||
            app.verificationStatus === 'UNDER_REVIEW') && (
            <div className="platform-card platform-form">
              <h2 className="platform-section-heading">Verification decision</h2>
              <div className="platform-actions">
                <Button type="button" onClick={approve}>
                  Approve partner
                </Button>
              </div>
              <form className="platform-form platform-mt-md" onSubmit={reject}>
                <FormField label="Rejection reason" htmlFor="reject-reason">
                  <textarea
                    id="reject-reason"
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </FormField>
                <Button type="submit" variant="danger">
                  Reject application
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}
