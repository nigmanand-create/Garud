import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithRequestContext } from './request-context';

export const REQUEST_ID_HEADER = 'x-request-id';

const SAFE_ID = /^[A-Za-z0-9._-]{8,128}$/;

/** Reuse a well-formed inbound id (e.g. from Cloudflare / Next proxy), otherwise mint one. */
export function resolveRequestId(inbound: unknown): string {
  const candidate: unknown = Array.isArray(inbound) ? inbound[0] : inbound;
  return typeof candidate === 'string' && SAFE_ID.test(candidate)
    ? candidate
    : randomUUID();
}

/**
 * Correlation id + access log.
 * - sets `req.id`, echoes `x-request-id` on the response
 * - exposes the id to all downstream logs through AsyncLocalStorage
 * - logs one line per request on completion (query string omitted to avoid leaking tokens/PII)
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(
    req: Request & { id?: string; user?: { userId?: string } },
    res: Response,
    next: NextFunction,
  ) {
    const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
    req.id = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    const started = process.hrtime.bigint();
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
    const quiet = path.endsWith('/health');

    res.on('finish', () => {
      if (quiet && res.statusCode < 400) return;
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      const line = `${req.method} ${path} ${res.statusCode} ${ms.toFixed(1)}ms${
        req.user?.userId ? ` user=${req.user.userId}` : ''
      }`;
      if (res.statusCode >= 500) this.logger.error(line);
      else if (res.statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });

    runWithRequestContext({ requestId }, () => next());
  }
}
