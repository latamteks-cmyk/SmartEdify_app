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
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { VotesService } from './votes.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { UpdateVoteDto } from './dto/update-vote.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Vote, VoteStatus } from './entities/vote.entity';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Votes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vote' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Vote created successfully',
    type: Vote,
  })
  async create(
    @Body() createVoteDto: CreateVoteDto,
    @TenantId() tenantId: string,
    @Request() req: any,
  ): Promise<Vote> {
    return await this.votesService.create(createVoteDto, tenantId, req.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all votes with pagination and filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Votes retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'assemblyId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: VoteStatus })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('assemblyId') assemblyId?: string,
    @Query('status') status?: VoteStatus,
    @TenantId() tenantId?: string,
  ) {
    return await this.votesService.findAll(tenantId, paginationDto, assemblyId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vote by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote retrieved successfully',
    type: Vote,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Vote> {
    return await this.votesService.findOne(id, tenantId);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get vote results' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote results retrieved successfully',
  })
  async getResults(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return await this.votesService.getVoteResults(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vote' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote updated successfully',
    type: Vote,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVoteDto: UpdateVoteDto,
    @TenantId() tenantId: string,
  ): Promise<Vote> {
    return await this.votesService.update(id, updateVoteDto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vote' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Vote deleted successfully',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    return await this.votesService.remove(id, tenantId);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate vote' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote activated successfully',
    type: Vote,
  })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Vote> {
    return await this.votesService.activate(id, tenantId);
  }

  @Post(':id/cast')
  @ApiOperation({ summary: 'Cast a vote' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote cast successfully',
    type: Vote,
  })
  async castVote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() castVoteDto: CastVoteDto,
    @TenantId() tenantId: string,
    @Request() req: any,
  ): Promise<Vote> {
    return await this.votesService.castVote(id, castVoteDto, tenantId, req.userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete vote' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote completed successfully',
    type: Vote,
  })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Vote> {
    return await this.votesService.complete(id, tenantId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel vote' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote cancelled successfully',
    type: Vote,
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<Vote> {
    return await this.votesService.cancel(id, tenantId);
  }
}