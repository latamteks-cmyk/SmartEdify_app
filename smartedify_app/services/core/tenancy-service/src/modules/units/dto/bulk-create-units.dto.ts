import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUnitDto } from './create-unit.dto';

export class BulkCreateUnitsDto {
  @ApiProperty({
    description: 'Array of units to create',
    type: [CreateUnitDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one unit must be provided' })
  @ArrayMaxSize(100, { message: 'Maximum 100 units can be created at once' })
  @ValidateNested({ each: true })
  @Type(() => CreateUnitDto)
  units: CreateUnitDto[];
}