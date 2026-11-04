import { renderOrderReceiptHtml, renderSubscriptionReceiptHtml } from './gst-receipt';

describe('GST receipt HTML stubs (NEXT-B3)', () => {
  it('renders order receipt with disclaimer', () => {
    const html = renderOrderReceiptHtml({
      receiptNo: 'ABCD1234',
      issuedAt: '4 Nov 2026',
      buyerCompany: 'Buyer Co',
      buyerGstin: '29ABCDE1234F1Z5',
      vendorCompany: 'Vendor Co',
      billingLines: ['Line 1'],
      subtotalInr: '1000.00',
      taxInr: '180.00',
      shippingInr: '0.00',
      totalInr: '1180.00',
      paymentStatus: 'PAID',
      gatewayPaymentId: 'pay_123',
    });
    expect(html).toContain('not a statutory GST tax invoice');
    expect(html).toContain('Buyer Co');
    expect(html).toContain('pay_123');
  });

  it('renders subscription payment record', () => {
    const html = renderSubscriptionReceiptHtml({
      receiptNo: 'SUB001',
      issuedAt: '4 Nov 2026',
      partnerCompany: 'Partner Co',
      partnerGstin: null,
      planName: 'Growth',
      billingPeriod: 'MONTHLY',
      amountInr: '4999.00',
      periodStart: '1 Nov 2026',
      periodEnd: '1 Dec 2026',
      razorpaySubscriptionId: 'sub_abc',
    });
    expect(html).toContain('Partner subscription payment record');
    expect(html).toContain('Growth');
  });
});
