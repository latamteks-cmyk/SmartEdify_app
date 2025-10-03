import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { RevocationEvent } from './entities/revocation-event.entity';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionGuard } from './guards/session.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Session, RevocationEvent])],
  providers: [SessionsService, SessionGuard],
  controllers: [SessionsController],
  exports: [SessionsService, SessionGuard],
})
export class SessionsModule {}
