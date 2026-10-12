import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole, VerificationStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../../identity/types/auth.types';

@Injectable()
export class VerifiedPartnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    if (!user) {
      throw new ForbiddenException();
    }
    if (user.role !== UserRole.PARTNER) {
      return false;
    }
    if (user.verification !== VerificationStatus.APPROVED) {
      throw new ForbiddenException(
        'Partner account must be verified before this action',
      );
    }
    return true;
  }
}
