import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global de los DTO (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta propiedades que el DTO no declara
      forbidNonWhitelisted: true, // y responde 400 si llegan propiedades de más
      transform: true, // convierte el body JSON en instancias del DTO
    }),
  );

  // Documentación interactiva OpenAPI/Swagger (informe, sección 5.1)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MineTrack360 API')
    .setDescription('API REST de gestión de flotas para logística minera')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
