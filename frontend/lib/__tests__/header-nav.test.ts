import { describe, expect, it } from 'vitest';
import {
  getAccountNavLinks,
  getDashboardLink,
  headerLoginCtaForPath,
  HEADER_LOGIN_CTA,
  HEADER_REGISTER_PARTNER_CTA,
  ROLE_LOGIN_LINKS,
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

  it('exposes unified Sign in / Register as partner CTAs', () => {
    expect(HEADER_LOGIN_CTA.href).toBe('/auth/login');
    expect(HEADER_LOGIN_CTA.label).toBe('Sign in');
    expect(HEADER_REGISTER_PARTNER_CTA.href).toBe('/auth/register?type=partner');
    expect(HEADER_REGISTER_PARTNER_CTA.label).toBe('Register as partner');
  });

  it('headerLoginCtaForPath uses role bookmark URLs on key surfaces', () => {
    expect(headerLoginCtaForPath('/b2b-partners').href).toBe(ROLE_LOGIN_LINKS.partner.href);
    expect(headerLoginCtaForPath('/b2b-partners').label).toBe('Sign in');
    expect(headerLoginCtaForPath('/marketplace').href).toBe(ROLE_LOGIN_LINKS.buyer.href);
    expect(headerLoginCtaForPath('/marketplace').label).toBe('Sign in');
    expect(headerLoginCtaForPath('/').href).toBe('/auth/login');
    expect(headerLoginCtaForPath('/').label).toBe('Sign in');
  });
});
