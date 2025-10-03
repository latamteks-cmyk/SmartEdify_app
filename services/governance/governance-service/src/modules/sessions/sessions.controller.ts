import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Session, SessionStatus } from './entities/session.entity';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session created successfully',
    type: Session,
  })
  async create(
    @Body() createSessionDto: CreateSessionDto,
    @TenantId() tenantId: string,
  ): Promise<Session> {
    return await this.sessionsService.create(createSessionDto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sessions with pagination and filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sessions retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'assemblyId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: SessionStatus })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('assemblyId') assemblyId?: string,
    @Query('status') status?: SessionStatus,
    @TenantId() tenantId?: string,
  ) {
    return await this.sessionsService.findAll(tenantId, paginationDto, assemblyId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session retrieved successfully',
    type: Session,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Session> {
    return await this.sessionsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session updated successfully',
    type: Session,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSessionDto: UpdateSessionDto,
    @TenantId() tenantId: string,
  ): Promise<Session> {
    return await this.sessionsService.update(id, updateSessionDto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete session' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Session deleted successfully',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    return await this.sessionsService.remove(id, tenantId);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Start session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session started successfully',
    type: Session,
  })
  async start(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Session> {
    return await this.sessionsService.start(id, tenantId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session completed successfully',
    type: Session,
  })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Session> {
    return await this.sessionsService.complete(id, tenantId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session cancelled successfully',
    type: Session,
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Session> {
    return await this.sessionsService.cancel(id, tenantId);
  }
}