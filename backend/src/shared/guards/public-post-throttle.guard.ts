import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Rate limits keyed off client IP (respects X-Forwarded-For when trust proxy is enabled). */
@Injectable()
export class PublicPostThrottleGuard extends ThrottlerGuard {}
