import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      username: this.configService.get<string>('database.username'),
      password: this.configService.get<string>('database.password'),
      database: this.configService.get<string>('database.name'),
      ssl: this.configService.get<boolean>('database.ssl'),
      logging: this.configService.get<boolean>('database.logging'),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      synchronize: false, // Always use migrations in production
      migrationsRun: false, // Run migrations manually
      retryAttempts: 3,
      retryDelay: 3000,
      autoLoadEntities: true,
      extra: {
        // Connection pool settings
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000,
      },
    };
  }
}