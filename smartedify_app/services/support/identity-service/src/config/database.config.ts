import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { WebAuthnCredential } from '../modules/webauthn/entities/webauthn-credential.entity';
import { RefreshToken } from '../modules/tokens/entities/refresh-token.entity';
import { Session } from '../modules/sessions/entities/session.entity';
import { ConsentAudit } from '../modules/users/entities/consent-audit.entity';
import { RevocationEvent } from '../modules/sessions/entities/revocation-event.entity';
import { SigningKey } from '../modules/keys/entities/signing-key.entity';

export const getDatabaseConfig = (isTest = false): TypeOrmModuleOptions => {
  const config: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || (isTest ? '5433' : '5432')),
    username: process.env.DB_USERNAME || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: isTest 
      ? (process.env.DB_TEST_DATABASE || 'identity_db') 
      : (process.env.DB_DATABASE || 'identity_db'),
    entities: [
      User,
      WebAuthnCredential,
      RefreshToken,
      Session,
      ConsentAudit,
      RevocationEvent,
      SigningKey,
    ],
    synchronize: false, // synchronize: true is not recommended for production
    logging: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  };

  return config;
};

// Configuración específica para diferentes ambientes
export const getProductionDatabaseConfig = (): TypeOrmModuleOptions => ({
  ...getDatabaseConfig(false),
});

export const getTestDatabaseConfig = (): TypeOrmModuleOptions => ({
  ...getDatabaseConfig(true),
  synchronize: true, // OK para tests
  dropSchema: true, // Drop schema before running tests
  logging: false, // Silenciar logs en tests a menos que se especifique
});