import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(process.env.PORT ?? 3000);
}

// Handle the bootstrap promise properly
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Error during bootstrap: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
