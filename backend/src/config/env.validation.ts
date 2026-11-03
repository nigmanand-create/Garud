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

  @IsOptional()
  @IsString()
  RAZORPAY_KEY_ID?: string;

  @IsOptional()
  @IsString()
  RAZORPAY_KEY_SECRET?: string;

  @IsOptional()
  @IsString()
  RAZORPAY_WEBHOOK_SECRET?: string;
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
    throw new Error(`Environment validation failed:\n- ${messages.join('\n- ')}`);
  }

  assertProductionSecrets(validated);
  return config;
}
