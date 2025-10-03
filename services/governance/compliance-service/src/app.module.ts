import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TerminusModule } from '@nestjs/terminus';

import { DatabaseConfig } from './config/database.config';
import AppConfig from './config/app.config';

// Modules
import { HealthModule } from './health/health.module';
import { EventsModule } from './events/events.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { DsarModule } from './modules/dsar/dsar.module';
import { LlmModule } from './modules/llm/llm.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),

    // Event system
    EventEmitterModule.forRoot(),

    // Health checks
    TerminusModule,

    // Application modules
    HealthModule,
    EventsModule,
    PoliciesModule,
    ComplianceModule,
    DsarModule,
    LlmModule,
  ],
})
export class AppModule {}