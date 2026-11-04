'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { EmptyState } from '@/components/platform/EmptyState';
import { PartnerPageShell } from '@/components/platform/PartnerPageShell';
import { PlatformLoading } from '@/components/platform/PlatformLoading';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import {
  createBatch,
  createCourse,
  deleteBatch,
  deleteCourse,
  getInstituteProfile,
  listOwnCourses,
  listStudentLeads,
  saveInstituteProfile,
  STUDENT_LEAD_STATUS_LABELS,
  updateBatch,
  updateCourse,
  updateStudentLead,
  type InstituteProfile,
  type StudentLead,
  type StudentLeadStatus,
  type TrainingCourse,
} from '@/lib/api/training';
import { ApiError } from '@/lib/api/types';
import { formatPrice } from '@/lib/platform/labels';
import {
  seatsLeft,
  TRAINING_BATCH_STATUS_LABELS,
  TRAINING_COURSE_TYPE_LABELS,
  TRAINING_MODE_LABELS,
  type TrainingBatchStatus,
  type TrainingCourseType,
  type TrainingMode,
} from '@/lib/platform/verticals';

export default function PartnerTrainingPage() {
  return (
    <RequireAuth roles={['PARTNER']}>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [courses, setCourses] = useState<TrainingCourse[] | null>(null);
  const [profile, setProfile] = useState<InstituteProfile | null>(null);
  const [leads, setLeads] = useState<StudentLead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, p, l] = await Promise.all([
        listOwnCourses(),
        getInstituteProfile(),
        listStudentLeads(),
      ]);
      setCourses(c.items);
      setProfile(p);
      setLeads(l.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load training data');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<unknown>, success?: string) {
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (success) setNotice(success);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed');
    }
  }

  return (
    <PartnerPageShell>
      <div className="platform-partner-form-page">
        <PlatformPageHeader
          title="Training"
          subtitle="Publish courses and batches, keep your institute profile current, and follow up on student interest."
          actions={
            <Link href="/training" className="platform-btn platform-btn-secondary">
              View public catalogue
            </Link>
          }
        />
        <div className="platform-form-layout platform-form-layout--full">
          {error && (
            <div className="platform-card platform-error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="platform-card platform-success" role="status">
              {notice}
            </div>
          )}
          {!courses && !error && <PlatformLoading />}

          {courses && profile && (
            <>
              <ProfileForm
                profile={profile}
                onSave={(p) => run(() => saveInstituteProfile(p), 'Institute profile saved.')}
              />
              <NewCourseForm
                onCreate={(body) => run(() => createCourse(body), 'Course created. Publish it when ready.')}
              />
              <h2 className="platform-section-heading">Your courses</h2>
              {courses.length === 0 && (
                <EmptyState title="No courses yet" description="Create your first course above, then add batches." />
              )}
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} run={run} />
              ))}

              <h2 className="platform-section-heading">Student leads</h2>
              {leads.length === 0 ? (
                <div className="platform-card platform-muted">
                  No course interest yet. Published courses appear in the public catalogue.
                </div>
              ) : (
                <div className="platform-card">
                  <div className="platform-table-wrap">
                    <table className="platform-table">
                      <thead>
                        <tr>
                          <th>Received</th>
                          <th>Student</th>
                          <th>Course / batch</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((l) => (
                          <tr key={l.id}>
                            <td>{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                            <td>
                              {l.name}
                              <div className="platform-text-muted">
                                <a href={`mailto:${l.email}`}>{l.email}</a>
                                {l.phone ? ` · ${l.phone}` : ''}
                                {l.city ? ` · ${l.city}` : ''}
                              </div>
                            </td>
                            <td style={{ whiteSpace: 'pre-wrap' }}>
                              {l.course.title}
                              {l.batch
                                ? ` — batch ${new Date(l.batch.startDate).toLocaleDateString('en-IN')}${l.batch.city ? `, ${l.batch.city}` : ''}`
                                : ''}
                              {l.message ? `\n${l.message}` : ''}
                            </td>
                            <td>
                              <select
                                aria-label="Lead status"
                                value={l.status}
                                onChange={(e) =>
                                  run(() =>
                                    updateStudentLead(l.id, { status: e.target.value as StudentLeadStatus }),
                                  )
                                }
                              >
                                {(Object.keys(STUDENT_LEAD_STATUS_LABELS) as StudentLeadStatus[]).map((s) => (
                                  <option key={s} value={s}>
                                    {STUDENT_LEAD_STATUS_LABELS[s]}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="platform-text-muted">
                    Interest also appears in the general <Link href="/partner/leads?intent=TRAINING">Leads pipeline</Link> (type: Training).
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PartnerPageShell>
  );
}

function ProfileForm({
  profile,
  onSave,
}: {
  profile: InstituteProfile;
  onSave: (p: Partial<InstituteProfile>) => void;
}) {
  const [accreditation, setAccreditation] = useState(profile.accreditation ?? '');
  const [rpto, setRpto] = useState(profile.rptoApprovalNo ?? '');
  const [about, setAbout] = useState(profile.about ?? '');
  const [locations, setLocations] = useState(profile.locations.join(', '));
  const [schedule, setSchedule] = useState(profile.scheduleNotes ?? '');

  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({
      accreditation,
      rptoApprovalNo: rpto,
      about,
      locations: locations
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean),
      scheduleNotes: schedule,
    });
  }

  return (
    <form className="platform-card platform-form" onSubmit={submit}>
      <h2>Institute profile</h2>
      <div className="platform-form-field-pair">
        <div>
          <label htmlFor="ip-accr">Accreditation</label>
          <input id="ip-accr" value={accreditation} maxLength={300} onChange={(e) => setAccreditation(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ip-rpto">DGCA RPTO approval no.</label>
          <input id="ip-rpto" value={rpto} maxLength={100} onChange={(e) => setRpto(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="ip-loc">Training locations (comma separated)</label>
        <input id="ip-loc" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Pune, Nagpur" />
      </div>
      <div>
        <label htmlFor="ip-sched">Batch schedule notes</label>
        <textarea id="ip-sched" rows={2} maxLength={1000} value={schedule} onChange={(e) => setSchedule(e.target.value)} />
      </div>
      <div>
        <label htmlFor="ip-about">About the institute</label>
        <textarea id="ip-about" rows={3} maxLength={3000} value={about} onChange={(e) => setAbout(e.target.value)} />
      </div>
      <div className="platform-form-actions">
        <button type="submit" className="platform-btn platform-btn-cta">
          Save profile
        </button>
      </div>
    </form>
  );
}

function NewCourseForm({
  onCreate,
}: {
  onCreate: (body: {
    title: string;
    courseType: TrainingCourseType;
    mode: TrainingMode;
    durationDays?: number;
    feeInr?: number;
    description?: string;
    eligibility?: string;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [courseType, setCourseType] = useState<TrainingCourseType>('REMOTE_PILOT');
  const [mode, setMode] = useState<TrainingMode>('ONSITE');
  const [duration, setDuration] = useState('');
  const [fee, setFee] = useState('');
  const [description, setDescription] = useState('');
  const [eligibility, setEligibility] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    onCreate({
      title: title.trim(),
      courseType,
      mode,
      durationDays: duration ? Number(duration) : undefined,
      feeInr: fee ? Number(fee) : undefined,
      description: description.trim() || undefined,
      eligibility: eligibility.trim() || undefined,
    });
    setTitle('');
    setDuration('');
    setFee('');
    setDescription('');
    setEligibility('');
  }

  return (
    <form className="platform-card platform-form" onSubmit={submit}>
      <h2>New course</h2>
      <div>
        <label htmlFor="nc-title">Title</label>
        <input id="nc-title" required minLength={3} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="platform-form-field-pair">
        <div>
          <label htmlFor="nc-type">Type</label>
          <select id="nc-type" value={courseType} onChange={(e) => setCourseType(e.target.value as TrainingCourseType)}>
            {(Object.keys(TRAINING_COURSE_TYPE_LABELS) as TrainingCourseType[]).map((t) => (
              <option key={t} value={t}>
                {TRAINING_COURSE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="nc-mode">Mode</label>
          <select id="nc-mode" value={mode} onChange={(e) => setMode(e.target.value as TrainingMode)}>
            {(Object.keys(TRAINING_MODE_LABELS) as TrainingMode[]).map((m) => (
              <option key={m} value={m}>
                {TRAINING_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="platform-form-field-pair">
        <div>
          <label htmlFor="nc-days">Duration (days)</label>
          <input id="nc-days" type="number" min={1} max={730} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div>
          <label htmlFor="nc-fee">Fee (INR)</label>
          <input id="nc-fee" type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="nc-elig">Eligibility</label>
        <input id="nc-elig" maxLength={1000} value={eligibility} onChange={(e) => setEligibility(e.target.value)} />
      </div>
      <div>
        <label htmlFor="nc-desc">Description</label>
        <textarea id="nc-desc" rows={3} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="platform-form-actions">
        <button type="submit" className="platform-btn platform-btn-cta">
          Create course
        </button>
      </div>
    </form>
  );
}

function CourseCard({
  course,
  run,
}: {
  course: TrainingCourse;
  run: (fn: () => Promise<unknown>, success?: string) => Promise<void>;
}) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [seats, setSeats] = useState('20');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  function addBatch(e: FormEvent) {
    e.preventDefault();
    void run(
      () =>
        createBatch(course.id, {
          startDate: start,
          endDate: end || undefined,
          seats: Number(seats),
          city: city.trim() || undefined,
          state: state.trim() || undefined,
        }),
      'Batch added.',
    );
    setStart('');
    setEnd('');
    setCity('');
  }

  return (
    <article className="platform-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0 }}>{course.title}</h3>
          <p className="platform-text-muted">
            {TRAINING_COURSE_TYPE_LABELS[course.courseType]} · {TRAINING_MODE_LABELS[course.mode]}
            {course.durationDays ? ` · ${course.durationDays} days` : ''} ·{' '}
            {formatPrice(course.feeInr == null, course.feeInr)}
          </p>
        </div>
        <div className="platform-form-actions">
          <StatusBadge
            status={course.isPublished ? 'PUBLISHED' : 'DRAFT'}
            label={course.isPublished ? 'Published' : 'Draft'}
          />
          <button
            type="button"
            className="platform-btn platform-btn-secondary platform-btn-sm"
            onClick={() =>
              run(
                () => updateCourse(course.id, { isPublished: !course.isPublished }),
                course.isPublished ? 'Course unpublished.' : 'Course published.',
              )
            }
          >
            {course.isPublished ? 'Unpublish' : 'Publish'}
          </button>
          <button
            type="button"
            className="platform-btn platform-btn-secondary platform-btn-sm"
            onClick={() => {
              if (window.confirm('Delete this course and its batches?')) {
                void run(() => deleteCourse(course.id), 'Course deleted.');
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {course.batches.length > 0 && (
        <div className="platform-table-wrap">
          <table className="platform-table">
            <thead>
              <tr>
                <th>Starts</th>
                <th>Location</th>
                <th>Seats</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {course.batches.map((b) => (
                <tr key={b.id}>
                  <td>{new Date(b.startDate).toLocaleDateString('en-IN')}</td>
                  <td>{[b.city, b.state].filter(Boolean).join(', ') || '—'}</td>
                  <td>
                    <input
                      aria-label="Seats filled"
                      type="number"
                      min={0}
                      max={b.seats}
                      defaultValue={b.seatsFilled}
                      style={{ width: '5rem' }}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== b.seatsFilled) void run(() => updateBatch(b.id, { seatsFilled: v }));
                      }}
                    />{' '}
                    / {b.seats} ({seatsLeft(b)} left)
                  </td>
                  <td>
                    <select
                      aria-label="Batch status"
                      value={b.status}
                      onChange={(e) =>
                        run(() => updateBatch(b.id, { status: e.target.value as TrainingBatchStatus }))
                      }
                    >
                      {(Object.keys(TRAINING_BATCH_STATUS_LABELS) as TrainingBatchStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {TRAINING_BATCH_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="platform-btn platform-btn-secondary platform-btn-sm"
                      onClick={() => run(() => deleteBatch(b.id), 'Batch removed.')}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="platform-form" onSubmit={addBatch}>
        <h4>Add batch</h4>
        <div className="platform-form-field-pair">
          <div>
            <label htmlFor={`b-start-${course.id}`}>Start date</label>
            <input id={`b-start-${course.id}`} type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`b-end-${course.id}`}>End date (optional)</label>
            <input id={`b-end-${course.id}`} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="platform-form-field-pair">
          <div>
            <label htmlFor={`b-seats-${course.id}`}>Seats</label>
            <input id={`b-seats-${course.id}`} type="number" min={1} required value={seats} onChange={(e) => setSeats(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`b-city-${course.id}`}>City</label>
            <input id={`b-city-${course.id}`} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`b-state-${course.id}`}>State</label>
            <input id={`b-state-${course.id}`} value={state} onChange={(e) => setState(e.target.value)} />
          </div>
        </div>
        <div className="platform-form-actions">
          <button type="submit" className="platform-btn platform-btn-secondary platform-btn-sm">
            Add batch
          </button>
        </div>
      </form>
    </article>
  );
}
