import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SignatureService, CreateSignatureDto, SignDocumentDto } from '../services/signature.service';
import { DocumentSignature, SignatureStatus } from '../entities/document-signature.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('Signatures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('signatures')
export class SignatureController {
  constructor(private readonly signatureService: SignatureService) {}

  @Post()
  @ApiOperation({ summary: 'Create a signature request' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Signature request created successfully' })
  async createSignature(
    @CurrentTenant() tenantId: string,
    @Body() createDto: Omit<CreateSignatureDto, 'tenantId'>,
  ): Promise<DocumentSignature> {
    return this.signatureService.createSignature({
      ...createDto,
      tenantId,
    });
  }

  @Put(':signatureId/sign')
  @ApiOperation({ summary: 'Sign a document' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document signed successfully' })
  async signDocument(
    @CurrentTenant() tenantId: string,
    @Param('signatureId', ParseUUIDPipe) signatureId: string,
    @Body() signDto: SignDocumentDto,
  ): Promise<DocumentSignature> {
    return this.signatureService.signDocument(signatureId, tenantId, signDto);
  }

  @Put(':signatureId/reject')
  @ApiOperation({ summary: 'Reject a signature request' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Signature rejected successfully' })
  async rejectSignature(
    @CurrentTenant() tenantId: string,
    @Param('signatureId', ParseUUIDPipe) signatureId: string,
    @Body() body: { reason: string },
  ): Promise<DocumentSignature> {
    return this.signatureService.rejectSignature(signatureId, tenantId, body.reason);
  }

  @Put(':signatureId/cancel')
  @ApiOperation({ summary: 'Cancel a signature request' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Signature cancelled successfully' })
  async cancelSignature(
    @CurrentTenant() tenantId: string,
    @Param('signatureId', ParseUUIDPipe) signatureId: string,
  ): Promise<DocumentSignature> {
    return this.signatureService.cancelSignature(signatureId, tenantId);
  }

  @Post(':signatureId/remind')
  @ApiOperation({ summary: 'Send signature reminder' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reminder sent successfully' })
  async sendReminder(
    @CurrentTenant() tenantId: string,
    @Param('signatureId', ParseUUIDPipe) signatureId: string,
  ): Promise<{ message: string }> {
    await this.signatureService.sendSignatureReminder(signatureId, tenantId);
    return { message: 'Reminder sent successfully' };
  }

  @Get('document/:documentId')
  @ApiOperation({ summary: 'Get signatures for a document' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document signatures retrieved successfully' })
  async getDocumentSignatures(
    @CurrentTenant() tenantId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<DocumentSignature[]> {
    return this.signatureService.getDocumentSignatures(documentId, tenantId);
  }

  @Get('document/:documentId/status')
  @ApiOperation({ summary: 'Get signature status for a document' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Signature status retrieved successfully' })
  async getSignatureStatus(
    @CurrentTenant() tenantId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<{
    totalSignatures: number;
    requiredSignatures: number;
    completedSignatures: number;
    pendingSignatures: number;
    isComplete: boolean;
    nextSigner?: any;
  }> {
    return this.signatureService.getSignatureStatus(documentId, tenantId);
  }

  @Get('user/:signerId')
  @ApiOperation({ summary: 'Get signatures for a user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User signatures retrieved successfully' })
  async getUserSignatures(
    @CurrentTenant() tenantId: string,
    @Param('signerId', ParseUUIDPipe) signerId: string,
    @Query('status') status?: SignatureStatus,
  ): Promise<DocumentSignature[]> {
    return this.signatureService.getUserSignatures(tenantId, signerId, status);
  }
}