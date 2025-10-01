import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ProfilesController } from './profiles.controller';
import { MembershipController } from './controllers/membership.controller';
import { RoleController } from './controllers/role.controller';
import { ProfilesService } from './profiles.service';
import { ProfileStatusService } from './services/profile-status.service';
import { MembershipService } from './services/membership.service';
import { RoleService } from './services/role.service';
import { ComplianceIntegrationService } from './services/compliance-integration.service';
import { UserProfile } from './entities/user-profile.entity';
import { ProfileStatusHistory } from './entities/profile-status-history.entity';
import { UserMembership } from './entities/user-membership.entity';
import { UserRole } from './entities/user-role.entity';
import { UserEntitlement } from './entities/user-entitlement.entity';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProfile,
      ProfileStatusHistory,
      UserMembership,
      UserRole,
      UserEntitlement,
    ]),
    HttpModule,
    CacheModule,
  ],
  controllers: [
    ProfilesController,
    MembershipController,
    RoleController,
  ],
  providers: [
    ProfilesService,
    ProfileStatusService,
    MembershipService,
    RoleService,
    ComplianceIntegrationService,
  ],
  exports: [
    ProfilesService,
    MembershipService,
    RoleService,
    ComplianceIntegrationService,
  ],
})
export class ProfilesModule {}