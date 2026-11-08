import { renderOrderReceiptHtml, renderSubscriptionReceiptHtml } from './gst-receipt';

describe('GST receipt HTML (NEXT-B3)', () => {
  it('renders order receipt with HSN and tax columns when rates exist', () => {
    const html = renderOrderReceiptHtml({
      receiptNo: 'ABCD1234',
      issuedAt: '4 Nov 2026',
      buyerCompany: 'Buyer Co',
      buyerGstin: '29ABCDE1234F1Z5',
      vendorCompany: 'Vendor Co',
      vendorGstin: '27AAAAA0000A1Z5',
      billingLines: ['Line 1'],
      lines: [
        {
          description: 'Drone × 1',
          quantity: 1,
          unitPriceInr: '1000.00',
          lineTotalInr: '1180.00',
          hsnCode: '8806',
          gstRatePercent: '18.00',
          taxableValueInr: '1000.00',
          cgstInr: '90.00',
          sgstInr: '90.00',
          igstInr: '0.00',
        },
      ],
      subtotalInr: '1000.00',
      taxInr: '180.00',
      shippingInr: '0.00',
      totalInr: '1180.00',
      paymentStatus: 'PAID',
      gatewayPaymentId: 'pay_123',
      paymentMethodLabel: 'Online / gateway',
    });
    expect(html).toContain('GST receipt — order');
    expect(html).toContain('HSN');
    expect(html).toContain('GST %');
    expect(html).toContain('8806');
    expect(html).not.toContain('IRP');
    expect(html).toContain('Buyer Co');
    expect(html).toContain('pay_123');
  });

  it('renders order receipt without CGST/SGST/IGST columns when no GST rates', () => {
    const html = renderOrderReceiptHtml({
      receiptNo: 'ABCD1234',
      issuedAt: '4 Nov 2026',
      buyerCompany: 'Buyer Co',
      buyerGstin: '29ABCDE1234F1Z5',
      vendorCompany: 'Vendor Co',
      vendorGstin: '27AAAAA0000A1Z5',
      billingLines: ['Line 1'],
      lines: [
        {
          description: 'Part A',
          quantity: 1,
          unitPriceInr: '500.00',
          lineTotalInr: '500.00',
          hsnCode: '8806',
          gstRatePercent: null,
          taxableValueInr: '500.00',
          cgstInr: '0.00',
          sgstInr: '0.00',
          igstInr: '0.00',
        },
      ],
      subtotalInr: '500.00',
      taxInr: '0.00',
      shippingInr: '0.00',
      totalInr: '500.00',
      paymentStatus: 'PAID',
      gatewayPaymentId: null,
      paymentMethodLabel: 'Online / gateway',
    });
    expect(html).not.toContain('CGST');
    expect(html).toContain('8806');
  });

  it('renders subscription receipt with SAC and supplier GSTIN', () => {
    const html = renderSubscriptionReceiptHtml({
      receiptNo: 'SUB001',
      issuedAt: '4 Nov 2026',
      supplierGstin: '27AAAAA0000A1Z5',
      partnerCompany: 'Partner Co',
      partnerGstin: '29ABCDE1234F1Z5',
      planName: 'Growth',
      billingPeriod: 'MONTHLY',
      amountInr: '4999.00',
      taxableValueInr: '4236.44',
      gstRatePercent: '18.00',
      sacCode: '998431',
      cgstInr: '381.28',
      sgstInr: '381.28',
      igstInr: '0.00',
      periodStart: '1 Nov 2026',
      periodEnd: '1 Dec 2026',
      razorpaySubscriptionId: 'sub_abc',
    });
    expect(html).toContain('GST receipt — partner subscription');
    expect(html).toContain('998431');
    expect(html).toContain('Growth');
    expect(html).toContain('Supplier (GarudHub)');
    expect(html).not.toContain('IRP');
  });
});
