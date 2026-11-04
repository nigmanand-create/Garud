'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useMemo, useState } from 'react';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { submitServiceRequest } from '@/lib/api/service-requests';
import { ApiError } from '@/lib/api/types';
import {
  buildRequestDetails,
  INDIAN_STATES,
  missingRequiredFields,
  resolveVerticalConfig,
  SERVICE_VERTICAL_CONFIGS,
} from '@/lib/platform/verticals';

function ServiceRequestInner() {
  const searchParams = useSearchParams();
  const initial = resolveVerticalConfig(
    searchParams.get('category') ?? searchParams.get('service'),
  );
  const [category, setCategory] = useState(initial.category);
  const config = useMemo(() => resolveVerticalConfig(category), [category]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ token: string; status: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const missing = missingRequiredFields(config, values);
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitServiceRequest({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        category: config.category,
        title: title.trim(),
        description: description.trim(),
        state: state || undefined,
        city: city.trim() || undefined,
        details: buildRequestDetails(config, values),
      });
      setResult({ token: res.request.trackingToken, status: res.request.status });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your request');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="platform-card platform-success" role="status">
        <h2 style={{ marginTop: 0 }}>
          {result.status === 'MATCHED'
            ? 'Request submitted — matched with verified providers'
            : 'Request submitted — our team is finding a provider'}
        </h2>
        <p>
          We emailed a tracking link to <strong>{email}</strong>. You can follow progress
          (Submitted → Matched → In progress → Completed) at any time.
        </p>
        <div className="platform-form-actions">
          <Link href={`/services/track/${result.token}`} className="platform-btn platform-btn-cta">
            Track this request
          </Link>
          <Link href="/services" className="platform-btn platform-btn-secondary">
            Back to services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="platform-card platform-form" onSubmit={onSubmit}>
      <p className="platform-form-section-desc">{config.intro}</p>
      {error && (
        <div className="platform-error" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="sr-category">Service</label>
        <select
          id="sr-category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as typeof category);
            setValues({});
          }}
        >
          {SERVICE_VERTICAL_CONFIGS.map((v) => (
            <option key={v.category} value={v.category}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sr-title">Requirement title</label>
        <input
          id="sr-title"
          required
          minLength={3}
          maxLength={200}
          value={title}
          placeholder={config.titlePlaceholder}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {config.fields.length > 0 && (
        <div className="platform-form-field-pair">
          {config.fields.map((f) => (
            <div key={f.name}>
              <label htmlFor={`sr-${f.name}`}>
                {f.label}
                {f.required ? ' *' : ''}
              </label>
              {f.type === 'select' ? (
                <select
                  id={`sr-${f.name}`}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`sr-${f.name}`}
                  type={f.type === 'number' ? 'number' : 'text'}
                  min={f.type === 'number' ? 0 : undefined}
                  value={values[f.name] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="sr-description">Details</label>
        <textarea
          id="sr-description"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          value={description}
          placeholder={config.descriptionPlaceholder}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="platform-form-field-pair">
        <div>
          <label htmlFor="sr-state">State (used to match nearby providers)</label>
          <select id="sr-state" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Anywhere in India</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sr-city">City (optional)</label>
          <input id="sr-city" value={city} maxLength={100} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>

      <div className="platform-form-field-pair">
        <div>
          <label htmlFor="sr-name">Full name</label>
          <input
            id="sr-name"
            required
            minLength={2}
            value={name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="sr-email">Email</label>
          <input
            id="sr-email"
            type="email"
            required
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label htmlFor="sr-phone">Phone (optional)</label>
        <input
          id="sr-phone"
          type="tel"
          value={phone}
          autoComplete="tel"
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="platform-form-actions">
        <button type="submit" className="platform-btn platform-btn-cta" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit requirement'}
        </button>
      </div>
      <p className="platform-text-muted">
        Your contact details are shared only with the provider that accepts your request.
      </p>
    </form>
  );
}

export default function ServiceRequestPage() {
  return (
    <>
      <PlatformPageHeader
        title="Request a service"
        subtitle="Submit your requirement once — GarudHub matches it with verified providers by service and location."
        breadcrumbs={[{ label: 'Services', href: '/services' }, { label: 'Request' }]}
      />
      <Suspense fallback={<div className="platform-card">Loading form…</div>}>
        <ServiceRequestInner />
      </Suspense>
    </>
  );
}
