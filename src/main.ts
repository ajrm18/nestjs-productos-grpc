import { ReflectionService } from '@grpc/reflection';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'productos',
      protoPath: join(__dirname, 'productos.proto'),
      url: `0.0.0.0:${process.env.PORT ?? 5000}`,
      // Server reflection: Postman/grpcurl descubren los servicios sin el .proto
      onLoadPackageDefinition: (pkg, server) => {
        new ReflectionService(pkg).addToServer(server);
      },
    },
  });
  await app.listen();
  console.log(`Microservicio gRPC escuchando en 0.0.0.0:${process.env.PORT ?? 5000}`);
}
bootstrap();
