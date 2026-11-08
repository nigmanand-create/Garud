import { apiRequest } from './client';
import type { BuyerAddress } from './types';

export function fetchBuyerAddresses() {
  return apiRequest<{ addresses: BuyerAddress[] }>('/buyer/addresses', {
    auth: true,
  });
}

export type BuyerAddressPayload = {
  label: string;
  companyName?: string;
  contactName: string;
  contactPhone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  isDefault?: boolean;
};

export function createBuyerAddress(body: BuyerAddressPayload) {
  return apiRequest<BuyerAddress>('/buyer/addresses', {
    method: 'POST',
    auth: true,
    body,
  });
}

export function updateBuyerAddress(id: string, body: Partial<BuyerAddressPayload>) {
  return apiRequest<BuyerAddress>(`/buyer/addresses/${id}`, {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function deleteBuyerAddress(id: string) {
  return apiRequest<{ ok: true }>(`/buyer/addresses/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}

export function setDefaultBuyerAddress(id: string) {
  return apiRequest<BuyerAddress>(`/buyer/addresses/${id}/set-default`, {
    method: 'POST',
    auth: true,
  });
}
