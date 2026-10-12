'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/types';
import {
  formatGalleryImageUrls,
  parseGalleryImageUrls,
  resolveListingImageUrl,
} from '@/lib/platform/listing-media';
import { FileUploadZone } from '@/components/platform/FileUploadZone';

type ListingImageFieldsProps = {
  primaryImageUrl: string;
  galleryImageUrlsText: string;
  onPrimaryChange: (url: string) => void;
  onGalleryTextChange: (text: string) => void;
  disabled?: boolean;
};

export function ListingImageFields({
  primaryImageUrl,
  galleryImageUrlsText,
  onPrimaryChange,
  onGalleryTextChange,
  disabled = false,
}: ListingImageFieldsProps) {
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiRequest<{ url: string }>(
      '/partner/catalog/listings/images',
      { method: 'POST', auth: true, body: fd },
    );
    return res.url;
  }

  async function uploadPrimary() {
    if (!primaryFile || disabled) return;
    setUploadError(null);
    setUploadingPrimary(true);
    try {
      const url = await uploadImage(primaryFile);
      onPrimaryChange(url);
      setPrimaryFile(null);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploadingPrimary(false);
    }
  }

  async function uploadGallery() {
    if (!galleryFile || disabled) return;
    setUploadError(null);
    setUploadingGallery(true);
    try {
      const url = await uploadImage(galleryFile);
      const existing = parseGalleryImageUrls(galleryImageUrlsText);
      onGalleryTextChange(formatGalleryImageUrls([...existing, url]));
      setGalleryFile(null);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploadingGallery(false);
    }
  }

  const primaryPreview = resolveListingImageUrl(primaryImageUrl);

  return (
    <>
      {uploadError && (
        <p className="platform-error" style={{ margin: '0 0 0.5rem' }}>
          {uploadError}
        </p>
      )}
      <div className="platform-field">
        <label htmlFor="primaryImageUrl">Primary image</label>
        {primaryPreview && (
          <div className="platform-listing-image-preview" style={{ marginBottom: '0.5rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primaryPreview} alt="" style={{ maxWidth: 200, borderRadius: 8 }} />
          </div>
        )}
        <FileUploadZone
          file={primaryFile}
          onFileChange={setPrimaryFile}
          accept=".jpg,.jpeg,.png"
          hint="JPEG or PNG — max 5 MB"
          disabled={disabled || uploadingPrimary}
        />
        <button
          type="button"
          className="platform-btn platform-btn-secondary"
          style={{ marginTop: '0.5rem' }}
          disabled={!primaryFile || disabled || uploadingPrimary}
          onClick={uploadPrimary}
        >
          {uploadingPrimary ? 'Uploading…' : 'Upload as primary'}
        </button>
        <p className="platform-muted" style={{ fontSize: '0.8125rem', margin: '0.5rem 0 0' }}>
          Or paste an HTTPS URL:
        </p>
        <input
          id="primaryImageUrl"
          type="url"
          value={primaryImageUrl}
          disabled={disabled}
          onChange={(e) => onPrimaryChange(e.target.value)}
          placeholder="https://…"
        />
      </div>
      <div className="platform-field">
        <label>Gallery images</label>
        <ul className="platform-muted" style={{ fontSize: '0.875rem', paddingLeft: '1.25rem' }}>
          {parseGalleryImageUrls(galleryImageUrlsText).map((url) => (
            <li key={url}>{url}</li>
          ))}
        </ul>
        <FileUploadZone
          file={galleryFile}
          onFileChange={setGalleryFile}
          accept=".jpg,.jpeg,.png"
          hint="Add another gallery image (JPEG/PNG)"
          disabled={disabled || uploadingGallery}
        />
        <button
          type="button"
          className="platform-btn platform-btn-secondary"
          style={{ marginTop: '0.5rem' }}
          disabled={!galleryFile || disabled || uploadingGallery}
          onClick={uploadGallery}
        >
          {uploadingGallery ? 'Uploading…' : 'Add to gallery'}
        </button>
        <p className="platform-muted" style={{ fontSize: '0.8125rem', margin: '0.5rem 0 0' }}>
          Or paste gallery URLs (one per line):
        </p>
        <textarea
          id="galleryImageUrls"
          value={galleryImageUrlsText}
          disabled={disabled}
          onChange={(e) => onGalleryTextChange(e.target.value)}
          placeholder={'https://…\nhttps://…'}
        />
      </div>
    </>
  );
}
