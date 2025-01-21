import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
//import { writeFileSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
   app.enableCors();
  // Configure Swagger options
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth() // Optional: Add Bearer token support
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Save Swagger JSON to a file
  //writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
  // Setup Swagger module
  SwaggerModule.setup('api-docs', app, document);

  const res = await app.listen(process.env.PORT ?? 3000);
  // Printing server running port.  // process.env.PORT is used for heroku deployment.
  console.log(`Server is running on ${res.address().port}`);
 
}
bootstrap();
