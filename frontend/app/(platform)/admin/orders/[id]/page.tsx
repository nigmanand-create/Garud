'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { RequireAuth } from '@/components/platform/AuthProvider';
import { AdminSubnav } from '@/components/platform/AdminSubnav';
import { PlatformPageHeader } from '@/components/platform/PlatformPageHeader';
import { StatusBadge } from '@/components/platform/StatusBadge';
import { Button } from '@/components/platform/Button';
import { FormField } from '@/components/platform/FormField';
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
      <>
        <PlatformPageHeader title="Order detail" subtitle="Loading order details…" />
        <AdminSubnav />
        <p className="platform-muted platform-loading-center">Loading order details…</p>
      </>
    );
  }

  return (
    <>
      {order && (
        <PlatformPageHeader
          title={`Order #${order.id}`}
          subtitle={
            <>
              Placed{' '}
              {new Date(order.placedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}{' '}
              · Buyer: {order.buyerOrganization.companyName} · Vendor:{' '}
              {order.vendorOrganization.companyName}
            </>
          }
          backHref="/admin/orders"
          backLabel="Orders oversight"
          badge={
            <span className="platform-status-row--wrap">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.fulfillmentStatus} />
              <StatusBadge status={order.paymentStatus} />
            </span>
          }
        />
      )}
      {!order && !loading && (
        <PlatformPageHeader title="Order detail" backHref="/admin/orders" backLabel="Orders oversight" />
      )}
      <AdminSubnav />

      {error && <div className="platform-card platform-error">{error}</div>}
      {message && <div className="platform-card platform-success">{message}</div>}

      {order && (
        <>
          <div className="mod-spec-grid platform-card--lg">
            <div className="mod-spec-item">
              <div className="mod-spec-label">Order Total</div>
              <div className="mod-spec-val platform-text-success">
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
                {order.lineItems.reduce((acc, cur) => acc + cur.quantity, 0)} units ({order.lineItems.length}{' '}
                lines)
              </div>
            </div>
          </div>

          <div className="platform-admin-detail">
            <div className="platform-stack platform-stack--lg">
              <div className="platform-card platform-card--flush platform-card--lg">
                <div className="platform-card-header">
                  <h2 className="platform-section-heading">Purchased Line Items</h2>
                </div>
                <div className="platform-table-wrap">
                  <table className="platform-table mod-table">
                    <thead>
                      <tr>
                        <th>Item Details</th>
                        <th>Unit Price</th>
                        <th>Qty</th>
                        <th className="platform-table-th-right">Total</th>
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
                          <td className="platform-td-right platform-font-semibold">
                            ₹{Number(li.lineTotalInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="platform-order-summary-footer">
                  <div className="platform-order-summary-row">
                    <span className="platform-muted">Subtotal:</span>
                    <span>₹{Number(order.subtotalInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="platform-order-summary-row">
                    <span className="platform-muted">GST Tax:</span>
                    <span>₹{Number(order.taxInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="platform-order-summary-row">
                    <span className="platform-muted">Shipping & Freight:</span>
                    <span>₹{Number(order.shippingInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="platform-order-summary-row platform-order-summary-row--total">
                    <span>Grand Total:</span>
                    <span className="platform-text-success">
                      ₹{Number(order.totalInr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="platform-card platform-card--lg">
                <h2 className="platform-section-heading">Delivery & Invoicing Addresses</h2>
                <div className="platform-address-panel-grid">
                  <div className="platform-address-panel">
                    <strong className="platform-address-panel__label">Shipping Address & Contact</strong>
                    <div className="platform-address-panel__name">{order.contactName}</div>
                    <div className="platform-address-panel__body">
                      <div>{order.companyName}</div>
                      <div>{order.shippingAddressLine1}</div>
                      {order.shippingAddressLine2 && <div>{order.shippingAddressLine2}</div>}
                      <div>
                        {order.shippingCity}, {order.shippingState} - {order.shippingPincode}
                      </div>
                      <div>{order.shippingCountry}</div>
                      <div className="platform-address-panel__highlight">📞 {order.contactPhone}</div>
                    </div>
                  </div>

                  <div className="platform-address-panel">
                    <strong className="platform-address-panel__label">Billing & GST Registration</strong>
                    <div className="platform-address-panel__name">{order.companyName}</div>
                    <div className="platform-address-panel__body">
                      <div>{order.billingAddressLine1}</div>
                      {order.billingAddressLine2 && <div>{order.billingAddressLine2}</div>}
                      <div>
                        {order.billingCity}, {order.billingState} - {order.billingPincode}
                      </div>
                      <div>{order.billingCountry}</div>
                      {order.gstin && (
                        <div className="platform-address-panel__highlight platform-font-semibold">
                          GSTIN: {order.gstin}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="platform-card platform-card--flush platform-card--lg">
                <div className="platform-card-header-bar">
                  <div className="platform-card-header-bar__text">
                    <h2 className="platform-section-heading">Transaction Records & Escrow Audit</h2>
                    <p className="platform-muted">
                      Audit trail of online gateway attempts and corporate NEFT/RTGS bank wire submissions.
                    </p>
                  </div>
                  <span className="platform-record-count-badge">
                    {order.transactions ? order.transactions.length : 0} Records
                  </span>
                </div>

                {!order.transactions || order.transactions.length === 0 ? (
                  <div className="platform-empty-panel">
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
                          <th className="platform-table-th-right">Reconciliation Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td>
                              <strong className="platform-tx-gateway-title">
                                {tx.gateway === 'RAZORPAY' ? '⚡ Razorpay Gateway' : '🏦 Corporate NEFT/RTGS Wire'}
                              </strong>
                              <span className="platform-tx-sub">{tx.paymentMethod || 'Online'}</span>
                            </td>
                            <td>
                              {tx.utrNumber ? (
                                <div>
                                  <div className="platform-tx-mono">UTR: {tx.utrNumber}</div>
                                  {tx.senderBankName && (
                                    <span className="platform-tx-sub">Sender: {tx.senderBankName}</span>
                                  )}
                                </div>
                              ) : tx.gatewayPaymentId ? (
                                <div className="platform-tx-mono--muted">ID: {tx.gatewayPaymentId}</div>
                              ) : tx.gatewayOrderId ? (
                                <div className="platform-tx-mono--muted">Order: {tx.gatewayOrderId}</div>
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
                                <div className="platform-tx-failure">{tx.failureReason}</div>
                              )}
                            </td>
                            <td className="platform-tx-date">
                              {new Date(tx.createdAt).toLocaleString(undefined, {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="platform-td-right">
                              {tx.status === 'PROCESSING' && tx.gateway === 'BANK_TRANSFER_NEFT_RTGS' ? (
                                <div className="platform-tx-actions">
                                  <Button
                                    size="sm"
                                    onClick={() => handleVerifyUtr(tx.id, 'APPROVE')}
                                    disabled={busy}
                                  >
                                    ✓ Approve UTR
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="platform-text-danger"
                                    onClick={() => handleVerifyUtr(tx.id, 'REJECT')}
                                    disabled={busy}
                                  >
                                    ✕ Reject
                                  </Button>
                                </div>
                              ) : tx.status === 'SUCCESS' ? (
                                <span className="platform-text-success platform-text-success--sm">✓ Settled</span>
                              ) : (
                                <span className="platform-text-faint">—</span>
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

            <div className="platform-admin-detail__sidebar">
              <div className="mod-passport-card">
                <div className="mod-passport-header">
                  <div className="mod-passport-avatar mod-passport-avatar--buyer">
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
                  className="platform-passport-link"
                >
                  Inspect Partner Profile & KYC →
                </Link>
              </div>

              <div className="mod-decision-box">
                <div className="mod-decision-header">
                  <span>⚖</span>
                  <span>Order Settlement & Management</span>
                </div>

                <div className="mod-decision-section">
                  <FormField
                    label="Payment Settlement Status"
                    htmlFor="update-payment-status"
                    hint="Confirm after verifying wire transfer / RTGS transaction in platform bank account."
                  >
                    <div className="platform-form-row-inline">
                      <select
                        id="update-payment-status"
                        value={newPaymentStatus}
                        onChange={(e) => setNewPaymentStatus(e.target.value as PaymentStatus)}
                      >
                        <option value="PENDING">Pending Settlement</option>
                        <option value="PAID">Paid / Verified</option>
                        <option value="REFUNDED">Refunded</option>
                        <option value="FAILED">Payment Failed</option>
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUpdatePayment()}
                        disabled={busy || newPaymentStatus === order.paymentStatus}
                      >
                        {busy ? 'Saving…' : 'Update Payment'}
                      </Button>
                    </div>
                  </FormField>
                </div>

                {order.status !== 'CANCELLED' && (
                  <div className="mod-decision-section">
                    <FormField label="Cancel Order (Dispute / Default Resolution)" htmlFor="cancel-reason">
                      <textarea
                        id="cancel-reason"
                        rows={2}
                        placeholder="Specify reason for cancelling this order…"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </FormField>
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      className="platform-btn-danger-outline"
                      onClick={() => handleCancelOrder()}
                      disabled={busy || !cancelReason.trim()}
                    >
                      {busy ? 'Processing…' : 'Cancel Order on Platform'}
                    </Button>
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
