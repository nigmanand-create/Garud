'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/platform/EmptyState';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { listPublicCourses, type PublicTrainingCourse } from '@/lib/api/training';
import { ApiError } from '@/lib/api/types';
import { formatPrice } from '@/lib/platform/labels';
import {
  INDIAN_STATES,
  TRAINING_COURSE_TYPE_LABELS,
  TRAINING_MODE_LABELS,
  type TrainingCourseType,
  type TrainingMode,
} from '@/lib/platform/verticals';

export default function TrainingCoursesPage() {
  const [type, setType] = useState<TrainingCourseType | ''>('');
  const [mode, setMode] = useState<TrainingMode | ''>('');
  const [state, setState] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<PublicTrainingCourse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    const t = setTimeout(() => {
      listPublicCourses({
        type: type || undefined,
        mode: mode || undefined,
        state: state || undefined,
        q: q.trim() || undefined,
      })
        .then((r) => setItems(r.items))
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load courses'));
    }, 250);
    return () => clearTimeout(t);
  }, [type, mode, state, q]);

  return (
    <>
      <PlatformPageHeader
        title="Drone training & licensing"
        subtitle="DGCA remote pilot, technician and specialized courses from verified training institutes. Register your interest and the institute contacts you."
        breadcrumbs={[{ label: 'Services', href: '/services' }, { label: 'Training' }]}
      />
      {error && <div className="platform-card platform-error">{error}</div>}

      <div className="platform-card platform-form platform-filter-bar">
        <div>
          <label htmlFor="tr-q">Search</label>
          <input id="tr-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Course or institute" />
        </div>
        <div>
          <label htmlFor="tr-type">Course type</label>
          <select id="tr-type" value={type} onChange={(e) => setType(e.target.value as TrainingCourseType | '')}>
            <option value="">All</option>
            {(Object.keys(TRAINING_COURSE_TYPE_LABELS) as TrainingCourseType[]).map((t) => (
              <option key={t} value={t}>
                {TRAINING_COURSE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tr-mode">Mode</label>
          <select id="tr-mode" value={mode} onChange={(e) => setMode(e.target.value as TrainingMode | '')}>
            <option value="">All</option>
            {(Object.keys(TRAINING_MODE_LABELS) as TrainingMode[]).map((m) => (
              <option key={m} value={m}>
                {TRAINING_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tr-state">State</label>
          <select id="tr-state" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Any</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!items && !error && <PlatformLoading />}
      {items && items.length === 0 && (
        <EmptyState
          title="No courses match yet"
          description="Training institutes are onboarding. Tell us what you are looking for and our advisors will help."
          primaryAction={{ label: 'Talk to training advisors', href: '/enquiry?service=training' }}
        />
      )}
      {items && items.length > 0 && (
        <div className="platform-grid">
          {items.map((c) => {
            const next = c.batches[0];
            return (
              <article key={c.id} className="platform-card">
                <h2 style={{ marginTop: 0 }}>
                  <Link href={`/training/${c.id}`}>{c.title}</Link>
                </h2>
                <p className="platform-text-muted">
                  {c.organization.companyName}
                  {c.organization.city || c.organization.state
                    ? ` · ${[c.organization.city, c.organization.state].filter(Boolean).join(', ')}`
                    : ''}
                </p>
                <p>
                  {TRAINING_COURSE_TYPE_LABELS[c.courseType]} · {TRAINING_MODE_LABELS[c.mode]}
                  {c.durationDays ? ` · ${c.durationDays} days` : ''}
                </p>
                <p>
                  <strong>{formatPrice(c.feeInr == null, c.feeInr)}</strong>
                  {next
                    ? ` · Next batch ${new Date(next.startDate).toLocaleDateString('en-IN')}`
                    : ' · No upcoming batch listed'}
                </p>
                <Link href={`/training/${c.id}`} className="platform-btn platform-btn-secondary platform-btn-sm">
                  View &amp; register interest
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
