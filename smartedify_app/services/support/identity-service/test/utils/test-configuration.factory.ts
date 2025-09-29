import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { KeysModule } from '../../src/modules/keys/keys.module';
import { getDatabaseConfig, getTestDatabaseConfig } from '../../src/config/database.config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SigningKey } from '../../src/modules/keys/entities/signing-key.entity';
import { KeyRotationService } from '../../src/modules/keys/services/key-rotation.service';
import { KeyManagementService } from '../../src/modules/keys/services/key-management.service';
import { INestApplication } from '@nestjs/common';
import { UsersModule } from '../../src/modules/users/users.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { WebauthnModule } from '../../src/modules/webauthn/webauthn.module';
import { TokensModule } from '../../src/modules/tokens/tokens.module';
import { SessionsModule } from '../../src/modules/sessions/sessions.module';
import { AuthorizationModule } from '../../src/modules/authorization/authorization.module';
import { ComplianceModule } from '../../src/modules/compliance/compliance.module';
import { QrcodesModule } from '../../src/modules/qrcodes/qrcodes.module';
import { MfaModule } from '../../src/modules/mfa/mfa.module';
import { OidcDiscoveryModule } from '../../src/modules/oidc-discovery/oidc-discovery.module';
import { User } from '../../src/modules/users/entities/user.entity';
import { ConsentAudit } from '../../src/modules/users/entities/consent-audit.entity';
import { Session } from '../../src/modules/sessions/entities/session.entity';
import { WebAuthnCredential } from '../../src/modules/webauthn/entities/webauthn-credential.entity';
import { RefreshToken } from '../../src/modules/tokens/entities/refresh-token.entity';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UsersService } from '../../src/modules/users/users.service';
import { AuthorizationCodeStoreService } from '../../src/modules/auth/store/authorization-code-store.service';
import { DpopReplayProof } from '../../src/modules/auth/entities/dpop-replay-proof.entity';
import { MetricsModule } from '../../src/modules/metrics/metrics.module';
import { ComplianceJob } from '../../src/modules/compliance/entities/compliance-job.entity';
import { ComplianceJobService as ComplianceJobServiceEntity } from '../../src/modules/compliance/entities/compliance-job-service.entity';

export interface TestModuleSetup {
  app: INestApplication;
  moduleFixture: TestingModule;
  signingKeyRepository: Repository<SigningKey>;
  usersRepository: Repository<User>;
  consentAuditsRepository: Repository<ConsentAudit>;
  sessionsRepository: Repository<Session>;
  webAuthnCredentialsRepository: Repository<WebAuthnCredential>;
  refreshTokensRepository: Repository<RefreshToken>;
  dpopReplayRepository: Repository<DpopReplayProof>;
  complianceJobsRepository: Repository<ComplianceJob>;
  complianceJobServicesRepository: Repository<ComplianceJobServiceEntity>;
  keyRotationService: KeyRotationService;
  keyManagementService: KeyManagementService;
  authService: AuthService;
  usersService: UsersService;
  authorizationCodeStoreService: AuthorizationCodeStoreService;
  schedulerRegistry: SchedulerRegistry;
}

export class TestConfigurationFactory {
  static async createTestModule(): Promise<TestModuleSetup> {
    return TestTimeoutManager.withTimeout(
      async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
          imports: [
            ScheduleModule.forRoot(),
            TypeOrmModule.forRoot(getTestDatabaseConfig()),
            KeysModule,
            UsersModule,
            AuthModule,
            WebauthnModule,
            TokensModule,
            SessionsModule,
            AuthorizationModule,
            ComplianceModule,
            QrcodesModule,
            MfaModule,
            OidcDiscoveryModule,
            MetricsModule,
          ],
        }).compile();

        const app = moduleFixture.createNestApplication();
        await app.init();

