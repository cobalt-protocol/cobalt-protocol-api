import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: configService
      .get<string>('CORS_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  const isProduction = configService.get('NODE_ENV') === 'production';
  const isSwaggerEnabled =
    configService.get('SWAGGER_ENABLED') === 'true' || !isProduction;

  if (isSwaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Cobalt Protocol API')
      .setDescription('API documentation for Cobalt Protocol')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api/v1/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = Number(configService.get<string>('PORT', '3000'));
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application running on ${await app.getUrl()}`);
  if (isSwaggerEnabled) {
    logger.log(`Swagger available at ${await app.getUrl()}/docs`);
  }
}
await bootstrap();
