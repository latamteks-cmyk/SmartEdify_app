import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateUnitDto } from './create-unit.dto';
import { UnitStatus } from '../entities/unit.entity';

export class UpdateUnitDto extends PartialType(CreateUnitDto) {
  @ApiProperty({
    description: 'Status of the unit',
    enum: UnitStatus,
    example: UnitStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;
}