import { Module } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { MfaGuard } from './guards/mfa.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [MfaService, MfaGuard],
  exports: [MfaService, MfaGuard],
})
export class MfaModule {}
