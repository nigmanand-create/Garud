/** Post-login redirect paths (shared by login page and AuthProvider). */

export function redirectPathForRole(role: string): string {
  if (role === 'PLATFORM_ADMIN') return '/admin';
  if (role === 'PARTNER') return '/partner';
  if (role === 'GOVERNMENT') return '/government';
  return '/buyer/rfqs';
}

export function redirectPathAfterLogin(user: {
  role: string;
  mustChangePassword?: boolean;
}): string {
  if (user.mustChangePassword) return '/auth/change-password';
  return redirectPathForRole(user.role);
}

export const LOGIN_INTENTS = ['partner', 'buyer', 'admin', 'government'] as const;

export type LoginIntent = (typeof LOGIN_INTENTS)[number];

export function isLoginIntent(value: string): value is LoginIntent {
  return (LOGIN_INTENTS as readonly string[]).includes(value);
}

export function loginPathForIntent(intent: LoginIntent): string {
  return `/auth/login/${intent}`;
}

/** Map RequireAuth role gates to role-specific login URLs. */
export function loginIntentForRoles(
  roles: readonly string[] | undefined,
): LoginIntent | null {
  if (!roles?.length) return null;
  if (roles.length === 1 && roles[0] === 'PLATFORM_ADMIN') return 'admin';
  if (roles.length === 1 && roles[0] === 'PARTNER') return 'partner';
  if (roles.every((r) => r === 'BUYER' || r === 'GOVERNMENT')) return 'buyer';
  return null;
}

export type LoginPageCopy = {
  title: string;
  subtitle: string;
};

export function getLoginPageCopy(intent?: LoginIntent): LoginPageCopy {
  switch (intent) {
    case 'partner':
      return {
        title: 'Partner sign in',
        subtitle: 'Access your partner dashboard, listings, B2B RFPs, and orders.',
      };
    case 'buyer':
      return {
        title: 'Buyer sign in',
        subtitle: 'Browse the marketplace, manage RFQs, cart, and orders.',
      };
    case 'admin':
      return {
        title: 'Admin sign in',
        subtitle: 'Platform administration, listings review, and order oversight.',
      };
    case 'government':
      return {
        title: 'Government sign in',
        subtitle: 'Procurement tools, RFQs, and marketplace access for public-sector buyers.',
      };
    default:
      return {
        title: 'Sign in',
        subtitle:
          'Access your B2B Partner Hub, Buyer RFQ proposals, and order dashboard.',
      };
  }
}
