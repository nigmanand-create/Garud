import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './shared/swagger/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
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
