import { describe, expect, it } from 'vitest';
import {
  getLoginPageCopy,
  isLoginIntent,
  loginPathForIntent,
  redirectPathAfterLogin,
  redirectPathForRole,
} from '../platform/auth-login';

describe('auth-login', () => {
  it('redirectPathForRole sends each role to its dashboard', () => {
    expect(redirectPathForRole('PLATFORM_ADMIN')).toBe('/admin');
    expect(redirectPathForRole('PARTNER')).toBe('/partner');
    expect(redirectPathForRole('BUYER')).toBe('/buyer/rfqs');
    expect(redirectPathForRole('GOVERNMENT')).toBe('/buyer/rfqs');
  });

  it('redirectPathAfterLogin honors mustChangePassword', () => {
    expect(
      redirectPathAfterLogin({ role: 'PARTNER', mustChangePassword: true }),
    ).toBe('/auth/change-password');
    expect(redirectPathAfterLogin({ role: 'PARTNER' })).toBe('/partner');
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