        const keyRotationService = moduleFixture.get<KeyRotationService>(KeyRotationService);
        const keyManagementService = moduleFixture.get<KeyManagementService>(KeyManagementService);
        const authService = moduleFixture.get<AuthService>(AuthService);
        const usersService = moduleFixture.get<UsersService>(UsersService);
        const authorizationCodeStoreService = moduleFixture.get<AuthorizationCodeStoreService>(AuthorizationCodeStoreService);
        const signingKeyRepository = moduleFixture.get<Repository<SigningKey>>(
          getRepositoryToken(SigningKey)
        );
        const usersRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
        const consentAuditsRepository = moduleFixture.get<Repository<ConsentAudit>>(getRepositoryToken(ConsentAudit));
        const sessionsRepository = moduleFixture.get<Repository<Session>>(getRepositoryToken(Session));
        const webAuthnCredentialsRepository = moduleFixture.get<Repository<WebAuthnCredential>>(getRepositoryToken(WebAuthnCredential));
        const refreshTokensRepository = moduleFixture.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
        const dpopReplayRepository = moduleFixture.get<Repository<DpopReplayProof>>(getRepositoryToken(DpopReplayProof));
        const complianceJobsRepository = moduleFixture.get<Repository<ComplianceJob>>(getRepositoryToken(ComplianceJob));
        const complianceJobServicesRepository = moduleFixture.get<Repository<ComplianceJobServiceEntity>>(getRepositoryToken(ComplianceJobServiceEntity));
        const schedulerRegistry = moduleFixture.get<SchedulerRegistry>(SchedulerRegistry);

        return {
          app,
          moduleFixture,
          signingKeyRepository,
          usersRepository,
          consentAuditsRepository,
          sessionsRepository,
          webAuthnCredentialsRepository,
          refreshTokensRepository,
          keyRotationService,
          keyManagementService,
          authService,
          usersService,
          authorizationCodeStoreService,
          schedulerRegistry,
          dpopReplayRepository,
          complianceJobsRepository,
          complianceJobServicesRepository,
        };
      },
      TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT,
      'Test module creation'
    );
  }

  static async cleanDatabase(setup: TestModuleSetup): Promise<void> {
    return TestTimeoutManager.withTimeout(
      async () => {
        console.log('--- Cleaning database ---');
        await setup.consentAuditsRepository.createQueryBuilder().delete().from(ConsentAudit).execute();
        await setup.complianceJobServicesRepository.createQueryBuilder().delete().from(ComplianceJobServiceEntity).execute();
        await setup.complianceJobsRepository.createQueryBuilder().delete().from(ComplianceJob).execute();
        await setup.sessionsRepository.createQueryBuilder().delete().from(Session).execute();
        await setup.webAuthnCredentialsRepository.createQueryBuilder().delete().from(WebAuthnCredential).execute();
        await setup.refreshTokensRepository.createQueryBuilder().delete().from(RefreshToken).execute();
        await setup.dpopReplayRepository.createQueryBuilder().delete().from(DpopReplayProof).execute();
        await setup.signingKeyRepository.createQueryBuilder().delete().from(SigningKey).execute();
        await setup.usersRepository.createQueryBuilder().delete().from(User).execute();
        console.log('--- Database cleaned ---');
      },
      TEST_CONSTANTS.DATABASE_OPERATION_TIMEOUT,
      'Database cleanup'
    );
  }

  static async closeTestModule(setup: TestModuleSetup): Promise<void> {
    return TestTimeoutManager.withTimeout(
      async () => {
        try {
          // Stop all scheduled tasks
          const cronJobs = setup.schedulerRegistry.getCronJobs();
          cronJobs.forEach(job => {
            try {
              job.stop();
            } catch (error) {
              console.warn('Warning: Could not stop cron job:', error.message);
            }
          });

          // Clear any remaining timeouts
          TestTimeoutManager.clearAllTimeouts();

          if (setup.app) {
            await setup.app.close();
          }
        } catch (error) {
          console.error('Error during test module cleanup:', error);
          throw error;
        }
      },
      TEST_CONSTANTS.MAX_CLEANUP_TIME,
      'Test module cleanup'
    );
  }
}

export const TEST_CONSTANTS = {
  DEFAULT_TENANT_ID: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  TEST_TIMEOUT: 30000, // 30 segundos para tests lentos
  RETRY_ATTEMPTS: 3,
  DATABASE_OPERATION_TIMEOUT: 5000, // 5 segundos para operaciones de DB
  SERVICE_INITIALIZATION_TIMEOUT: 10000, // 10 segundos para inicialización
  MAX_CLEANUP_TIME: 3000, // 3 segundos máximo para cleanup
} as const;

export class TestTimeoutManager {
  private static timeouts: NodeJS.Timeout[] = [];
  
  static createTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timeout = setTimeout(callback, delay);
    this.timeouts.push(timeout);
    return timeout;
  }
  
  static clearAllTimeouts(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts = [];
  }
  
  static async withTimeout<T>(
    operation: () => Promise<T>, 
    timeout: number, 
    description: string
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        this.createTimeout(
          () => reject(new Error(`Timeout: ${description} exceeded ${timeout}ms`)),
          timeout
        )
      )
    ]);
  }
}