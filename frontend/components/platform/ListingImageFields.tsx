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

  function removeGalleryUrl(urlToRemove: string) {
    if (disabled) return;
    const next = parseGalleryImageUrls(galleryImageUrlsText).filter(
      (u) => u !== urlToRemove,
    );
    onGalleryTextChange(formatGalleryImageUrls(next));
  }

  const galleryUrls = parseGalleryImageUrls(galleryImageUrlsText);
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
          <div
            className="platform-listing-image-preview"
            title="Current primary image"
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primaryPreview} alt="" />
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
          Or paste an HTTPS URL, or use the path returned after upload:
        </p>
        <input
          id="primaryImageUrl"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={primaryImageUrl}
          disabled={disabled}
          onChange={(e) => onPrimaryChange(e.target.value)}
          placeholder="https://… or /platform-api/v1/media/listings/…"
        />
      </div>
      <div className="platform-field">
        <label>Gallery images</label>
        {galleryUrls.length > 0 && (
          <ul className="platform-listing-gallery-list" aria-label="Gallery thumbnails">
            {galleryUrls.map((url) => {
              const src = resolveListingImageUrl(url);
              return (
                <li key={url} className="platform-listing-gallery-item">
                  <div
                    className="platform-listing-image-preview"
                    title={url}
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" />
                    ) : (
                      <span className="platform-listing-card-media-icon">
                        <i className="ph ph-image" aria-hidden />
                      </span>
                    )}
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      className="platform-listing-gallery-remove"
                      onClick={() => removeGalleryUrl(url)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
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
          placeholder={'https://…\n/platform-api/v1/media/listings/…'}
        />
      </div>
    </>
  );
}
