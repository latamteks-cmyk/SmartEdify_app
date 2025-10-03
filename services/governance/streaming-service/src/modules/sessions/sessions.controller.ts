import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { AssemblySession, SessionStatus, SessionModality } from './entities/assembly-session.entity';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { MtlsGuard } from '../../common/guards/mtls.guard';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  private readonly logger = new Logger(SessionsController.name);

  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @UseGuards(MtlsGuard) // Only internal services (governance-service) can create sessions
  @ApiOperation({ summary: 'Create a new streaming session (Internal only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session created successfully',
    type: AssemblySession,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Maximum sessions limit reached',
  })
  async create(
    @Body() createSessionDto: CreateSessionDto,
    @TenantId() tenantId: string,
  ): Promise<AssemblySession> {
    this.logger.log(`Creating session for assembly ${createSessionDto.assemblyId}`);
    return await this.sessionsService.create(createSessionDto, tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sessions with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sessions retrieved successfully',
    type: [AssemblySession],
  })
  @ApiQuery({ name: 'assemblyId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: SessionStatus })
  @ApiQuery({ name: 'modality', required: false, enum: SessionModality })
  async findAll(
    @Query('assemblyId') assemblyId?: string,
    @Query('status') status?: SessionStatus,
    @Query('modality') modality?: SessionModality,
    @TenantId() tenantId?: string,
  ): Promise<AssemblySession[]> {
    return await this.sessionsService.findAll(tenantId, {
      assemblyId,
      status,
      modality,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session retrieved successfully',
    type: AssemblySession,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<AssemblySession> {
    return await this.sessionsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session updated successfully',
    type: AssemblySession,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot update active or completed session',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSessionDto: UpdateSessionDto,
    @TenantId() tenantId: string,
  ): Promise<AssemblySession> {
    return await this.sessionsService.update(id, updateSessionDto, tenantId);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session started successfully',
    type: AssemblySession,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only scheduled sessions can be started',
  })
  async start(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<AssemblySession> {
    this.logger.log(`Starting session ${id}`);
    return await this.sessionsService.start(id, tenantId);
  }

  @Post(':id/end')
  @UseGuards(MtlsGuard) // Only internal services (governance-service) can end sessions
  @ApiOperation({ summary: 'End session (Internal only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session ended successfully',
    type: AssemblySession,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only active sessions can be ended',
  })
  async end(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() endSessionDto: EndSessionDto,
    @TenantId() tenantId: string,
  ): Promise<AssemblySession> {
    this.logger.log(`Ending session ${id}`);
    return await this.sessionsService.end(id, tenantId, {
      merkleRoot: endSessionDto.merkleRoot,
      commitHeight: endSessionDto.commitHeight,
    });
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session cancelled successfully',
    type: AssemblySession,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel completed session',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
    @TenantId() tenantId?: string,
  ): Promise<AssemblySession> {
    this.logger.log(`Cancelling session ${id}`);
    return await this.sessionsService.cancel(id, tenantId, reason);
  }

  @Get(':id/recording-url')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get temporary signed recording URL' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recording URL retrieved successfully',
  })
  async getRecordingUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<{ url: string; expiresAt: string }> {
    // This would be implemented in RecordingService
    // For now, return the stored URL
    const session = await this.sessionsService.findOne(id, tenantId);
    return {
      url: session.recordingUrl || '',
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    };
  }

  @Get(':id/audit-proof')
  @ApiOperation({ summary: 'Get audit proof for session (Public endpoint)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit proof retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async getAuditProof(@Param('id', ParseUUIDPipe) id: string) {
    return await this.sessionsService.getAuditProof(id);
  }
}