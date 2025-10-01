import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';

// Configuration
import { DatabaseConfig } from './config/database.config';
import { RedisConfig } from './config/redis.config';
import { KafkaConfig } from './config/kafka.config';

// Modules
import { HealthModule } from './health/health.module';
import { AssembliesModule } from './modules/assemblies/assemblies.module';
import { InitiativesModule } from './modules/initiatives/initiatives.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { VotesModule } from './modules/votes/votes.module';
import { ContributionsModule } from './modules/contributions/contributions.module';
import { MinutesModule } from './modules/minutes/minutes.module';
import { AuditModule } from './modules/audit/audit.module';
import { ProxyVotingModule } from './modules/proxy-voting/proxy-voting.module';
import { AsyncAssembliesModule } from './modules/async-assemblies/async-assemblies.module';

// Common
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [DatabaseConfig, RedisConfig, KafkaConfig],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        ssl: configService.get('database.ssl'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/db/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        retryAttempts: 3,
        retryDelay: 3000,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),

    // Redis/Bull
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          db: configService.get('redis.db'),
        },
      }),
      inject: [ConfigService],
    }),

    // Event system
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Health checks
    TerminusModule,

    // Application modules
    CommonModule,
    HealthModule,
    AssembliesModule,
    InitiativesModule,
    SessionsModule,
    VotesModule,
    ContributionsModule,
    MinutesModule,
    AuditModule,
    ProxyVotingModule,
    AsyncAssembliesModule,
  ],
})
export class AppModule {}