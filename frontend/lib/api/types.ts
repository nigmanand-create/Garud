export type UserRole = 'PLATFORM_ADMIN' | 'PARTNER' | 'BUYER' | 'GOVERNMENT';

export type AccountType =
  | 'MANUFACTURER'
  | 'OEM'
  | 'INTERNATIONAL_COMPANY'
  | 'DISTRIBUTOR'
  | 'DEALER'
  | 'SERVICE_PROVIDER'
  | 'TRAINING_INSTITUTE'
  | 'TECHNOLOGY_COMPANY'
  | 'BUYER_ENTERPRISE'
  | 'GOVERNMENT_PSU';

export type VerificationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export type ListingReviewStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'UNPUBLISHED';

export type ListingModerationAuditLog = {
  id: string;
  listingId: string;
  actorUserId: string;
  fromStatus: ListingReviewStatus;
  toStatus: ListingReviewStatus;
  note?: string | null;
  createdAt: string;
};

export type AdminListingSummary = {
  id: string;
  name: string;
  brand?: string | null;
  sku?: string | null;
  listingType: ListingType;
  category: CatalogCategory;
  primaryImageUrl?: string | null;
  priceOnRequest: boolean;
  priceInr?: string | null;
  isPublished: boolean;
  reviewStatus: ListingReviewStatus;
  rejectionReason?: string | null;
  submittedForReviewAt?: string | null;
  reviewedAt?: string | null;
  updatedAt: string;
  organization: {
    id: string;
    companyName: string;
    contactPersonName: string;
    contactEmail: string;
    contactMobile: string;
    city?: string | null;
    state?: string | null;
    country: string;
    verificationStatus: VerificationStatus;
  };
};

export type AdminListingsResponse = {
  items: AdminListingSummary[];
  total: number;
  skip: number;
  take: number;
  statusCounts?: Record<string, number>;
};

export type AdminListingDetail = AdminListingSummary & {
  description?: string | null;
  technicalSpecs?: string | null;
  applications: string[];
  galleryImageUrls: string[];
  minOrderQuantity?: number | null;
  warranty?: string | null;
  organization: AdminListingSummary['organization'] & {
    owner: {
      id: string;
      email: string;
      role: UserRole;
      accountType: AccountType;
    };
  };
  moderationLogs: ListingModerationAuditLog[];
};

export type ListingType = 'PRODUCT' | 'SERVICE';

export type CatalogCategory =
  | 'AGRICULTURE_DRONE'
  | 'SURVEY_MAPPING_DRONE'
  | 'INDUSTRIAL_ENTERPRISE_DRONE'
  | 'CAMERA_DRONE'
  | 'COMPONENT'
  | 'ACCESSORY'
  | 'PAYLOAD'
  | 'REPAIR_MAINTENANCE'
  | 'TRAINING'
  | 'CONSULTANCY'
  | 'OTHER';

export type ApplicationDocumentType =
  | 'GST_CERTIFICATE'
  | 'CIN_CERTIFICATE'
  | 'COMPANY_REGISTRATION'
  | 'AUTHORIZATION_LETTER'
  | 'OTHER';

export type OrderStatus = 'CONFIRMED' | 'CANCELLED';

export type FulfillmentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'FULFILLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type PaymentGateway =
  | 'RAZORPAY'
  | 'BANK_TRANSFER_NEFT_RTGS'
  | 'CASH_ON_DELIVERY';

export type TransactionStatus =
  | 'CREATED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentTransaction = {
  id: string;
  orderId: string;
  gateway: PaymentGateway;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  utrNumber?: string | null;
  senderBankName?: string | null;
  amountInr: string;
  currency: string;
  status: TransactionStatus;
  paymentMethod?: string | null;
  failureReason?: string | null;
  metadata?: any;
  createdAt: string;
};

export type CartLineItem = {
  id: string;
  quantity: number;
  unitPriceInr: string;
  lineTotalInr: string;
  listing: {
    id: string;
    name: string;
    sku?: string | null;
    primaryImageUrl?: string | null;
    minOrderQuantity?: number | null;
  };
};

export type CartResponse = {
  id: string | null;
  partnerOrganization: { id: string; companyName: string } | null;
  items: CartLineItem[];
  itemCount: number;
  subtotalInr: string;
};

export type OrderListItem = {
  id: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  placedAt: string;
  totalInr: string;
  vendorCompanyName: string;
  lineItemCount: number;
};

export type PartnerOrderListItem = {
  id: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  placedAt: string;
  totalInr: string;
  buyerCompanyName: string;
  lineItemCount: number;
};

