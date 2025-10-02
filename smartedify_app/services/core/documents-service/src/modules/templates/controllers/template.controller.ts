import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TemplateService, CreateTemplateDto } from '../services/template.service';
import { DocumentTemplate } from '../entities/document-template.entity';
import { DocumentType, DocumentCategory } from '../../documents/entities/document.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new document template' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Template created successfully' })
  async createTemplate(
    @CurrentTenant() tenantId: string,
    @Body() createDto: Omit<CreateTemplateDto, 'tenantId'>,
  ): Promise<DocumentTemplate> {
    return this.templateService.createTemplate({
      ...createDto,
      tenantId,
    });
  }

  @Put(':templateId')
  @ApiOperation({ summary: 'Update a document template' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template updated successfully' })
  async updateTemplate(
    @CurrentTenant() tenantId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() updateDto: Partial<CreateTemplateDto>,
  ): Promise<DocumentTemplate> {
    return this.templateService.updateTemplate(templateId, tenantId, updateDto);
  }

  @Get(':templateId')
  @ApiOperation({ summary: 'Get a template by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template retrieved successfully' })
  async getTemplate(
    @CurrentTenant() tenantId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ): Promise<DocumentTemplate> {
    const template = await this.templateService.findById(templateId, tenantId);
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get a template by code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template retrieved successfully' })
  async getTemplateByCode(
    @CurrentTenant() tenantId: string,
    @Param('code') code: string,
  ): Promise<DocumentTemplate> {
    const template = await this.templateService.findByCode(code, tenantId);
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  @Get()
  @ApiOperation({ summary: 'Get templates with filters' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Templates retrieved successfully' })
  async getTemplates(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: DocumentType,
    @Query('category') category?: DocumentCategory,
    @Query('countryCode') countryCode?: string,
    @Query('language') language?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<DocumentTemplate[]> {
    const filters = {
      type,
      category,
      countryCode,
      language,
      isActive,
    };

    return this.templateService.findTemplates(tenantId, filters);
  }

  @Post(':templateId/preview')
  @ApiOperation({ summary: 'Preview template with data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template preview generated successfully' })
  async previewTemplate(
    @CurrentTenant() tenantId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() data: Record<string, any>,
  ): Promise<{
    content: string;
    validation: {
      isValid: boolean;
      missingVariables: string[];
      errors: string[];
    };
  }> {
    return this.templateService.previewTemplate(templateId, tenantId, data);
  }

  @Delete(':templateId')
  @ApiOperation({ summary: 'Deactivate a template' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template deactivated successfully' })
  async deactivateTemplate(
    @CurrentTenant() tenantId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ): Promise<{ message: string }> {
    await this.templateService.deactivateTemplate(templateId, tenantId);
    return { message: 'Template deactivated successfully' };
  }
}