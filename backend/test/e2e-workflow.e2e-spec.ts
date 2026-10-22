import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

interface AuthLoginResponse {
  accessToken: string;
}

interface MarketplaceListingItem {
  id: string;
  name: string;
  priceInr: number | null;
  priceOnRequest: boolean;
  category: string;
}

interface PlaceOrderResponse {
  id: string;
  status: string;
  paymentStatus: string;
}

interface SubmitUtrResponse {
  transaction: {
    id: string;
    utrNumber: string;
    status: string;
  };
}

interface CreateRfqResponse {
  id: string;
  _count: {
    invites: number;
  };
}

interface FulfillmentResponse {
  fulfillmentStatus: string;
}

interface QuotationResponse {
  id: string;
  priceInr: string | number;
}

interface AdminVerifyUtrResponse {
  success: boolean;
  transactionStatus: string;
}

interface AdminOrderResponse {
  paymentStatus: string;
  status: string;
  fulfillmentStatus: string;
}

describe('Full Marketplace & RFQ E2E Workflow (TASK-004 & TASK-005)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete the entire multi-role lifecycle (Buyer -> Partner -> Admin)', async () => {
    const server = app.getHttpServer();

    // 1. Buyer Login
    const buyerLoginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'buyer@garudhub.local', password: 'ChangeMeDemo123!' })
      .expect(200);

    const buyerData = buyerLoginRes.body as AuthLoginResponse;
    const buyerToken = buyerData.accessToken;
    expect(buyerToken).toBeDefined();

    // 2. Fetch Marketplace Listings
    const marketplaceRes = await request(server)
      .get('/api/v1/marketplace/listings')
      .expect(200);

    const listings = marketplaceRes.body as MarketplaceListingItem[];
    const pricedItem = listings.find((l) => l.priceInr && !l.priceOnRequest);
    expect(pricedItem).toBeDefined();
    const listingId = pricedItem!.id;

    // 3. Clear cart and add item
    await request(server)
      .delete('/api/v1/buyer/cart')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    await request(server)
      .post('/api/v1/buyer/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId, quantity: 1 })
      .expect(201);

    // 4. Place Order via Checkout
    const placeOrderRes = await request(server)
      .post('/api/v1/buyer/checkout/place')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        shipping: {
          companyName: 'Demo Buyer Enterprise',
          contactName: 'Procurement Lead',
          contactPhone: '+91 98765 43210',
          addressLine1: 'Phase 2 Aerospace Hub',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560066',
          country: 'India',
        },
        billingSameAsShipping: true,
      })
      .expect(201);

    const orderData = placeOrderRes.body as PlaceOrderResponse;
    const orderId = orderData.id;
    expect(orderId).toBeDefined();
    expect(orderData.status).toBe('CONFIRMED');
    expect(orderData.paymentStatus).toBe('PENDING');

    // 5. Submit Bank Transfer UTR
    const uniqueUtr = `E2E${Date.now().toString().slice(-9)}`;
    const submitUtrRes = await request(server)
      .post('/api/v1/payments/bank-transfer')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        orderId,
        utrNumber: uniqueUtr,
        senderBankName: 'State Bank of India',
        notes: 'E2E Automated Workflow Verification',
      })
      .expect(201);

    const submitUtrData = submitUtrRes.body as SubmitUtrResponse;
    expect(submitUtrData.transaction).toBeDefined();
    expect(submitUtrData.transaction.utrNumber).toBe(uniqueUtr);
    const transactionId = submitUtrData.transaction.id;

    // 6. Buyer Creates RFQ (matching partner category AGRICULTURE_DRONE)
    const deadline = new Date(Date.now() + 10 * 86400000).toISOString();
    const createRfqRes = await request(server)
      .post('/api/v1/rfq')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        title: 'Fleet Expansion: Agricultural Spraying Drones',
        description:
          'Requirement for 5 field-tested agricultural sprayer units',
        category: 'AGRICULTURE_DRONE',
        quantity: 5,
        deadlineAt: deadline,
      })
      .expect(201);

    const rfqData = createRfqRes.body as CreateRfqResponse;
    const rfqId = rfqData.id;
    expect(rfqId).toBeDefined();
    expect(rfqData._count.invites).toBeGreaterThanOrEqual(1);

    // 7. Partner Login
    const partnerLoginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'partner@garudhub.local', password: 'ChangeMeDemo123!' })
      .expect(200);

    const partnerData = partnerLoginRes.body as AuthLoginResponse;
    const partnerToken = partnerData.accessToken;
    expect(partnerToken).toBeDefined();

    // 8. Partner updates order fulfillment
    const updateFulfillmentRes = await request(server)
      .patch(`/api/v1/partner/orders/${orderId}/fulfillment`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({ fulfillmentStatus: 'PROCESSING' })
      .expect(200);

    const fulfillmentData = updateFulfillmentRes.body as FulfillmentResponse;
    expect(fulfillmentData.fulfillmentStatus).toBe('PROCESSING');

    // 9. Partner submits quotation on the auto-matched RFQ
    const submitQuoteRes = await request(server)
      .post(`/api/v1/partner/rfqs/${rfqId}/quotations`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        priceInr: 279000,
        minOrderQuantity: 1,
        leadTimeDays: 5,
        notes: 'Ready stock in Bengaluru warehouse',
      })
      .expect(201);

    const quoteData = submitQuoteRes.body as QuotationResponse;
    const quotationId = quoteData.id;
    expect(quotationId).toBeDefined();
    expect(Number(quoteData.priceInr)).toBe(279000);

    // 10. Admin Login
    const adminLoginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@garudhub.local', password: 'ChangeMeAdmin123!' })
      .expect(200);

    const adminData = adminLoginRes.body as AuthLoginResponse;
    const adminToken = adminData.accessToken;
    expect(adminToken).toBeDefined();

    // 11. Admin verifies and approves UTR
    const verifyUtrRes = await request(server)
      .post('/api/v1/payments/admin/verify-utr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transactionId,
        action: 'APPROVE',
      })
      .expect(201);

    const verifyUtrData = verifyUtrRes.body as AdminVerifyUtrResponse;
    expect(verifyUtrData.success).toBe(true);
    expect(verifyUtrData.transactionStatus).toBe('SUCCESS');

    // 12. Final Order Status Check
    const orderCheckRes = await request(server)
      .get(`/api/v1/admin/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const finalOrder = orderCheckRes.body as AdminOrderResponse;
    expect(finalOrder.paymentStatus).toBe('PAID');
    expect(finalOrder.status).toBe('CONFIRMED');
    expect(finalOrder.fulfillmentStatus).toBe('PROCESSING');

    // 13. Buyer compares quotations
    const buyerQuotesRes = await request(server)
      .get(`/api/v1/rfq/${rfqId}/quotations`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    const receivedQuotes = buyerQuotesRes.body as QuotationResponse[];
    expect(Array.isArray(receivedQuotes)).toBe(true);
    expect(receivedQuotes.length).toBeGreaterThanOrEqual(1);
    expect(receivedQuotes[0].id).toBe(quotationId);
  });
});
