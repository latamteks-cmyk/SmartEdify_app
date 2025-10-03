import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DsarService } from './dsar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { DPoPGuard } from '../../common/guards/dpop.guard';

@ApiTags('dsar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('api/v1/dsar')
export class DsarController {
  constructor(private readonly dsarService: DsarService) {}

  @Post('orchestrate-deletion')
  @UseGuards(DPoPGuard)
  @ApiOperation({ 
    summary: 'Orquestar eliminación de datos cross-service',
    description: 'Coordina la eliminación de datos personales a través de múltiples servicios'
  })
  @ApiResponse({ 
    status: HttpStatus.ACCEPTED, 
    description: 'Proceso de eliminación iniciado exitosamente' 
  })
  async orchestrateDeletion(@Body() deletionRequest: any) {
    return this.dsarService.orchestrateDeletion(deletionRequest);
  }

  @Post('validate-retention')
  @ApiOperation({ 
    summary: 'Validar políticas de retención de datos',
    description: 'Valida si los datos pueden ser eliminados según políticas de retención'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Validación de retención completada' 
  })
  async validateRetention(@Body() retentionRequest: any) {
    return this.dsarService.validateRetention(retentionRequest);
  }
}