import * as compression from 'compression';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production' ? false : ['log', 'error', 'warn'],
  });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(compression());
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .addServer(process.env.BASE_URL)
    .addBearerAuth() // Optional: Add Bearer token support
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // Save Swagger JSON to a file
  //writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
  // Setup Swagger module

  // Middleware  Process Total Request Time  (Middleware + Controller execution Time + DB Query execution Time + Response sent to Client.)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.url} - ${duration}ms`);
    });
    next();
  });
  SwaggerModule.setup('api-docs', app, document);
  const res = await app.listen(process.env.PORT ?? 3000);
  console.log(`Server is running on ${res.address().port}`);
}
bootstrap();
