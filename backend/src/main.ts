import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppLogger } from './shared/logging/app-logger';
import { initSentry } from './shared/sentry/sentry.init';
import { setupSwagger } from './shared/swagger/swagger.setup';

initSentry();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Razorpay webhook signatures are verified over the raw request bytes.
    rawBody: true,
    bufferLogs: true,
  });
  app.useLogger(new AppLogger());
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  const isProduction = process.env.NODE_ENV === 'production';
  const swaggerEnabled =
    !isProduction || process.env.SWAGGER_ENABLED === 'true';

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (swaggerEnabled) {
    setupSwagger(app);
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
