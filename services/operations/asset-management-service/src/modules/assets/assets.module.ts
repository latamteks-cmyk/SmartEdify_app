import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { Asset } from './entities/asset.entity';
import { MaintenancePlan } from '../maintenance-plans/entities/maintenance-plan.entity';
import { WorkOrder } from '../work-orders/entities/work-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, MaintenancePlan, WorkOrder])],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}