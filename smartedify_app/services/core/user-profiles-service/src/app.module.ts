import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { redisStore } from 'cache-manager-redis-store';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

// Configuración
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { kafkaConfig } from './config/kafka.config';
import { appConfig } from './config/app.config';

// Módulos de dominio
import { ProfilesModule } from './profiles/profiles.module';
import { MembershipsModule } from './memberships/memberships.module';
import { RolesModule } from './roles/roles.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CatalogModule } from './catalog/catalog.module';
import { BulkModule } from './bulk/bulk.module';
import { ExportsModule } from './exports/exports.module';
import { PrivacyModule } from './privacy/privacy.module';

// Módulos compartidos
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { EventsModule } from './events/events.module';
import { MetricsModule } from './metrics/metrics.module';
import { HealthModule } from './health/health.module';

// Entidades
import { Profile } from './profiles/entities/profile.entity';
import { Membership } from './memberships/entities/membership.entity';
import { Role } from './roles/entities/role.entity';
import { RoleAssignment } from './roles/entities/role-assignment.entity';
import { ProfileEntitlement } from './entitlements/entities/profile-entitlement.entity';
import { CommunicationConsent } from './privacy/entities/communication-consent.entity';
import { ProfileHistory } from './common/entities/profile-history.entity';
import { MembershipHistory } from './common/entities/membership-history.entity';
import { PolicyBinding } from './common/entities/policy-binding.entity';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, kafkaConfig],
      envFilePath: ['.env.local', '.env'],
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),

    // Base de datos
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('database.url'),
        entities: [
          Profile,
          Membership,
          Role,
          RoleAssignment,
          ProfileEntitlement,
          CommunicationConsent,
          ProfileHistory,
          MembershipHistory,
          PolicyBinding,
        ],
        synchronize: false, // Usar migraciones en producción
        logging: configService.get<string>('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
        maxQueryExecutionTime: 1000, // Log queries que tomen más de 1s
        
        // Pool de conexiones
        extra: {
          max: configService.get<number>('database.pool.max', 20),
          min: configService.get<number>('database.pool.min', 5),
          idleTimeoutMillis: configService.get<number>('database.pool.idleTimeout', 30000),
          connectionTimeoutMillis: configService.get<number>('database.pool.connectionTimeout', 2000),
        },

        // SSL en producción
        ssl: configService.get<string>('NODE_ENV') === 'production' ? {
          rejectUnauthorized: false,
        } : false,

        // Configuración de esquema
        schema: 'user_profiles',
        
        // Configuración RLS
        applicationName: 'user-profiles-service',
      }),
      inject: [ConfigService],
    }),

    // Cache Redis
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore as any,
        url: configService.get<string>('redis.url'),
        ttl: configService.get<number>('redis.ttl', 300), // 5 minutos por defecto
        max: configService.get<number>('redis.max', 1000), // máximo 1000 items
        
        // Configuración de conexión
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
        },
        
        // Configuración de retry
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        
        // Configuración de cluster (si aplica)
        enableReadyCheck: true,
        lazyConnect: true,
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),

    // Event Emitter para eventos internos
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Métricas Prometheus
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'user_profiles_',
        },
      },
    }),

    // Módulos compartidos (deben ir primero)
    CommonModule,
    AuthModule,
    TenantModule,
    EventsModule,
    MetricsModule,
    HealthModule,

    // Módulos de dominio
    ProfilesModule,
    MembershipsModule,
    RolesModule,
    EntitlementsModule,
    PermissionsModule,
    CatalogModule,
    BulkModule,
    ExportsModule,
    PrivacyModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  constructor(private configService: ConfigService) {
    // Configurar timezone
    process.env.TZ = this.configService.get<string>('TZ', 'UTC');
    
    // Configurar límites de memoria para Node.js
    if (process.env.NODE_ENV === 'production') {
      const maxOldSpaceSize = this.configService.get<number>('NODE_MAX_OLD_SPACE_SIZE', 2048);
      process.env.NODE_OPTIONS = `--max-old-space-size=${maxOldSpaceSize}`;
    }
  }
}