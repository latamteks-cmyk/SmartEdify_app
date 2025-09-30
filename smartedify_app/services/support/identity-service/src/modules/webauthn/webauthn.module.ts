import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebAuthnCredential } from './entities/webauthn-credential.entity';
import { WebauthnService } from './webauthn.service';
import { WebauthnController } from './webauthn.controller';
import { RpService } from './rp.service';
import { UsersModule } from '../users/users.module';
import { ChallengeStoreService } from './store/challenge-store.service';

@Module({
  imports: [TypeOrmModule.forFeature([WebAuthnCredential]), UsersModule],
  providers: [WebauthnService, RpService, ChallengeStoreService],
  controllers: [WebauthnController],
})
export class WebauthnModule {}
