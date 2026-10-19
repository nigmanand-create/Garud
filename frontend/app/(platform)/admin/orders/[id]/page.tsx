'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { StatusBadge } from '@/components/platform/StatusBadge';
import type { AdminOrderDetail, PaymentStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { ACCOUNT_TYPE_LABELS, CATEGORY_LABELS, formatEnumLabel } from '@/lib/platform/labels';
import { adminVerifyUtr } from '@/lib/api/payments';

export default function AdminOrderDetailPage() {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']}>
      <OrderDetailInner />
    </RequireAuth>
  );
}

function OrderDetailInner() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Actions
  const [newPaymentStatus, setNewPaymentStatus] = useState<PaymentStatus>('PAID');
  const [cancelReason, setCancelReason] = useState('');

  async function handleVerifyUtr(transactionId: string, action: 'APPROVE' | 'REJECT') {
    let reason: string | undefined;
    if (action === 'REJECT') {
      const promptReason = window.prompt('Specify reason for rejecting this UTR:');
      if (!promptReason) return;
      reason = promptReason;
    }
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await adminVerifyUtr({ transactionId, action, rejectionReason: reason });
      setMessage(res.message);
      loadOrder();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  function loadOrder() {
    setLoading(true);
    apiRequest<AdminOrderDetail>(`/admin/orders/${id}`, { auth: true })
      .then((res) => {
        setOrder(res);
        setNewPaymentStatus(res.paymentStatus);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Order not found');
        setLoading(false);
      });
  }

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function handleUpdatePayment(e?: FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await apiRequest(`/admin/orders/${id}/payment`, {
        method: 'POST',
        auth: true,
        body: { paymentStatus: newPaymentStatus },
      });
      setMessage(`Payment status successfully updated to ${formatEnumLabel(newPaymentStatus)}.`);
      loadOrder();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update payment status');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelOrder(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancelling this order.');
      return;
    }
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await apiRequest(`/admin/orders/${id}/cancel`, {
        method: 'POST',
        auth: true,
        body: { reason: cancelReason.trim() },
      });
      setMessage('Order has been cancelled.');
      setCancelReason('');
      loadOrder();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to cancel order');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !order) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p className="platform-muted">Loading order details…</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <Link
          href="/admin/orders"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'var(--platform-accent, #2f5233)',
          }}
        >
          ← Back to Orders Oversight
        </Link>
      </div>

      {error && <div className="platform-card platform-error">{error}</div>}
      {message && <div className="platform-card platform-success">{message}</div>}

      {order && (
        <>
          {/* Order Hero Header */}
          <div className="mod-detail-hero">
            <div className="mod-detail-header-row">
              <div className="mod-detail-title-cluster">
                <h1>Order #{order.id}</h1>
                <p>
                  Placed on{' '}
                  <strong>
                    {new Date(order.placedAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </strong>{' '}
                  · Buyer: <strong>{order.buyerOrganization.companyName}</strong> · Vendor:{' '}
                  <strong>{order.vendorOrganization.companyName}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusBadge status={order.status} />
                <StatusBadge status={order.fulfillmentStatus} />
                <StatusBadge status={order.paymentStatus} />
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mod-spec-grid">
              <div className="mod-spec-item">
                <div className="mod-spec-label">Order Total</div>
                <div className="mod-spec-val" style={{ color: '#15803d' }}>
                  ₹{Number(order.totalInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="mod-spec-item">
                <div className="mod-spec-label">PO Number</div>
                <div className="mod-spec-val">{order.purchaseOrderNumber || 'None / Direct'}</div>
              </div>
              <div className="mod-spec-item">
                <div className="mod-spec-label">GSTIN</div>
                <div className="mod-spec-val">{order.gstin || 'Unspecified'}</div>
              </div>
              <div className="mod-spec-item">
                <div className="mod-spec-label">Items Count</div>
                <div className="mod-spec-val">
                  {order.lineItems.reduce((acc, cur) => acc + cur.quantity, 0)} units ({order.lineItems.length} lines)
                </div>
              </div>
            </div>
          </div>

          {/* Main Inspection Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {/* Left: Line Items & Addresses */}
            <div>
              {/* Line Items Card */}
              <div className="platform-card" style={{ marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.25rem 0.75rem' }}>
                  <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Purchased Line Items</h2>
                </div>
                <div className="platform-table-wrap">
                  <table className="platform-table mod-table">
                    <thead>
                      <tr>
                        <th>Item Details</th>
                        <th>Unit Price</th>
                        <th>Qty</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.lineItems.map((li) => (
                        <tr key={li.id}>
                          <td>
                            <div className="mod-listing-cell">
                              {li.listing?.primaryImageUrl ? (
                                <img
                                  src={li.listing.primaryImageUrl}
                                  alt={li.snapshotName}
                                  className="mod-listing-thumb"
                                />
                              ) : (
                                <div className="mod-listing-thumb-placeholder">✦</div>
                              )}
                              <div className="mod-listing-meta">
                                <div className="mod-listing-title">{li.snapshotName}</div>
                                <div className="mod-listing-sub">
                                  {li.snapshotSku && <span className="mod-sku-badge">{li.snapshotSku}</span>}
                                  {li.listing?.category && (
                                    <span> · {CATEGORY_LABELS[li.listing.category]}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>₹{Number(li.unitPriceInr).toLocaleString('en-IN')}</td>
                          <td>
                            <strong>{li.quantity}</strong>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            ₹{Number(li.lineTotalInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                <div
                  style={{
                    padding: '1.25rem',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    alignItems: 'flex-end',
                  }}
                >
                  <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
                    <span className="platform-muted">Subtotal:</span>
                    <span>₹{Number(order.subtotalInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
                    <span className="platform-muted">GST Tax:</span>
                    <span>₹{Number(order.taxInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
                    <span className="platform-muted">Shipping & Freight:</span>
                    <span>₹{Number(order.shippingInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '2rem',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginTop: '0.5rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid #cbd5e1',
                    }}
                  >
                    <span>Grand Total:</span>
                    <span style={{ color: '#15803d' }}>
                      ₹{Number(order.totalInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shipping & Billing Addresses Card */}
              <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '1rem' }}>
                  Delivery & Invoicing Addresses
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {/* Shipping */}
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Shipping Address & Contact
                    </strong>
                    <div style={{ fontWeight: 600 }}>{order.contactName}</div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 2 }}>
                      <div>{order.companyName}</div>
                      <div>{order.shippingAddressLine1}</div>
                      {order.shippingAddressLine2 && <div>{order.shippingAddressLine2}</div>}
                      <div>
                        {order.shippingCity}, {order.shippingState} - {order.shippingPincode}
                      </div>
                      <div>{order.shippingCountry}</div>
                      <div style={{ marginTop: '0.5rem', color: '#0f172a' }}>
                        📞 {order.contactPhone}
                      </div>
                    </div>
                  </div>

                  {/* Billing */}
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Billing & GST Registration
                    </strong>
                    <div style={{ fontWeight: 600 }}>{order.companyName}</div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 2 }}>
                      <div>{order.billingAddressLine1}</div>
                      {order.billingAddressLine2 && <div>{order.billingAddressLine2}</div>}
                      <div>
                        {order.billingCity}, {order.billingState} - {order.billingPincode}
                      </div>
                      <div>{order.billingCountry}</div>
                      {order.gstin && (
                        <div style={{ marginTop: '0.5rem', fontWeight: 600, color: '#0f172a' }}>
                          GSTIN: {order.gstin}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Transactions & Bank Reconciliation Card */}
              <div className="platform-card" style={{ marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Transaction Records & Escrow Audit</h2>
                    <p className="platform-muted" style={{ margin: '0.2rem 0 0', fontSize: '0.8rem' }}>
                      Audit trail of online gateway attempts and corporate NEFT/RTGS bank wire submissions.
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      background: '#e2e8f0',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontWeight: 600,
                    }}
                  >
                    {order.transactions ? order.transactions.length : 0} Records
                  </span>
                </div>

                {!order.transactions || order.transactions.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    No payment transactions initiated yet. Buyer placed order with offline/pay-later terms.
                  </div>
                ) : (
                  <div className="platform-table-wrap">
                    <table className="platform-table mod-table">
                      <thead>
                        <tr>
                          <th>Gateway & Method</th>
                          <th>Reference / UTR</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th style={{ textAlign: 'right' }}>Reconciliation Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td>
                              <strong style={{ display: 'block', fontSize: '0.85rem' }}>
                                {tx.gateway === 'RAZORPAY' ? '⚡ Razorpay Gateway' : '🏦 Corporate NEFT/RTGS Wire'}
                              </strong>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {tx.paymentMethod || 'Online'}
                              </span>
                            </td>
                            <td>
                              {tx.utrNumber ? (
                                <div>
                                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                                    UTR: {tx.utrNumber}
                                  </div>
                                  {tx.senderBankName && (
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                      Sender: {tx.senderBankName}
                                    </span>
                                  )}
                                </div>
                              ) : tx.gatewayPaymentId ? (
                                <div style={{ fontFamily: 'monospace', fontSize: '0.825rem' }}>
                                  ID: {tx.gatewayPaymentId}
                                </div>
                              ) : tx.gatewayOrderId ? (
                                <div style={{ fontFamily: 'monospace', fontSize: '0.825rem', color: '#64748b' }}>
                                  Order: {tx.gatewayOrderId}
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              <strong>₹{Number(tx.amountInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            </td>
                            <td>
                              <StatusBadge status={tx.status} />
                              {tx.failureReason && (
                                <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: 2 }}>
                                  {tx.failureReason}
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {new Date(tx.createdAt).toLocaleString(undefined, {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {tx.status === 'PROCESSING' && tx.gateway === 'BANK_TRANSFER_NEFT_RTGS' ? (
                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyUtr(tx.id, 'APPROVE')}
                                    disabled={busy}
                                    className="platform-btn platform-btn--primary"
                                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                                  >
                                    ✓ Approve UTR
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyUtr(tx.id, 'REJECT')}
                                    disabled={busy}
                                    className="platform-btn platform-btn--secondary"
                                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', color: '#b91c1c' }}
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              ) : tx.status === 'SUCCESS' ? (
                                <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                                  ✓ Settled
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Buyer Dossier, Vendor Dossier & Operational Controls */}
            <div>
              {/* Buyer Dossier */}
              <div className="mod-passport-card">
                <div className="mod-passport-header">
                  <div className="mod-passport-avatar" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
                    {order.buyerOrganization.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="mod-passport-company">{order.buyerOrganization.companyName}</div>
                    <div className="mod-passport-account-type">
                      Buyer Tier: {ACCOUNT_TYPE_LABELS[order.buyerUser.accountType] || order.buyerUser.accountType}
                    </div>
                  </div>
                </div>

                <div className="mod-passport-grid">
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Buyer Email:</span>
                    <span className="mod-passport-row-val">{order.buyerUser.email}</span>
                  </div>
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Contact Person:</span>
                    <span className="mod-passport-row-val">{order.contactName}</span>
                  </div>
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Phone:</span>
                    <span className="mod-passport-row-val">{order.contactPhone}</span>
                  </div>
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Location:</span>
                    <span className="mod-passport-row-val">
                      {[order.buyerOrganization.city, order.buyerOrganization.state, order.buyerOrganization.country]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vendor Dossier */}
              <div className="mod-passport-card">
                <div className="mod-passport-header">
                  <div className="mod-passport-avatar">
                    {order.vendorOrganization.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="mod-passport-company">{order.vendorOrganization.companyName}</div>
                    <div className="mod-passport-account-type">
                      KYC Status: <StatusBadge status={order.vendorOrganization.verificationStatus} />
                    </div>
                  </div>
                </div>

                <div className="mod-passport-grid">
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Vendor Email:</span>
                    <span className="mod-passport-row-val">{order.vendorOrganization.contactEmail}</span>
                  </div>
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Vendor Mobile:</span>
                    <span className="mod-passport-row-val">{order.vendorOrganization.contactMobile}</span>
                  </div>
                  <div className="mod-passport-row">
                    <span className="mod-passport-row-label">Fulfillment Status:</span>
                    <span className="mod-passport-row-val">
                      <StatusBadge status={order.fulfillmentStatus} />
                    </span>
                  </div>
                </div>

                <Link
                  href={`/admin/applications/${order.vendorOrganization.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.45rem',
                    borderRadius: 6,
                    background: '#f1f5f9',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--platform-accent, #2f5233)',
                    textDecoration: 'none',
                  }}
                >
                  Inspect Partner Profile & KYC →
                </Link>
              </div>

              {/* Admin Operational Actions Box */}
              <div className="mod-decision-box">
                <div className="mod-decision-header">
                  <span>⚖</span>
                  <span>Order Settlement & Management</span>
                </div>

                {/* Update Payment Settlement Status */}
                <div className="mod-decision-section">
                  <label htmlFor="update-payment-status" style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Payment Settlement Status
                  </label>
                  <p className="platform-muted" style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                    Confirm after verifying wire transfer / RTGS transaction in platform bank account.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      id="update-payment-status"
                      value={newPaymentStatus}
                      onChange={(e) => setNewPaymentStatus(e.target.value as PaymentStatus)}
                      style={{ flex: 1, height: 38 }}
                    >
                      <option value="PENDING">Pending Settlement</option>
                      <option value="PAID">Paid / Verified</option>
                      <option value="REFUNDED">Refunded</option>
                      <option value="FAILED">Payment Failed</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleUpdatePayment()}
                      className="platform-btn platform-btn--primary"
                      disabled={busy || newPaymentStatus === order.paymentStatus}
                      style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    >
                      {busy ? 'Saving…' : 'Update Payment'}
                    </button>
                  </div>
                </div>

                {/* Cancel Order Action */}
                {order.status !== 'CANCELLED' && (
                  <div className="mod-decision-section">
                    <label htmlFor="cancel-reason" style={{ fontSize: '0.825rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                      Cancel Order (Dispute / Default Resolution)
                    </label>
                    <textarea
                      id="cancel-reason"
                      rows={2}
                      placeholder="Specify reason for cancelling this order…"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      style={{ width: '100%', marginBottom: '0.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleCancelOrder()}
                      className="platform-btn platform-btn--secondary"
                      disabled={busy || !cancelReason.trim()}
                      style={{ width: '100%', color: '#b91c1c', borderColor: '#fca5a5' }}
                    >
                      {busy ? 'Processing…' : 'Cancel Order on Platform'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
