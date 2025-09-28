import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokensService } from './tokens.service';
import { AuthModule } from '../auth/auth.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken]),
    forwardRef(() => AuthModule), // Use forwardRef to handle circular dependency
    SessionsModule, // Import SessionsModule to use SessionsService
  ],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}