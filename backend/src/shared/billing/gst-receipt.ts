/** HTML payment receipt stub — not a statutory GST tax invoice. */

export type OrderReceiptData = {
  receiptNo: string;
  issuedAt: string;
  buyerCompany: string;
  buyerGstin: string | null;
  vendorCompany: string;
  billingLines: string[];
  subtotalInr: string;
  taxInr: string;
  shippingInr: string;
  totalInr: string;
  paymentStatus: string;
  gatewayPaymentId: string | null;
};

export type SubscriptionReceiptData = {
  receiptNo: string;
  issuedAt: string;
  partnerCompany: string;
  partnerGstin: string | null;
  planName: string;
  billingPeriod: string;
  amountInr: string;
  periodStart: string | null;
  periodEnd: string | null;
  razorpaySubscriptionId: string | null;
};

const DISCLAIMER =
  'This document is a payment acknowledgement stub for your records. It is not a statutory GST tax invoice under Indian law. Contact GarudHub support for formal tax documentation.';

function receiptShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #0f172a; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    .muted { color: #64748b; font-size: 0.875rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    td, th { text-align: left; padding: 0.35rem 0; border-bottom: 1px solid #e2e8f0; }
    .total td { font-weight: 700; border-bottom: none; }
    .disclaimer { margin-top: 2rem; padding: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 0.8125rem; color: #475569; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
${body}
<p class="disclaimer">${escapeHtml(DISCLAIMER)}</p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderOrderReceiptHtml(data: OrderReceiptData): string {
  const lines = data.billingLines
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join('');
  const body = `
  <h1>Order payment receipt (stub)</h1>
  <p class="muted">Receipt ${escapeHtml(data.receiptNo)} · ${escapeHtml(data.issuedAt)}</p>
  <p><strong>Buyer:</strong> ${escapeHtml(data.buyerCompany)}${
    data.buyerGstin ? ` · GSTIN ${escapeHtml(data.buyerGstin)}` : ''
  }</p>
  <p><strong>Vendor:</strong> ${escapeHtml(data.vendorCompany)}</p>
  <ul>${lines}</ul>
  <table>
    <tr><td>Subtotal</td><td>₹${escapeHtml(data.subtotalInr)}</td></tr>
    <tr><td>Tax (as recorded)</td><td>₹${escapeHtml(data.taxInr)}</td></tr>
    <tr><td>Shipping</td><td>₹${escapeHtml(data.shippingInr)}</td></tr>
    <tr class="total"><td>Total</td><td>₹${escapeHtml(data.totalInr)}</td></tr>
  </table>
  <p><strong>Payment status:</strong> ${escapeHtml(data.paymentStatus)}${
    data.gatewayPaymentId
      ? `<br /><span class="muted">Gateway ref: ${escapeHtml(data.gatewayPaymentId)}</span>`
      : ''
  }</p>`;
  return receiptShell(`Order receipt ${data.receiptNo}`, body);
}

export function renderSubscriptionReceiptHtml(
  data: SubscriptionReceiptData,
): string {
  const body = `
  <h1>Partner subscription payment record (stub)</h1>
  <p class="muted">Receipt ${escapeHtml(data.receiptNo)} · ${escapeHtml(data.issuedAt)}</p>
  <p><strong>Partner:</strong> ${escapeHtml(data.partnerCompany)}${
    data.partnerGstin ? ` · GSTIN ${escapeHtml(data.partnerGstin)}` : ''
  }</p>
  <table>
    <tr><th>Plan</th><td>${escapeHtml(data.planName)} (${escapeHtml(data.billingPeriod)})</td></tr>
    <tr><th>Amount</th><td>₹${escapeHtml(data.amountInr)}</td></tr>
    <tr><th>Billing period</th><td>${escapeHtml(data.periodStart ?? '—')} → ${escapeHtml(data.periodEnd ?? '—')}</td></tr>
    ${
      data.razorpaySubscriptionId
        ? `<tr><th>Subscription ref</th><td>${escapeHtml(data.razorpaySubscriptionId)}</td></tr>`
        : ''
    }
  </table>`;
  return receiptShell(`Subscription receipt ${data.receiptNo}`, body);
}
