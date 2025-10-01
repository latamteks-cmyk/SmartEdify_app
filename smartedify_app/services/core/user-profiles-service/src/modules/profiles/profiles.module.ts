import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { ProfileStatusService } from './services/profile-status.service';
import { UserProfile } from './entities/user-profile.entity';
import { ProfileStatusHistory } from './entities/profile-status-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProfile,
      ProfileStatusHistory,
    ]),
  ],
  controllers: [ProfilesController],
  providers: [
    ProfilesService,
    ProfileStatusService,
  ],
  exports: [ProfilesService],
})
export class ProfilesModule {}