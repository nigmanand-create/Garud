/** GST-ready HTML receipt (supply details; not an e-invoice under notified e-invoicing rules). */

export type OrderReceiptLine = {
  description: string;
  quantity: number;
  unitPriceInr: string;
  lineTotalInr: string;
  hsnCode?: string | null;
  gstRatePercent?: string | null;
  taxableValueInr?: string | null;
  cgstInr?: string;
  sgstInr?: string;
  igstInr?: string;
};

export type OrderReceiptData = {
  receiptNo: string;
  issuedAt: string;
  buyerCompany: string;
  buyerGstin: string | null;
  vendorCompany: string;
  vendorGstin: string | null;
  billingLines: string[];
  lines: OrderReceiptLine[];
  subtotalInr: string;
  taxInr: string;
  shippingInr: string;
  totalInr: string;
  paymentStatus: string;
  gatewayPaymentId: string | null;
  paymentMethodLabel: string;
};

export type SubscriptionReceiptData = {
  receiptNo: string;
  issuedAt: string;
  supplierGstin: string;
  partnerCompany: string;
  partnerGstin: string;
  planName: string;
  billingPeriod: string;
  amountInr: string;
  taxableValueInr: string;
  gstRatePercent: string;
  sacCode: string;
  cgstInr: string;
  sgstInr: string;
  igstInr: string;
  periodStart: string | null;
  periodEnd: string | null;
  razorpaySubscriptionId: string | null;
};

