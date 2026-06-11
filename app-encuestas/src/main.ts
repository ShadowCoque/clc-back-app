import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Comprime respuestas JSON (reportes/resumen puede pesar cientos de KB sin gzip).
  app.use(compression());

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000, process.env.HOST ?? '192.168.2.91');
}
bootstrap();
