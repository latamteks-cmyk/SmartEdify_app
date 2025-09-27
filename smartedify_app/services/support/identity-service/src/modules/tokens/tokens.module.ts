import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokensService } from './tokens.service';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken])],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}