const FOOTNOTE =
  'Computer-generated supply record from GarudHub. Particulars reflect listing and checkout data captured on the platform.';

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
    td, th { text-align: left; padding: 0.35rem 0; border-bottom: 1px solid #e2e8f0; font-size: 0.875rem; }
    th { font-weight: 600; color: #475569; }
    .num { text-align: right; }
    .total td { font-weight: 700; border-bottom: none; }
    .disclaimer { margin-top: 2rem; padding: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 0.8125rem; color: #475569; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
${body}
<p class="disclaimer">${escapeHtml(FOOTNOTE)}</p>
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

function parseMoney(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function lineShowsTaxBreakdown(l: OrderReceiptLine): boolean {
  const hasRate =
    l.gstRatePercent != null &&
    l.gstRatePercent.length > 0 &&
    parseMoney(l.gstRatePercent) > 0;
  if (hasRate) return true;
  return (
    parseMoney(l.cgstInr ?? '0') +
      parseMoney(l.sgstInr ?? '0') +
      parseMoney(l.igstInr ?? '0') >
    0
  );
}

export function renderOrderReceiptHtml(data: OrderReceiptData): string {
  const addrLines = data.billingLines
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join('');
  const anyLineTax = data.lines.some(lineShowsTaxBreakdown);
  const colspanMain = anyLineTax ? 10 : 6;

  const lineRows = data.lines
    .map((l) => {
      const hsnDisp = escapeHtml(l.hsnCode ?? '');
      const showTax = lineShowsTaxBreakdown(l);
      if (!anyLineTax) {
        return `<tr>
  <td>${escapeHtml(l.description)}</td>
  <td class="num">${l.quantity}</td>
  <td class="num">₹${escapeHtml(l.unitPriceInr)}</td>
  <td>${hsnDisp}</td>
  <td class="num">₹${escapeHtml(l.lineTotalInr)}</td>
</tr>`;
      }
      const rateDisp =
        l.gstRatePercent && l.gstRatePercent.length
          ? `${escapeHtml(l.gstRatePercent)}%`
          : '—';
      const taxableDisp =
        l.taxableValueInr && l.taxableValueInr.length
          ? escapeHtml(l.taxableValueInr)
          : '—';
      const cgst = showTax ? escapeHtml(l.cgstInr ?? '0.00') : '—';
      const sgst = showTax ? escapeHtml(l.sgstInr ?? '0.00') : '—';
      const igst = showTax ? escapeHtml(l.igstInr ?? '0.00') : '—';
      return `<tr>
  <td>${escapeHtml(l.description)}</td>
  <td class="num">${l.quantity}</td>
  <td class="num">₹${escapeHtml(l.unitPriceInr)}</td>
  <td>${hsnDisp}</td>
  <td class="num">${rateDisp}</td>
  <td class="num">${taxableDisp}</td>
  <td class="num">${cgst}</td>
  <td class="num">${sgst}</td>
  <td class="num">${igst}</td>
  <td class="num">₹${escapeHtml(l.lineTotalInr)}</td>
</tr>`;
    })
    .join('\n');

  const headerRow = anyLineTax
    ? `<tr>
      <th>Item</th>
      <th class="num">Qty</th>
      <th class="num">Unit (₹)</th>
      <th>HSN</th>
      <th class="num">GST %</th>
      <th class="num">Taxable (₹)</th>
      <th class="num">CGST (₹)</th>
      <th class="num">SGST (₹)</th>
      <th class="num">IGST (₹)</th>
      <th class="num">Line total (₹)</th>
    </tr>`
    : `<tr>
      <th>Item</th>
      <th class="num">Qty</th>
      <th class="num">Unit (₹)</th>
      <th>HSN</th>
      <th class="num">Line total (₹)</th>
    </tr>`;

  const body = `
  <h1>GST receipt — order</h1>
  <p class="muted">Receipt ${escapeHtml(data.receiptNo)} · ${escapeHtml(data.issuedAt)}</p>
  <p><strong>Buyer:</strong> ${escapeHtml(data.buyerCompany)} · GSTIN ${escapeHtml(data.buyerGstin ?? '')}</p>
  <p><strong>Seller:</strong> ${escapeHtml(data.vendorCompany)} · GSTIN ${escapeHtml(data.vendorGstin ?? '')}</p>
  <p class="muted">Place of supply / billing address</p>
  <ul>${addrLines}</ul>
  <table>
    ${headerRow}
    ${lineRows}
    <tr><td colspan="${colspanMain}" style="border:none;height:0.25rem"></td></tr>
    <tr><td colspan="${colspanMain - 1}">Taxable value / subtotal (as recorded)</td><td class="num">₹${escapeHtml(data.subtotalInr)}</td></tr>${
      parseMoney(data.taxInr) > 0
        ? `<tr><td colspan="${colspanMain - 1}">GST (CGST + SGST + IGST)</td><td class="num">₹${escapeHtml(data.taxInr)}</td></tr>`
        : ''
    }
    <tr><td colspan="${colspanMain - 1}">Shipping</td><td class="num">₹${escapeHtml(data.shippingInr)}</td></tr>
    <tr class="total"><td colspan="${colspanMain - 1}">Total</td><td class="num">₹${escapeHtml(data.totalInr)}</td></tr>
  </table>
  <p><strong>Payment:</strong> ${escapeHtml(data.paymentMethodLabel)} · <strong>Status:</strong> ${escapeHtml(data.paymentStatus)}${
    data.gatewayPaymentId
      ? `<br /><span class="muted">Gateway ref: ${escapeHtml(data.gatewayPaymentId)}</span>`
      : ''
  }</p>`;
  return receiptShell(`Order receipt ${data.receiptNo}`, body);
}

export function renderSubscriptionReceiptHtml(
  data: SubscriptionReceiptData,
): string {
  const showTax =
    parseMoney(data.cgstInr) + parseMoney(data.sgstInr) + parseMoney(data.igstInr) >
      0 || parseMoney(data.gstRatePercent) > 0;
  const taxTable = showTax
    ? `<table>
    <tr>
      <th>Description</th>
      <th class="num">Taxable (₹)</th>
      <th class="num">GST %</th>
      <th class="num">CGST (₹)</th>
      <th class="num">SGST (₹)</th>
      <th class="num">IGST (₹)</th>
      <th class="num">Total (₹)</th>
    </tr>
    <tr>
      <td>${escapeHtml(data.planName)} — platform subscription (${escapeHtml(data.billingPeriod)}) · SAC ${escapeHtml(data.sacCode)}</td>
      <td class="num">₹${escapeHtml(data.taxableValueInr)}</td>
      <td class="num">${escapeHtml(data.gstRatePercent)}%</td>
      <td class="num">${escapeHtml(data.cgstInr)}</td>
      <td class="num">${escapeHtml(data.sgstInr)}</td>
      <td class="num">${escapeHtml(data.igstInr)}</td>
      <td class="num">₹${escapeHtml(data.amountInr)}</td>
    </tr>
  </table>`
    : `<table>
    <tr><th>Description</th><td>${escapeHtml(data.planName)} — platform subscription (${escapeHtml(data.billingPeriod)}) · SAC ${escapeHtml(data.sacCode)}</td></tr>
    <tr><th>Line total</th><td>₹${escapeHtml(data.amountInr)}</td></tr>
  </table>`;

  const body = `
  <h1>GST receipt — partner subscription</h1>
  <p class="muted">Receipt ${escapeHtml(data.receiptNo)} · ${escapeHtml(data.issuedAt)}</p>
  <p><strong>Supplier (GarudHub):</strong> GSTIN ${escapeHtml(data.supplierGstin)}</p>
  <p><strong>Recipient:</strong> ${escapeHtml(data.partnerCompany)} · GSTIN ${escapeHtml(data.partnerGstin)}</p>
  <p class="muted">Billing period</p>
  <p>${escapeHtml(data.periodStart ?? '—')} → ${escapeHtml(data.periodEnd ?? '—')}</p>
  ${taxTable}
  ${
    data.razorpaySubscriptionId
      ? `<p class="muted">Subscription ref: ${escapeHtml(data.razorpaySubscriptionId)}</p>`
      : ''
  }`;
  return receiptShell(`Subscription receipt ${data.receiptNo}`, body);
}
