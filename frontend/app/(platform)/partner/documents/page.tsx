'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiDownload, apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import { useConfirmDialog } from '@/components/platform/ConfirmDialog';
import { FileUploadZone } from '@/components/platform/FileUploadZone';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import type { ApplicationDocumentType, VerificationStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { formatEnumLabel } from '@/lib/platform/labels';
import { getPartnerDocumentsLockCallout } from '@/lib/platform/partner-onboarding';

type Doc = {
  id: string;
  documentType: ApplicationDocumentType;
  fileName: string;
  createdAt: string;
};

type PartnerMe = {
  verificationStatus: VerificationStatus;
  canEdit: boolean;
};

const DOC_TYPES: ApplicationDocumentType[] = [
  'GST_CERTIFICATE',
  'CIN_CERTIFICATE',
  'COMPANY_REGISTRATION',
  'AUTHORIZATION_LETTER',
  'OTHER',
];

export default function PartnerDocumentsPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <DocumentsInner />
    </RequireAuth>
  );
}

function DocumentsInner() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [profile, setProfile] = useState<PartnerMe | null>(null);
  const [documentType, setDocumentType] =
    useState<ApplicationDocumentType>('GST_CERTIFICATE');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const canEditDocuments = profile?.canEdit ?? false;
  const lockCallout = profile
    ? getPartnerDocumentsLockCallout(profile.verificationStatus)
    : null;

  function reloadDocs() {
    return apiRequest<Doc[]>('/partner/documents', { auth: true })
      .then(setDocs)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Failed to load documents'),
      );
  }

  useEffect(() => {
    Promise.all([
      apiRequest<PartnerMe>('/partner/me', { auth: true }).then(setProfile),
      reloadDocs(),
    ]).catch((e) =>
      setError(e instanceof ApiError ? e.message : 'Failed to load'),
    );
  }, []);

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file || !canEditDocuments) return;
    setError(null);
    setMessage(null);
    setUploading(true);
    const fd = new FormData();
    fd.append('documentType', documentType);
    fd.append('file', file);
    try {
      await apiRequest('/partner/documents', {
        method: 'POST',
        auth: true,
        body: fd,
      });
      setMessage('Document uploaded.');
      setFile(null);
      await reloadDocs();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    if (!canEditDocuments) return;
    const ok = await confirm({
      title: 'Delete this document?',
      message: 'The file will be removed from your verification uploads.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await apiRequest(`/partner/documents/${id}`, {
        method: 'DELETE',
        auth: true,
      });
      await reloadDocs();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const isApproved = profile?.verificationStatus === 'APPROVED';
  const lockCalloutClass = isApproved
    ? 'platform-callout platform-callout--success'
    : 'platform-callout platform-callout--partner';

  return (
    <PartnerPageShell>
      {confirmDialog}
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Verification documents"
          subtitle="Upload GST, registration, and authorization files while your application is draft or rejected."
          badge={
            profile ? (
              <StatusBadge status={profile.verificationStatus} />
            ) : undefined
          }
        />
        <div className="platform-form-layout platform-form-layout--wide">
          {lockCallout && (
            <div className={lockCalloutClass} role="status">
              {lockCallout}
            </div>
          )}
          {error && (
            <div className="platform-card platform-error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="platform-card platform-success" role="status">
              {message}
            </div>
          )}

          {canEditDocuments ? (
            <form
              className="platform-card platform-form platform-form-card"
              onSubmit={upload}
            >
          <fieldset className="platform-form-section">
            <legend className="platform-form-section-title">Upload document</legend>
            <p className="platform-form-section-desc">
              Choose the document type, then add a PDF or image. Each file must be
              under 5 MB.
            </p>
            <div className="platform-field">
              <label htmlFor="documentType">Document type</label>
              <select
                id="documentType"
                value={documentType}
                onChange={(e) =>
                  setDocumentType(e.target.value as ApplicationDocumentType)
                }
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {formatEnumLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <FileUploadZone file={file} onFileChange={setFile} />
            <div className="platform-actions">
              <button
                type="submit"
                className="platform-btn platform-btn-cta"
                disabled={!file || uploading}
                aria-busy={uploading}
              >
                {uploading ? 'Uploading…' : 'Upload document'}
              </button>
            </div>
          </fieldset>
            </form>
          ) : (
            profile && (
              <div className="platform-callout platform-callout--muted">
                <p className="platform-form-section-desc">
                  Upload and delete are unavailable in your current verification
                  status.
                </p>
              </div>
            )
          )}

          <div className="platform-card">
            <h3 className="platform-card-section-title">Uploaded files</h3>
        {docs === null && !error && <PlatformLoading label="Loading documents…" />}
        {docs && docs.length > 0 && (
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>File</th>
                  <th>Uploaded</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td>{formatEnumLabel(d.documentType)}</td>
                    <td>{d.fileName}</td>
                    <td>{new Date(d.createdAt).toLocaleString()}</td>
                    <td className="platform-table-actions">
                      <button
                        type="button"
                        className="platform-link-btn"
                        onClick={() =>
                          apiDownload(
                            `/partner/documents/${d.id}/download`,
                            d.fileName,
                          )
                        }
                      >
                        Download
                      </button>
                      {canEditDocuments && (
                        <>
                          {' '}
                          <button
                            type="button"
                            className="platform-link-btn"
                            onClick={() => remove(d.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {docs && docs.length === 0 && !error && (
          <EmptyState
            title="No documents yet"
            description="Upload at least one verification document before submitting your partner application."
            primaryAction={{
              label: 'Complete application',
              href: '/partner/application',
            }}
            icon="📄"
          />
        )}
          </div>
        </div>
      </div>
    </PartnerPageShell>
  );
}
