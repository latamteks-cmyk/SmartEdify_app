import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ValidateAssemblyDto } from './dto/validate-assembly.dto';
import { ValidateQuorumDto } from './dto/validate-quorum.dto';
import { ValidateMajorityDto } from './dto/validate-majority.dto';

@ApiTags('compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('api/v1/compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('validate/assembly')
  @ApiOperation({ summary: 'Validar convocatoria de asamblea' })
  @ApiResponse({ status: 200, description: 'Validación completada' })
  @ApiResponse({ status: 400, description: 'Validación fallida' })
  async validateAssembly(
    @Body() validateAssemblyDto: ValidateAssemblyDto,
  ) {
    return this.complianceService.validateAssembly(validateAssemblyDto);
  }

  @Post('validate/quorum')
  @ApiOperation({ summary: 'Validar quórum requerido' })
  @ApiResponse({ status: 200, description: 'Quórum validado' })
  async validateQuorum(
    @Body() validateQuorumDto: ValidateQuorumDto,
  ) {
    return this.complianceService.validateQuorum(validateQuorumDto);
  }

  @Post('validate/majority')
  @ApiOperation({ summary: 'Validar mayoría requerida' })
  @ApiResponse({ status: 200, description: 'Mayoría validada' })
  async validateMajority(
    @Body() validateMajorityDto: ValidateMajorityDto,
  ) {
    return this.complianceService.validateMajority(validateMajorityDto);
  }

  @Get('policies/:tenantId')
  @ApiOperation({ summary: 'Obtener políticas activas por tenant' })
  @ApiQuery({ name: 'country_code', required: false })
  @ApiQuery({ name: 'property_type', required: false })
  async getPolicies(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query('country_code') countryCode?: string,
    @Query('property_type') propertyType?: string,
  ) {
    return this.complianceService.getPolicies(tenantId, {
      countryCode,
      propertyType,
    });
  }

  @Get('regulatory-profile/:tenantId')
  @ApiOperation({ summary: 'Obtener perfil regulatorio del tenant' })
  async getRegulatoryProfile(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    return this.complianceService.getRegulatoryProfile(tenantId);
  }
}