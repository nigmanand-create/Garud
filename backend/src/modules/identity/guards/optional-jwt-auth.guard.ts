import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Populates `request.user` when a valid bearer token is sent; otherwise lets the request through. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_err: unknown, user: TUser | false): TUser | null {
    return user || null;
  }
}
