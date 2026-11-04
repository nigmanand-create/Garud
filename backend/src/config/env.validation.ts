import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnvironment)
  NODE_ENV?: NodeEnvironment;

  @IsNotEmpty()
  @IsString()
  DATABASE_URL!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  PORT?: string;

  @IsOptional()
  @IsString()
  UPLOAD_DIR?: string;

  /** `local` (default) or `s3` / `r2` (stub until P1-4 full adapter). */
  @IsOptional()
  @IsString()
  UPLOAD_STORAGE?: string;

  @IsOptional()
  @IsString()
  S3_BUCKET?: string;

  @IsOptional()
  @IsString()
  S3_REGION?: string;

  @IsOptional()
  @IsString()
  S3_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  S3_SECRET_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  S3_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;

  /** cookies | bearer | dual — see docs/PRODUCTION_READINESS.md P1-1 */
  @IsOptional()
  @IsString()
  AUTH_SESSION_MODE?: string;

  /** Force Secure on auth cookies (`true` / `false`; default secure in production). */
  @IsOptional()
  @IsString()
  AUTH_COOKIE_SECURE?: string;

  @IsOptional()
  @IsString()
  RAZORPAY_KEY_ID?: string;

  @IsOptional()
  @IsString()
  RAZORPAY_KEY_SECRET?: string;

  @IsOptional()
  @IsString()
  RAZORPAY_WEBHOOK_SECRET?: string;

  /** Transactional mail — omit SMTP_HOST to use the log-only provider. */
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsString()
  SMTP_PORT?: string;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @IsOptional()
  @IsString()
  SMTP_SECURE?: string;

  @IsOptional()
  @IsString()
  MAIL_FROM?: string;

  /** Comma-separated admin inboxes for new-enquiry alerts. */
  @IsOptional()
  @IsString()
  ADMIN_NOTIFY_EMAIL?: string;

  /** Logging: `json` (prod default) or `pretty` (dev default). */
  @IsOptional()
  @IsString()
  LOG_FORMAT?: string;

  /** fatal | error | warn | log | debug | verbose */
  @IsOptional()
  @IsString()
  LOG_LEVEL?: string;

  /** CRM webhook (enquiry.created / enquiry.routed). Needs BOTH url and secret. */
  @IsOptional()
  @IsString()
  CRM_WEBHOOK_URL?: string;

  @IsOptional()
  @IsString()
  CRM_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  CRM_WEBHOOK_TIMEOUT_MS?: string;

  @IsOptional()
  @IsString()
  CRM_WEBHOOK_MAX_ATTEMPTS?: string;

  @IsOptional()
  @IsString()
  CRM_WEBHOOK_RETRY_DELAY_MS?: string;

  /** Public web origin used in email deep links, e.g. https://garudhub.me */
  @IsOptional()
  @IsString()
  PUBLIC_APP_URL?: string;
}

const WEAK_SECRET_MARKERS = [
  'change-me',
  'yourkeyhere',
  'yourkeysecrethere',
  'yourwebhooksecrethere',
  'minimum-32-characters-long',
  'changemedemo',
];

function isWeakSecret(value: string): boolean {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (value.length < 32) {
    return true;
  }
  return WEAK_SECRET_MARKERS.some((marker) => normalized.includes(marker));
}

function assertCrmWebhook(config: EnvironmentVariables): void {
  const url = config.CRM_WEBHOOK_URL?.trim();
  const secret = config.CRM_WEBHOOK_SECRET?.trim();
  if (!url && !secret) {
    return;
  }
  const errors: string[] = [];
  if (!url) {
    errors.push('CRM_WEBHOOK_SECRET is set but CRM_WEBHOOK_URL is missing');
  } else if (!/^https?:\/\//i.test(url)) {
    errors.push('CRM_WEBHOOK_URL must start with http:// or https://');
  } else if (
    config.NODE_ENV === NodeEnvironment.Production &&
    !url.toLowerCase().startsWith('https://')
  ) {
    errors.push('CRM_WEBHOOK_URL must use https:// in production');
  }
  if (url && (!secret || secret.length < 16)) {
    errors.push(
      'CRM_WEBHOOK_URL requires CRM_WEBHOOK_SECRET (≥16 chars) — unsigned webhooks are never sent',
    );
  }
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n- ${errors.join('\n- ')}`);
  }
}

function assertProductionSecrets(config: EnvironmentVariables): void {
  if (config.NODE_ENV !== NodeEnvironment.Production) {
    return;
  }

  const errors: string[] = [];

  if (isWeakSecret(config.JWT_ACCESS_SECRET)) {
    errors.push(
      'JWT_ACCESS_SECRET must be a unique random string (≥32 chars), not a demo or example value',
    );
  }
  if (isWeakSecret(config.JWT_REFRESH_SECRET)) {
    errors.push(
      'JWT_REFRESH_SECRET must be a unique random string (≥32 chars), not a demo or example value',
    );
  }

  const requireLiveRazorpay =
    process.env.GARUD_DEPLOY_ENV === 'production' ||
    process.env.RAZORPAY_REQUIRE_LIVE === 'true';

  const hasAnyRazorpay =
    config.RAZORPAY_KEY_ID ||
    config.RAZORPAY_KEY_SECRET ||
    config.RAZORPAY_WEBHOOK_SECRET;
  if (requireLiveRazorpay && hasAnyRazorpay) {
    if (!config.RAZORPAY_KEY_ID?.startsWith('rzp_live_')) {
      errors.push(
        'Live Razorpay: set RAZORPAY_KEY_ID to rzp_live_… (GARUD_DEPLOY_ENV=production)',
      );
    }
    if (
      !config.RAZORPAY_KEY_SECRET ||
      config.RAZORPAY_KEY_SECRET.toLowerCase().includes('your')
    ) {
      errors.push('Live Razorpay: set RAZORPAY_KEY_SECRET to the live secret');
    }
    if (
      !config.RAZORPAY_WEBHOOK_SECRET ||
      config.RAZORPAY_WEBHOOK_SECRET.toLowerCase().includes('your')
    ) {
      errors.push(
        'Live Razorpay: set RAZORPAY_WEBHOOK_SECRET from the Razorpay dashboard',
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Production environment validation failed:\n- ${errors.join('\n- ')}`,
    );
  }
}

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const messages = errors.flatMap((error) =>
      error.constraints ? Object.values(error.constraints) : [],
    );
    throw new Error(
      `Environment validation failed:\n- ${messages.join('\n- ')}`,
    );
  }

  assertCrmWebhook(validated);
  assertProductionSecrets(validated);
  return config;
}
