'use client';

import { useRef, useState, type DragEvent } from 'react';

type FileUploadZoneProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  hint?: string;
  disabled?: boolean;
};

export function FileUploadZone({
  file,
  onFileChange,
  accept = '.pdf,.jpg,.jpeg,.png',
  hint = 'PDF, JPG, or PNG — max 5 MB',
  disabled = false,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function pickFromList(files: FileList | null) {
    const next = files?.[0] ?? null;
    onFileChange(next);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    pickFromList(e.dataTransfer.files);
  }

  return (
    <div
      className={`platform-upload-zone${dragOver ? ' platform-upload-zone--active' : ''}${disabled ? ' platform-upload-zone--disabled' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        className="platform-upload-zone-input"
        accept={accept}
        disabled={disabled}
        onChange={(e) => pickFromList(e.target.files)}
      />
      {file ? (
        <div className="platform-upload-zone-file">
          <strong>{file.name}</strong>
          <span className="platform-muted">
            {(file.size / 1024).toFixed(0)} KB
          </span>
          {!disabled && (
            <button
              type="button"
              className="platform-link-btn"
              onClick={() => {
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="platform-upload-zone-title">Drop file here or browse</p>
          <p className="platform-muted platform-upload-zone-hint">{hint}</p>
          <button
            type="button"
            className="platform-btn platform-btn-secondary"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            Choose file
          </button>
        </>
      )}
    </div>
  );
}
