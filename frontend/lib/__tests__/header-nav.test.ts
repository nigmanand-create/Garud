import { describe, expect, it } from 'vitest';
import {
  getAccountNavLinks,
  getDashboardLink,
  HEADER_LOGIN_CTA,
  HEADER_REGISTER_PARTNER_CTA,
} from '../platform/header-nav';

describe('header-nav', () => {
  it('buyer and government get RFQs, orders, messages and cart (P-UX-04)', () => {
    for (const role of ['BUYER', 'GOVERNMENT']) {
      const links = getAccountNavLinks(role);
      expect(links.map((l) => l.href)).toEqual([
        '/buyer/rfqs',
        '/buyer/orders',
        '/buyer/messages',
        '/buyer/cart',
      ]);
      expect(links.find((l) => l.cart)?.href).toBe('/buyer/cart');
    }
  });

  it('has no duplicate hrefs for any role', () => {
    for (const role of ['BUYER', 'GOVERNMENT', 'PARTNER', 'PLATFORM_ADMIN']) {
      const hrefs = getAccountNavLinks(role).map((l) => l.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  it('partner and admin start with their dashboard', () => {
    expect(getAccountNavLinks('PARTNER')[0].href).toBe('/partner');
    expect(getAccountNavLinks('PLATFORM_ADMIN')[0].href).toBe('/admin');
    expect(getDashboardLink('PARTNER')?.href).toBe('/partner');
  });

  it('returns nothing for anonymous users', () => {
    expect(getAccountNavLinks(undefined)).toEqual([]);
    expect(getDashboardLink(undefined)).toBeNull();
  });

  it('exposes the unified LOGIN / REGISTER AS B2B PARTNER CTAs', () => {
    expect(HEADER_LOGIN_CTA.href).toBe('/auth/login');
    expect(HEADER_REGISTER_PARTNER_CTA.href).toBe('/auth/register?type=partner');
  });
});
