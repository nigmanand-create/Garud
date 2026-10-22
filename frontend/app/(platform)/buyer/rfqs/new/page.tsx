'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
} from '@/lib/platform/labels';
import type { CatalogCategory, ListingType } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function NewRfqPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <NewRfqInner />
    </RequireAuth>
  );
}

function NewRfqInner() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'AGRICULTURE_DRONE' as CatalogCategory,
    listingType: '' as ListingType | '',
    quantity: '',
    country: 'India',
    state: '',
    city: '',
    deadlineAt: '',
    payloadCapacityKg: '',
    enduranceMinutes: '',
    isDgcaRequired: false,
    targetBudgetInr: '',
    specsDocumentUrl: '',
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiRequest<{ id: string }>('/rfq', {
        method: 'POST',
        auth: true,
        body: {
          title: form.title,
          description: form.description,
          category: form.category,
          listingType: form.listingType || undefined,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          country: form.country || undefined,
          state: form.state || undefined,
          city: form.city || undefined,
          deadlineAt: form.deadlineAt
            ? new Date(form.deadlineAt).toISOString()
            : undefined,
          payloadCapacityKg: form.payloadCapacityKg
            ? Number(form.payloadCapacityKg)
            : undefined,
          enduranceMinutes: form.enduranceMinutes
            ? Number(form.enduranceMinutes)
            : undefined,
          isDgcaRequired: form.isDgcaRequired,
          targetBudgetInr: form.targetBudgetInr
            ? Number(form.targetBudgetInr)
            : undefined,
          specsDocumentUrl: form.specsDocumentUrl.trim() || undefined,
        },
      });
      router.push(`/buyer/rfqs/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
    }
  }

  return (
    <>
      <PlatformPageHeader
        title="Post Drone Procurement RFQ"
        subtitle="Specify drone technical payload, flight endurance, and DGCA compliance requirements to receive verified vendor proposals."
        backHref="/buyer/rfqs"
        backLabel="My RFQs"
      />
      {error && <div className="platform-card platform-error">{error}</div>}
      <form className="platform-card platform-form" onSubmit={onSubmit}>
        <h3 style={{ marginTop: 0, fontSize: '1.05rem', color: '#0f172a' }}>
          General Procurement Overview
        </h3>
        <label>Title *</label>
        <input
          required
          placeholder="e.g. 10x Heavy-lift Agri Sprayer Drones with RTK"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <label>Detailed Scope of Work / Requirements *</label>
        <textarea
          required
          rows={3}
          placeholder="Describe intended deployment (e.g., spraying acreage, camera payloads, warranty expectations, delivery timeline)..."
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
        <div className="platform-field-row">
          <div>
            <label>Category *</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value as CatalogCategory,
                }))
              }
            >
              {(Object.keys(CATEGORY_LABELS) as CatalogCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Listing type filter</label>
            <select
              value={form.listingType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  listingType: (e.target.value || '') as ListingType | '',
                }))
              }
            >
              <option value="">Any Vendor Type</option>
              {(Object.keys(LISTING_TYPE_LABELS) as ListingType[]).map((t) => (
                <option key={t} value={t}>
                  {LISTING_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Required Quantity</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 5"
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: e.target.value }))
              }
            />
          </div>
        </div>

        {/* Drone Technical & Compliance Specifications */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🛸</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
              Drone Technical & Compliance Specifications
            </h3>
          </div>
          <p className="platform-muted" style={{ fontSize: '0.825rem', marginBottom: '1rem' }}>
            Filter prospective quotes with hard technical parameters for payload, flight time, and certification.
          </p>

          <div className="platform-field-row">
            <div>
              <label>Min. Payload Capacity (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 10 or 16"
                value={form.payloadCapacityKg}
                onChange={(e) =>
                  setForm((f) => ({ ...f, payloadCapacityKg: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Min. Flight Endurance (Minutes)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 35"
                value={form.enduranceMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, enduranceMinutes: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Target Budget (Total INR)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 4500000"
                value={form.targetBudgetInr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetBudgetInr: e.target.value }))
                }
              />
            </div>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <label>Technical Tender Document / Specs URL (PDF or Doc)</label>
            <input
              type="url"
              placeholder="https://.../technical-spec-document.pdf"
              value={form.specsDocumentUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, specsDocumentUrl: e.target.value }))
              }
            />
          </div>

          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              borderRadius: 8,
              background: form.isDgcaRequired ? '#f0fdf4' : '#f8fafc',
              border: form.isDgcaRequired ? '1px solid #86efac' : '1px solid #e2e8f0',
            }}
          >
            <input
              type="checkbox"
              id="isDgcaRequired"
              checked={form.isDgcaRequired}
              onChange={(e) =>
                setForm((f) => ({ ...f, isDgcaRequired: e.target.checked }))
              }
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <label
              htmlFor="isDgcaRequired"
              style={{ margin: 0, fontWeight: 600, color: '#0f172a', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              🇮🇳 Mandatory DGCA Type Certification Required (Compliant with Drone Rules 2021)
            </label>
          </div>
        </div>

        {/* Location & Bidding Deadlines */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: '1.05rem', color: '#0f172a' }}>
            Delivery Location & Proposal Deadline
          </h3>
          <div className="platform-field-row">
            <div>
              <label>Country</label>
              <input
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({ ...f, country: e.target.value }))
                }
              />
            </div>
            <div>
              <label>State</label>
              <input
                placeholder="e.g. Karnataka"
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
              />
            </div>
            <div>
              <label>City</label>
              <input
                placeholder="e.g. Bengaluru"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
              />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <label>Bidding Deadline</label>
            <input
              type="date"
              value={form.deadlineAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, deadlineAt: e.target.value }))
              }
            />
          </div>
        </div>

        <button
          type="submit"
          className="platform-btn platform-btn-cta platform-btn-full"
          style={{ marginTop: '1.5rem', padding: '0.8rem', fontSize: '1rem' }}
        >
          Publish Drone RFQ & Invite Vendors ↗
        </button>
      </form>
    </>
  );
}
