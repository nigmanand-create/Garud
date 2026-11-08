'use client';

import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  createBuyerAddress,
  deleteBuyerAddress,
  fetchBuyerAddresses,
  setDefaultBuyerAddress,
  updateBuyerAddress,
} from '@/lib/api/buyer-addresses';
import { RequireAuth, useAuth } from '@/components/platform/AuthProvider';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { useConfirmDialog } from '@/components/platform/ConfirmDialog';
import type { BuyerAddress } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { reverseGeocode } from '@/lib/geocode/reverse-geocode';

const emptyForm = {
  label: '',
  companyName: '',
  contactName: '',
  contactPhone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
};

const GEOCODE_MIN_INTERVAL_MS = 1100;

type Toast = { kind: 'success' | 'error'; message: string };

export default function BuyerAddressesPage() {
  return (
    <RequireAuth roles={['BUYER', 'GOVERNMENT']}>
      <BuyerAddressesInner />
    </RequireAuth>
  );
}

function BuyerAddressesInner() {
  const { user } = useAuth();
  const [items, setItems] = useState<BuyerAddress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState<Toast | null>(null);
  const [locating, setLocating] = useState(false);
  const lastGeocodeAt = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const showToast = useCallback((kind: Toast['kind'], message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ kind, message });
    toastTimer.current = setTimeout(() => setToast(null), 5200);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchBuyerAddresses();
      setItems(res.addresses);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load addresses');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(a: BuyerAddress) {
    setEditingId(a.id);
    setForm({
      label: a.label,
      companyName: a.companyName,
      contactName: a.contactName,
      contactPhone: a.contactPhone,
      line1: a.line1,
      line2: a.line2 || '',
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      country: a.country || 'India',
    });
    setFormOpen(true);
    setError(null);
  }

  function startNew() {
    setEditingId('new');
    const prefillName = user?.contactPersonName?.trim() || '';
    setForm({ ...emptyForm, contactName: prefillName });
    setFormOpen(true);
    setError(null);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy('save');
    setError(null);
    try {
      if (editingId === 'new') {
        await createBuyerAddress({
          ...form,
          companyName: form.companyName.trim() || undefined,
          line2: form.line2 || undefined,
          isDefault: items.length === 0 ? true : undefined,
        });
        showToast('success', 'Address saved.');
      } else if (editingId && editingId !== 'new') {
        await updateBuyerAddress(editingId, {
          ...form,
          companyName: form.companyName.trim() || undefined,
          line2: form.line2 || undefined,
        });
        showToast('success', 'Address updated.');
      }
      closeForm();
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Save failed';
      setError(msg);
      showToast('error', msg);
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(id: string) {
    const ok = await confirm({
      title: 'Remove address?',
      message: 'This address will be removed from your account.',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      destructive: true,
    });
    if (!ok) return;
    setBusy(id);
    setError(null);
    try {
      await deleteBuyerAddress(id);
      await load();
      showToast('success', 'Address removed.');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Delete failed';
      setError(msg);
      showToast('error', msg);
    } finally {
      setBusy(null);
    }
  }

  async function onSetDefault(id: string) {
    setBusy(id);
    setError(null);
    try {
      await setDefaultBuyerAddress(id);
      await load();
      showToast('success', 'Default delivery address updated.');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not set default';
      setError(msg);
      showToast('error', msg);
    } finally {
      setBusy(null);
    }
  }

  async function useCurrentLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showToast('error', 'Location is not supported in this browser.');
      return;
    }
    const now = Date.now();
    if (now - lastGeocodeAt.current < GEOCODE_MIN_INTERVAL_MS) {
      showToast('error', 'Please wait a moment before trying again.');
      return;
    }

    setLocating(true);
    setError(null);

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          lastGeocodeAt.current = Date.now();
          try {
            const { address } = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            setForm((f) => ({
              ...f,
              line1: address.line1 || f.line1,
              line2: address.line2 ?? f.line2,
              city: address.city !== '—' ? address.city : f.city,
              state: address.state !== '—' ? address.state : f.state,
              pincode: address.pincode !== '—' ? address.pincode : f.pincode,
              country: address.country || f.country || 'India',
            }));
            showToast('success', 'Location applied — review and edit the fields below.');
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not look up address';
            showToast('error', msg);
          } finally {
            setLocating(false);
            resolve();
          }
        },
        (geoErr) => {
          setLocating(false);
          if (geoErr.code === geoErr.PERMISSION_DENIED) {
            showToast('error', 'Location permission denied. Enable it in your browser settings or enter the address manually.');
          } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
            showToast('error', 'Could not determine your position. Try again or enter the address manually.');
          } else if (geoErr.code === geoErr.TIMEOUT) {
            showToast('error', 'Location request timed out. Try again.');
          } else {
            showToast('error', 'Could not get your location.');
          }
          resolve();
        },
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 },
      );
    });
  }

  const addLabel = items.length === 0 ? 'Add new address' : 'Add another location';

  return (
    <>
      <PlatformPageHeader
        title="Saved addresses"
        subtitle="Manage delivery locations like a storefront address book — fast checkout next time."
        backHref="/buyer/cart"
        backLabel="Cart"
      />

      <div className="platform-address-book-shell">
        <p className="platform-muted platform-text-sm platform-mb-md">
          <Link href="/buyer/checkout" className="platform-inline-link">
            Continue to checkout
          </Link>{' '}
          — we’ll prefill your default address.
        </p>

        {error && !formOpen && <div className="platform-card platform-error platform-mb-md">{error}</div>}

        <div className="platform-address-book-toolbar">
          <div>
            <p className="platform-muted platform-text-sm" style={{ margin: 0, maxWidth: '36rem' }}>
              Add labels such as Office or Warehouse. Your default is used first at checkout.
            </p>
          </div>
          <div className="platform-address-book-toolbar__actions">
            <button
              type="button"
              className="platform-btn platform-btn-cta"
              onClick={startNew}
              disabled={Boolean(busy) && busy !== 'save'}
            >
              {addLabel}
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="platform-address-book-empty" aria-live="polite">
            <h2 className="platform-address-book-empty__title">No saved addresses yet</h2>
            <p className="platform-address-book-empty__desc">
              Save where we should deliver orders so checkout stays one tap. You can add more locations anytime.
            </p>
            <div className="platform-address-book-empty__actions">
              <button type="button" className="platform-btn platform-btn-cta" onClick={startNew}>
                Add new address
              </button>
            </div>
          </div>
        ) : (
          <ul className="platform-address-book-list">
            {items.map((a) => (
              <li
                key={a.id}
                className={`platform-card platform-address-book-card${a.isDefault ? ' platform-address-book-card--default' : ''}`}
              >
                <div className="platform-address-book-card__head">
                  <div className="platform-address-book-card__label-row">
                    <h3 className="platform-address-book-card__label">{a.label}</h3>
                    {a.isDefault && (
                      <span className="platform-address-book-badge-default">Default</span>
                    )}
                  </div>
                  <div className="platform-address-book-card__actions">
                    {!a.isDefault && (
                      <button
                        type="button"
                        className="platform-btn platform-btn-secondary platform-btn-sm"
                        disabled={busy === a.id}
                        onClick={() => onSetDefault(a.id)}
                      >
                        Set as default
                      </button>
                    )}
                    <button
                      type="button"
                      className="platform-btn platform-btn-secondary platform-btn-sm"
                      disabled={Boolean(busy)}
                      onClick={() => startEdit(a)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="platform-link-btn"
                      disabled={busy === a.id}
                      onClick={() => onDelete(a.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="platform-address-book-card__meta">
                  {a.contactName}
                  {a.companyName.trim() ? (
                    <>
                      <span aria-hidden> · </span>
                      {a.companyName.trim()}
                    </>
                  ) : null}
                </p>
                <p className="platform-address-book-card__lines">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ''}
                  <br />
                  {a.city}, {a.state} — {a.pincode}
                  <br />
                  {a.country}
                </p>
                <div className="platform-address-book-card__phone">
                  <span aria-hidden>☎</span>
                  <a href={`tel:${a.contactPhone.replace(/\s/g, '')}`} className="platform-inline-link">
                    {a.contactPhone}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen && editingId && (
        <AddressFormModal
          mode={editingId === 'new' ? 'new' : 'edit'}
          form={form}
          setForm={setForm}
          busy={busy === 'save'}
          locating={locating}
          error={error}
          onSubmit={onSubmit}
          onClose={closeForm}
          onUseLocation={useCurrentLocation}
        />
      )}

      {toast && <ToastBanner toast={toast} onDismiss={() => setToast(null)} />}
      {confirmDialog}
    </>
  );
}

type AddressFormModalProps = {
  mode: 'new' | 'edit';
  form: typeof emptyForm;
  setForm: Dispatch<SetStateAction<typeof emptyForm>>;
  busy: boolean;
  locating: boolean;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
  onUseLocation: () => void;
};

function AddressFormModal({
  mode,
  form,
  setForm,
  busy,
  locating,
  error,
  onSubmit,
  onClose,
  onUseLocation,
}: AddressFormModalProps) {
  const titleId = useId();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [busy, onClose]);

  const modal = (
    <div
      className="platform-address-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="platform-card platform-address-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="platform-address-modal-panel__header">
          <div>
            <h2 id={titleId} className="platform-address-modal-panel__title">
              {mode === 'new' ? 'Add address' : 'Edit address'}
            </h2>
            <p className="platform-address-modal-panel__subtitle">
              {mode === 'new'
                ? 'Use current location to prefill street and locality, then adjust as needed.'
                : 'Update details and save — your checkout picks will stay in sync.'}
            </p>
          </div>
          <button
            type="button"
            className="platform-modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="platform-card platform-error platform-mb-md" style={{ padding: '0.65rem 0.85rem' }}>
            {error}
          </div>
        )}

        <form className="platform-form platform-address-modal-body" onSubmit={onSubmit}>
          <div className="platform-address-location-row">
            <button
              type="button"
              className="platform-btn platform-btn-secondary platform-btn-sm"
              onClick={onUseLocation}
              disabled={busy || locating}
            >
              {locating ? 'Getting location…' : 'Use current location'}
            </button>
            <span className="platform-muted platform-text-sm">
              Fills street and city from your device; you stay in control of the final text.
            </span>
          </div>

          <label htmlFor="addr-label">Label</label>
          <input
            id="addr-label"
            placeholder="e.g. Office, Warehouse, Home"
            required
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />

          <label htmlFor="addr-company">Company / organization (optional)</label>
          <input
            id="addr-company"
            placeholder="Leave blank for personal delivery"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            aria-describedby="addr-company-hint"
          />
          <p id="addr-company-hint" className="platform-muted platform-text-sm" style={{ marginTop: '-0.35rem' }}>
            For business deliveries, add the organization name; individuals can leave this empty.
          </p>

          <label htmlFor="addr-contact">Contact name</label>
          <input
            id="addr-contact"
            required
            value={form.contactName}
            onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
          />

          <label htmlFor="addr-phone">Phone</label>
          <input
            id="addr-phone"
            required
            inputMode="tel"
            autoComplete="tel"
            value={form.contactPhone}
            onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
          />

          <label htmlFor="addr-line1">Address line 1</label>
          <input
            id="addr-line1"
            required
            autoComplete="street-address"
            value={form.line1}
            onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
          />

          <label htmlFor="addr-line2">Address line 2 (optional)</label>
          <input
            id="addr-line2"
            value={form.line2}
            onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
          />

          <div className="platform-field-row">
            <div className="platform-field">
              <label htmlFor="addr-city">City</label>
              <input
                id="addr-city"
                required
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="platform-field">
              <label htmlFor="addr-state">State</label>
              <input
                id="addr-state"
                required
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              />
            </div>
          </div>

          <div className="platform-field-row">
            <div className="platform-field">
              <label htmlFor="addr-pin">Pincode</label>
              <input
                id="addr-pin"
                required
                inputMode="numeric"
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
              />
            </div>
            <div className="platform-field">
              <label htmlFor="addr-country">Country</label>
              <input
                id="addr-country"
                required
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>
          </div>

          <div className="platform-address-modal-footer">
            <div className="platform-form-actions" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="platform-btn platform-btn-secondary"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button type="submit" className="platform-btn platform-btn-cta" disabled={busy}>
                {busy ? 'Saving…' : 'Save address'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

function ToastBanner({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="platform-toast-host" role="status">
      <div className={`platform-toast platform-toast--${toast.kind}`}>
        <span>{toast.message}</span>
        <button type="button" className="platform-toast__dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>,
    document.body,
  );
}
