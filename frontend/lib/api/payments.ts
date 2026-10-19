import { apiRequest } from './client';
import type { PaymentGateway, PaymentTransaction } from './types';

export const ESCROW_BANK_DETAILS = {
  accountName: 'Garud Hub Aviation Technologies Pvt Ltd',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200088912345',
  ifscCode: 'HDFC0001234',
  accountType: 'Corporate Current Account (B2B Escrow)',
  branch: 'Koramangala, Bengaluru, Karnataka - 560034',
  upiId: 'garudhub.escrow@hdfcbank',
};

export type PaymentIntentResponse = {
  orderId: string;
  gateway: PaymentGateway;
  gatewayOrderId: string;
  amountPaise: number;
  amountInr: string;
  currency: string;
  keyId: string;
  sandboxMode: boolean;
  orderSummary: {
    companyName: string;
    contactName: string;
    contactPhone: string;
  };
};

export type VerifyRazorpayResponse = {
  success: boolean;
  message: string;
  orderId: string;
  paymentStatus: 'PAID';
  paymentId: string;
};

export type SubmitBankTransferResponse = {
  success: boolean;
  message: string;
  transaction: PaymentTransaction;
};

export async function createPaymentIntent(orderId: string, gateway: PaymentGateway = 'RAZORPAY') {
  return apiRequest<PaymentIntentResponse>('/payments/intent', {
    method: 'POST',
    auth: true,
    body: { orderId, gateway },
  });
}

export async function verifyRazorpayPayment(payload: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  return apiRequest<VerifyRazorpayResponse>('/payments/verify-razorpay', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export async function submitBankTransfer(payload: {
  orderId: string;
  utrNumber: string;
  senderBankName?: string;
  notes?: string;
}) {
  return apiRequest<SubmitBankTransferResponse>('/payments/bank-transfer', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export async function adminVerifyUtr(payload: {
  transactionId: string;
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}) {
  return apiRequest<{ success: boolean; message: string; transactionStatus: string; orderPaymentStatus: string }>(
    '/payments/admin/verify-utr',
    {
      method: 'POST',
      auth: true,
      body: payload,
    },
  );
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
