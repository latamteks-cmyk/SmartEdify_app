import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Configuración
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import appConfig from './config/app.config';

// Módulos de dominio
import { ProfilesModule } from './modules/profiles/profiles.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';

// Entidades
import { UserProfile } from './modules/profiles/entities/user-profile.entity';
import { ProfileStatusHistory } from './modules/profiles/entities/profile-status-history.entity';
import { UserMembership } from './modules/profiles/entities/user-membership.entity';
import { UserRole } from './modules/profiles/entities/user-role.entity';
import { UserEntitlement } from './modules/profiles/entities/user-entitlement.entity';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Base de datos
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [
          UserProfile,
          ProfileStatusHistory,
          UserMembership,
          UserRole,
          UserEntitlement,
        ],
        synchronize: false, // Usar migraciones en producción
        logging: configService.get<string>('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
        
        // SSL en producción
        ssl: configService.get<string>('NODE_ENV') === 'production' ? {
          rejectUnauthorized: false,
        } : false,
      }),
      inject: [ConfigService],
    }),

    // Event Emitter para eventos internos
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 10,
    }),

    // Módulos compartidos
    CommonModule,
    HealthModule,

    // Módulos de dominio
    ProfilesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}