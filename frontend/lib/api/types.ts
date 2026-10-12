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
  vendorOrganization: { id: string; companyName: string };
  lineItems: {
    id: string;
    listingId: string;
    name: string;
    sku?: string | null;
    unitPriceInr: string;
    quantity: number;
    lineTotalInr: string;
  }[];
};

export type RfqStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export type RfqInviteStatus = 'INVITED' | 'QUOTED' | 'DECLINED';

/** Partner's submitted quotation on an RFQ (POST response / list embed). */
export type PartnerQuotation = {
  id: string;
  priceOnRequest: boolean;
  priceInr?: string | number | null;
  leadTimeDays?: number | null;
  notes?: string | null;
  minOrderQuantity?: number | null;
  validUntil?: string | null;
  status?: string;
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