export type AdminOrderListItem = {
  id: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  subtotalInr: string;
  taxInr: string;
  shippingInr: string;
  totalInr: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  purchaseOrderNumber?: string | null;
  placedAt: string;
  buyerUser: { id: string; email: string };
  buyerOrganization: { id: string; companyName: string; city?: string | null; state?: string | null };
  vendorOrganization: { id: string; companyName: string; city?: string | null; state?: string | null };
  lineItemCount: number;
};

export type AdminOrdersResponse = {
  items: AdminOrderListItem[];
  total: number;
  skip: number;
  take: number;
  metrics: {
    totalGMV: number;
    totalConfirmedOrders: number;
    pendingFulfillmentCount: number;
    pendingPaymentCount: number;
  };
};

export type AdminOrderDetail = {
  id: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  subtotalInr: string;
  taxInr: string;
  shippingInr: string;
  totalInr: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  shippingCountry: string;
  billingAddressLine1: string;
  billingAddressLine2?: string | null;
  billingCity: string;
  billingState: string;
  billingPincode: string;
  billingCountry: string;
  gstin?: string | null;
  purchaseOrderNumber?: string | null;
  placedAt: string;
  createdAt: string;
  updatedAt: string;
  buyerUser: { id: string; email: string; role: UserRole; accountType: AccountType };
  buyerOrganization: {
    id: string;
    companyName: string;
    city?: string | null;
    state?: string | null;
    country: string;
    contactEmail: string;
    contactMobile: string;
    owner: { id: string; email: string };
  };
  vendorOrganization: {
    id: string;
    companyName: string;
    city?: string | null;
    state?: string | null;
    country: string;
    contactEmail: string;
    contactMobile: string;
    verificationStatus: VerificationStatus;
    owner: { id: string; email: string };
  };
  lineItems: {
    id: string;
    listingId: string;
    snapshotName: string;
    snapshotSku?: string | null;
    unitPriceInr: string;
    quantity: number;
    lineTotalInr: string;
    listing?: {
      id: string;
      name: string;
      brand?: string | null;
      primaryImageUrl?: string | null;
      category: CatalogCategory;
    };
  }[];
  transactions?: PaymentTransaction[];
};

export type OrderDetail = {
  id: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  placedAt: string;
  subtotalInr: string;
  taxInr: string;
  shippingInr: string;
  totalInr: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  shipping: {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  billing: {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  gstin?: string | null;
  purchaseOrderNumber?: string | null;
  rfqId?: string | null;
  quotationId?: string | null;
  carrierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  estimatedDeliveryAt?: string | null;
  hardwareSerialNumbers?: string[];
  fulfillmentNotes?: string | null;
  vendorOrganization: { id: string; companyName: string };
  transactions?: PaymentTransaction[];
  lineItems: {
    id: string;
    listingId?: string | null;
    name: string;
    sku?: string | null;
    imageUrl?: string | null;
    unitPriceInr: string;
    quantity: number;
    lineTotalInr: string;
  }[];
};

export type UpdateOrderFulfillmentPayload = {
  fulfillmentStatus: FulfillmentStatus;
  carrierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryAt?: string;
  hardwareSerialNumbers?: string[];
  fulfillmentNotes?: string;
};

export type RfqStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export type RfqInviteStatus = 'INVITED' | 'QUOTED' | 'DECLINED';

export type QuotationStatus =
  | 'SUBMITTED'
  | 'WITHDRAWN'
  | 'ACCEPTED'
  | 'REJECTED';

/** Partner's submitted quotation on an RFQ (POST response / list embed). */
export type PartnerQuotation = {
  id: string;
  priceOnRequest: boolean;
  priceInr?: string | number | null;
  leadTimeDays?: number | null;
  notes?: string | null;
  minOrderQuantity?: number | null;
  validUntil?: string | null;
  status?: QuotationStatus;
};

export type PartnerRfqInviteDetail = {
  id: string;
  status: RfqInviteStatus;
  rfq: {
    id: string;
    title: string;
    description: string;
    status: RfqStatus;
    category: CatalogCategory;
    quantity?: number | null;
    buyerOrganization: {
      companyName: string;
      city?: string | null;
      state?: string | null;
      country?: string | null;
    };
  };
};

export type PartnerRfqInviteListItem = {
  id: string;
  status: RfqInviteStatus;
  rfq: {
    id: string;
    title: string;
    status: RfqStatus;
    category: CatalogCategory;
    createdAt: string;
    quotations?: PartnerQuotation[];
  };
};

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  accountType: AccountType;
  verificationStatus?: VerificationStatus;
  orgId?: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    const msg = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message || body.error || `Request failed (${status})`;
    super(msg);
    this.status = status;
    this.body = body;
  }
}
