import { UserRole, VerificationStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  accountType: string;
  orgId?: string;
  verification?: VerificationStatus;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  accountType: string;
  orgId?: string;
  verification?: VerificationStatus;
}
