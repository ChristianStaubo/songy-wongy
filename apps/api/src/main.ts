import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { TransformInterceptor } from './common/interceptors/transform-interceptor';
import { VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parsing
    cors: {
      origin:
        process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    },
  });

  // Configure raw body parser specifically for webhook endpoints FIRST
  app.use(
    '/api/v1/webhooks/auth/clerk',
    bodyParser.raw({ type: 'application/json' }),
  );
  // Configure JSON body parser for all other routes
  app.use(bodyParser.json());

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Songy-Wongy API')
    .setDescription('Songy-Wongy API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your Clerk JWT token',
        in: 'header',
      },
      'JWT-auth', // This name should match the string passed to @ApiBearerAuth() in your controllers
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document));
  app.useLogger(app.get(Logger));

  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     transform: true,
  //     transformOptions: {
  //       enableImplicitConversion: true,
  //     },
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //   }),
  // );

  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
