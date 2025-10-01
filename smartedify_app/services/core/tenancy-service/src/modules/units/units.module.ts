import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { Unit } from './entities/unit.entity';
import { Condominium } from '../condominiums/entities/condominium.entity';
import { Building } from '../buildings/entities/building.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, Condominium, Building])],
  controllers: [UnitsController],
  providers: [UnitsService],
  exports: [UnitsService],
})
export class UnitsModule {}