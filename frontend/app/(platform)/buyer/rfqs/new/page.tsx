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
        title="Post RFQ"
        subtitle="Describe what you need — verified vendors in matching categories will be invited."
        backHref="/buyer/rfqs"
        backLabel="My RFQs"
      />
      {error && <div className="platform-card platform-error">{error}</div>}
      <form className="platform-card platform-form" onSubmit={onSubmit}>
        <label>Title</label>
        <input
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <label>Description</label>
        <textarea
          required
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
        <label>Category</label>
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
        <label>Listing type (optional filter for vendors)</label>
        <select
          value={form.listingType}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              listingType: (e.target.value || '') as ListingType | '',
            }))
          }
        >
          <option value="">Any</option>
          {(Object.keys(LISTING_TYPE_LABELS) as ListingType[]).map((t) => (
            <option key={t} value={t}>
              {LISTING_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <label>Quantity</label>
        <input
          type="number"
          min={1}
          value={form.quantity}
          onChange={(e) =>
            setForm((f) => ({ ...f, quantity: e.target.value }))
          }
        />
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
              value={form.state}
              onChange={(e) =>
                setForm((f) => ({ ...f, state: e.target.value }))
              }
            />
          </div>
          <div>
            <label>City</label>
            <input
              value={form.city}
              onChange={(e) =>
                setForm((f) => ({ ...f, city: e.target.value }))
              }
            />
          </div>
        </div>
        <label>Deadline</label>
        <input
          type="date"
          value={form.deadlineAt}
          onChange={(e) =>
            setForm((f) => ({ ...f, deadlineAt: e.target.value }))
          }
        />
        <button type="submit" className="platform-btn platform-btn-full">
          Post RFQ
        </button>
      </form>
    </>
  );
}
