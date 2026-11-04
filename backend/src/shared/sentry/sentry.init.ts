import * as Sentry from '@sentry/node';

/** Initialize Sentry when SENTRY_DSN is set (P1-7). Safe no-op otherwise. */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT ??
      process.env.GARUD_DEPLOY_ENV ??
      process.env.NODE_ENV ??
      'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    release: process.env.SENTRY_RELEASE,
  });
}

export { Sentry };
