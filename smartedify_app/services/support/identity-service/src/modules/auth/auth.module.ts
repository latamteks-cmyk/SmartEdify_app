import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClientAuthGuard } from './guards/client-auth.guard';
import { AuthorizationCodeStoreService } from './store/authorization-code-store.service';
import { TokensModule } from '../tokens/tokens.module';
import { UsersModule } from '../users/users.module';
import { ParStoreService } from './store/par-store.service';
import { DeviceCodeStoreService } from './store/device-code-store.service';
import { RefreshToken } from '../tokens/entities/refresh-token.entity';
import { JtiStoreService } from './store/jti-store.service';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken]), TokensModule, UsersModule],
  providers: [
    AuthService, 
    ClientAuthGuard, 
    AuthorizationCodeStoreService, 
    ParStoreService,
    DeviceCodeStoreService,
    JtiStoreService
  ],
  controllers: [AuthController],
  exports: [AuthService], // Export AuthService
})
export class AuthModule {}