import type { ReactNode } from 'react';

export type FormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

/** Wraps `platform-field` label + control markup. */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  className = '',
  children,
}: FormFieldProps) {
  return (
    <div className={`platform-field ${className}`.trim()}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <p className="platform-form-section-desc platform-form-field-hint">{hint}</p> : null}
      {error ? (
        <p className="platform-form-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
