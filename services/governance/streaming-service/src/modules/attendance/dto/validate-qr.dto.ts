import { IsString, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class GeolocationDto {
  @ApiPropertyOptional({ description: 'Latitude coordinate' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Accuracy in meters' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;
}

export class ValidateQrDto {
  @ApiProperty({ description: 'QR code value to validate' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'User geolocation (if consented)', type: GeolocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeolocationDto)
  geolocation?: GeolocationDto;
}