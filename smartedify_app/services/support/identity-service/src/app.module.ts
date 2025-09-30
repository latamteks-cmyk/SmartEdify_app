import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KeysModule } from './modules/keys/keys.module';
import { ScheduleModule } from '@nestjs/schedule';
import { getDatabaseConfig } from './config/database.config';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { WebauthnModule } from './modules/webauthn/webauthn.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { QrcodesModule } from './modules/qrcodes/qrcodes.module';
import { MfaModule } from './modules/mfa/mfa.module';
import { OidcDiscoveryModule } from './modules/oidc-discovery/oidc-discovery.module';
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    KeysModule,
    UsersModule,
    SessionsModule,
    TokensModule,
    WebauthnModule,
    AuthModule,
    AuthorizationModule,
    ComplianceModule,
    QrcodesModule,
    MfaModule,
    OidcDiscoveryModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
