'use client';

import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  getPublicCourse,
  submitCourseInterest,
  type PublicTrainingCourse,
} from '@/lib/api/training';
import { ApiError } from '@/lib/api/types';
import { formatPrice } from '@/lib/platform/labels';
import {
  seatsLeft,
  TRAINING_BATCH_STATUS_LABELS,
  TRAINING_COURSE_TYPE_LABELS,
  TRAINING_MODE_LABELS,
} from '@/lib/platform/verticals';

export default function TrainingCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<PublicTrainingCourse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [batchId, setBatchId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getPublicCourse(id)
      .then(setCourse)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Course not found'));
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await submitCourseInterest(id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        batchId: batchId || undefined,
        message: message.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not send your interest');
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <div className="platform-card platform-error">{error}</div>;
  if (!course) return <PlatformLoading />;

  const profile = course.organization.instituteProfile;

  return (
    <>
      <PlatformPageHeader
        title={course.title}
        subtitle={`${course.organization.companyName} · ${TRAINING_COURSE_TYPE_LABELS[course.courseType]} · ${TRAINING_MODE_LABELS[course.mode]}`}
        breadcrumbs={[
          { label: 'Services', href: '/services' },
          { label: 'Training', href: '/training' },
          { label: course.title },
        ]}
      />

      <div className="platform-card">
        <p>
          <strong>{formatPrice(course.feeInr == null, course.feeInr)}</strong>
          {course.durationDays ? ` · ${course.durationDays} days` : ''}
        </p>
        {course.description && <p style={{ whiteSpace: 'pre-wrap' }}>{course.description}</p>}
        {course.eligibility && (
          <p>
            <strong>Eligibility:</strong> {course.eligibility}
          </p>
        )}
        {profile?.accreditation && (
          <p>
            <strong>Accreditation:</strong> {profile.accreditation}
            {profile.rptoApprovalNo ? ` (RPTO ${profile.rptoApprovalNo})` : ''}
          </p>
        )}
        {profile && profile.locations.length > 0 && (
          <p>
            <strong>Locations:</strong> {profile.locations.join(', ')}
          </p>
        )}
      </div>

      <div className="platform-card">
        <h2>Upcoming batches</h2>
        {course.batches.length === 0 ? (
          <p className="platform-text-muted">No upcoming batches yet — register interest and the institute will reach out.</p>
        ) : (
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Starts</th>
                  <th>Location</th>
                  <th>Seats left</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {course.batches.map((b) => (
                  <tr key={b.id}>
                    <td>{new Date(b.startDate).toLocaleDateString('en-IN')}</td>
                    <td>{[b.city, b.state].filter(Boolean).join(', ') || '—'}</td>
                    <td>{seatsLeft(b)}</td>
                    <td>
                      <StatusBadge status={b.status} label={TRAINING_BATCH_STATUS_LABELS[b.status]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {done ? (
        <div className="platform-card platform-success" role="status">
          <h2 style={{ marginTop: 0 }}>Thanks — your interest was sent</h2>
          <p>
            {course.organization.companyName} will contact you on <strong>{email}</strong>.
          </p>
        </div>
      ) : (
        <form className="platform-card platform-form" onSubmit={onSubmit}>
          <h2>Register your interest</h2>
          {formError && (
            <div className="platform-error" role="alert">
              {formError}
            </div>
          )}
          <div className="platform-form-field-pair">
            <div>
              <label htmlFor="ci-name">Full name</label>
              <input id="ci-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ci-email">Email</label>
              <input id="ci-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="platform-form-field-pair">
            <div>
              <label htmlFor="ci-phone">Phone (optional)</label>
              <input id="ci-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ci-batch">Preferred batch</label>
              <select id="ci-batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">No preference</option>
                {course.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {new Date(b.startDate).toLocaleDateString('en-IN')}
                    {b.city ? ` — ${b.city}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="ci-message">Message (optional)</label>
            <textarea id="ci-message" rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="platform-form-actions">
            <button type="submit" className="platform-btn platform-btn-cta" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send interest'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
