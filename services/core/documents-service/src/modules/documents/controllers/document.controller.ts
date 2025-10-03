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
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DocumentService, CreateDocumentDto } from '../services/document.service';
import { Document, DocumentType, DocumentStatus } from '../entities/document.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Create a new document' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Document created successfully' })
  async createDocument(
    @CurrentTenant() tenantId: string,
    @Body() createDto: Omit<CreateDocumentDto, 'tenantId' | 'file'>,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Document> {
    return this.documentService.createDocument({
      ...createDto,
      tenantId,
      file,
    });
  }

  @Put(':documentId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Update a document' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: HttpStatus.OK, description: 'Document updated successfully' })
  async updateDocument(
    @CurrentTenant() tenantId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() updateData: Partial<Document>,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Document> {
    return this.documentService.updateDocument(documentId, tenantId, updateData, file);
  }

  @Put(':documentId/publish')
  @ApiOperation({ summary: 'Publish a document' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document published successfully' })
  async publishDocument(
    @CurrentTenant() tenantId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<Document> {
    return this.documentService.publishDocument(documentId, tenantId);
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document retrieved successfully' })
  async getDocument(
    @CurrentTenant() tenantId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<Document> {
    return this.documentService.getDocument(documentId, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get documents with filters' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Documents retrieved successfully' })
  async getDocuments(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: DocumentType,
    @Query('status') status?: DocumentStatus,
    @Query('category') category?: string,
    @Query('condominiumId') condominiumId?: string,
    @Query('assemblyId') assemblyId?: string,
    @Query('createdBy') createdBy?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ documents: Document[]; total: number }> {
    const filters = {
      type,
      status,
      category,
      condominiumId,
      assemblyId,
      createdBy,
    };

    const pagination = limit ? { limit: limit || 50, offset: offset || 0 } : undefined;

    return this.documentService.getDocuments(tenantId, filters, pagination);
  }

  @Get(':documentId/download')
  @ApiOperation({ summary: 'Get document download URL' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Download URL generated successfully' })
  async getDownloadUrl(
    @CurrentTenant() tenantId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<{ downloadUrl: string }> {
    const downloadUrl = await this.documentService.getDocumentDownloadUrl(documentId, tenantId);
    return { downloadUrl };
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document deleted successfully' })
  async deleteDocument(
    @CurrentTenant() tenantId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<{ message: string }> {
    await this.documentService.deleteDocument(documentId, tenantId);
    return { message: 'Document deleted successfully' };
  }
}