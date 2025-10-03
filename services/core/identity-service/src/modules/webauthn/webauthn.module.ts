import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebAuthnCredential } from './entities/webauthn-credential.entity';
import { WebauthnService } from './webauthn.service';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { WebauthnController } from './webauthn.controller';
import { RpService } from './rp.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { ChallengeStoreService } from './store/challenge-store.service';

@Module({
  imports: [TypeOrmModule.forFeature([WebAuthnCredential]), UsersModule],
  providers: [
    {
      provide: WebauthnService,
      useFactory: (
        rpService: RpService,
        usersService: UsersService,
        webAuthnCredentialRepository: Repository<WebAuthnCredential>,
      ) =>
        new WebauthnService(
          rpService,
          usersService,
          webAuthnCredentialRepository,
          generateRegistrationOptions,
          verifyRegistrationResponse,
          generateAuthenticationOptions,
          verifyAuthenticationResponse,
        ),
      inject: [RpService, UsersService, getRepositoryToken(WebAuthnCredential)],
    },
    RpService,
    ChallengeStoreService,
  ],
  controllers: [WebauthnController],
})
export class WebauthnModule {}
