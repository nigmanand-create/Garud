import { describe, expect, it } from 'vitest';
import {
  getLoginPageCopy,
  isLoginIntent,
  loginIntentForRoles,
  loginPathForIntent,
  redirectPathAfterLogin,
  redirectPathForRole,
} from '../platform/auth-login';

describe('auth-login', () => {
  it('redirectPathForRole sends each role to its dashboard', () => {
    expect(redirectPathForRole('PLATFORM_ADMIN')).toBe('/admin');
    expect(redirectPathForRole('PARTNER')).toBe('/partner');
    expect(redirectPathForRole('BUYER')).toBe('/buyer/rfqs');
    expect(redirectPathForRole('GOVERNMENT')).toBe('/government');
  });

  it('redirectPathAfterLogin honors mustChangePassword', () => {
    expect(
      redirectPathAfterLogin({ role: 'PARTNER', mustChangePassword: true }),
    ).toBe('/auth/change-password');
    expect(redirectPathAfterLogin({ role: 'PARTNER' })).toBe('/partner');
  });

  it('loginIntentForRoles maps role gates to login URLs', () => {
    expect(loginIntentForRoles(['BUYER', 'GOVERNMENT'])).toBe('buyer');
    expect(loginIntentForRoles(['PARTNER'])).toBe('partner');
    expect(loginIntentForRoles(['PLATFORM_ADMIN'])).toBe('admin');
    expect(loginIntentForRoles(undefined)).toBe(null);
  });

  it('validates login intents and builds paths', () => {
    expect(isLoginIntent('partner')).toBe(true);
    expect(isLoginIntent('buyer')).toBe(true);
    expect(isLoginIntent('unknown')).toBe(false);
    expect(loginPathForIntent('admin')).toBe('/auth/login/admin');
  });

  it('getLoginPageCopy varies by intent', () => {
    expect(getLoginPageCopy().title).toBe('Sign in');
    expect(getLoginPageCopy('partner').title).toBe('Partner sign in');
    expect(getLoginPageCopy('buyer').title).toBe('Buyer sign in');
  });
});
