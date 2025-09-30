import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}

// Handle the bootstrap promise properly
bootstrap().catch((error) => {
  console.error('Error during bootstrap:', error);
  process.exit(1);
});
