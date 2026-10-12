import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const BEARER_AUTH_NAME = 'access-token';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('GarudHub API')
    .setDescription(
      'GarudHub (B2B drone ecosystem) REST API. Phase A–B: auth, verification, catalog. Phase C: RFQ & quotations.\n\n' +
        'Use **POST /auth/login** or **POST /auth/register**, then click **Authorize** and paste the `accessToken` (Bearer JWT).',
    )
    .setVersion('1.0.0')
    .addTag('Health', 'Service liveness')
    .addTag('Auth', 'Register, login, JWT refresh')
    .addTag('Partner', 'Partner application (PARTNER role)')
    .addTag('Partner Documents', 'Application file uploads')
    .addTag('Partner Catalog', 'Products & services (verified partners)')
    .addTag('Marketplace', 'Public browse (no auth)')
    .addTag('RFQ (Buyer)', 'Post requirements & compare quotes')
    .addTag('RFQ (Partner)', 'Invited RFQs & submit quotations')
    .addTag('Admin', 'Platform admin (PLATFORM_ADMIN role)')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token from login/register/refresh',
      },
      BEARER_AUTH_NAME,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}

export { BEARER_AUTH_NAME };
