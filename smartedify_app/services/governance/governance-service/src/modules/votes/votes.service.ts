import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Vote, VoteStatus, VoteResult } from './entities/vote.entity';
import { CreateVoteDto } from './dto/create-vote.dto';
import { UpdateVoteDto } from './dto/update-vote.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private readonly voteRepository: Repository<Vote>,
  ) {}

  async create(createVoteDto: CreateVoteDto, tenantId: string, userId: string): Promise<Vote> {
    // Validate vote dates
    if (createVoteDto.startTime >= createVoteDto.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    const vote = this.voteRepository.create({
      ...createVoteDto,
      tenantId,
      createdBy: userId,
      status: VoteStatus.DRAFT,
      results: {},
      totalVotes: 0,
      result: VoteResult.PENDING,
    });

    return await this.voteRepository.save(vote);
  }

  async findAll(
    tenantId: string,
    paginationDto: PaginationDto,
    assemblyId?: string,
    status?: VoteStatus,
  ): Promise<{ data: Vote[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.voteRepository
      .createQueryBuilder('vote')
      .leftJoinAndSelect('vote.assembly', 'assembly')
      .leftJoinAndSelect('vote.session', 'session')
      .where('vote.tenantId = :tenantId', { tenantId });

    if (assemblyId) {
      queryBuilder.andWhere('vote.assemblyId = :assemblyId', { assemblyId });
    }

    if (status) {
      queryBuilder.andWhere('vote.status = :status', { status });
    }

    const [data, total] = await queryBuilder
      .orderBy('vote.startTime', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, tenantId: string): Promise<Vote> {
    const vote = await this.voteRepository.findOne({
      where: { id, tenantId } as FindOptionsWhere<Vote>,
      relations: ['assembly', 'session'],
    });

    if (!vote) {
      throw new NotFoundException(`Vote with ID ${id} not found`);
    }

    return vote;
  }

  async update(id: string, updateVoteDto: UpdateVoteDto, tenantId: string): Promise<Vote> {
    const vote = await this.findOne(id, tenantId);

    if (!vote.canBeModified()) {
      throw new ForbiddenException('Cannot update active or completed vote');
    }

    // Validate dates if provided
    if (updateVoteDto.startTime && updateVoteDto.endTime) {
      if (updateVoteDto.startTime >= updateVoteDto.endTime) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    Object.assign(vote, updateVoteDto);
    return await this.voteRepository.save(vote);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const vote = await this.findOne(id, tenantId);

    if (!vote.canBeModified()) {
      throw new ForbiddenException('Only draft votes can be deleted');
    }

    await this.voteRepository.remove(vote);
  }

  async activate(id: string, tenantId: string): Promise<Vote> {
    const vote = await this.findOne(id, tenantId);

    if (vote.status !== VoteStatus.DRAFT) {
      throw new BadRequestException('Only draft votes can be activated');
    }

    if (new Date() > vote.startTime) {
      throw new BadRequestException('Cannot activate vote with past start time');
    }

    vote.status = VoteStatus.ACTIVE;
    return await this.voteRepository.save(vote);
  }

  async castVote(id: string, castVoteDto: CastVoteDto, tenantId: string, userId: string): Promise<Vote> {
    const vote = await this.findOne(id, tenantId);

    if (!vote.isActive()) {
      throw new BadRequestException('Vote is not currently active');
    }

    // Validate vote option
    if (!vote.options.includes(castVoteDto.option)) {
      throw new BadRequestException('Invalid vote option');
    }

    // Update vote results
    const currentResults = vote.results || {};
    currentResults[castVoteDto.option] = (currentResults[castVoteDto.option] || 0) + 1;
    
    vote.results = currentResults;
    vote.totalVotes += 1;

    // Check if vote should be automatically completed
    if (this.shouldAutoComplete(vote)) {
      vote.status = VoteStatus.COMPLETED;
      vote.result = vote.calculateResult();
    }

    return await this.voteRepository.save(vote);
  }

  async complete(id: string, tenantId: string): Promise<Vote> {
    const vote = await this.findOne(id, tenantId);

    if (vote.status !== VoteStatus.ACTIVE) {
      throw new BadRequestException('Only active votes can be completed');
    }

    vote.status = VoteStatus.COMPLETED;
    vote.result = vote.calculateResult();
    
    return await this.voteRepository.save(vote);
  }

  async cancel(id: string, tenantId: string): Promise<Vote> {
    const vote = await this.findOne(id, tenantId);

    if (vote.status === VoteStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed vote');
    }

    vote.status = VoteStatus.CANCELLED;
    return await this.voteRepository.save(vote);
  }

  async getVoteResults(id: string, tenantId: string): Promise<{
    vote: Vote;
    results: Record<string, number>;
    totalVotes: number;
    participationRate: number;
    finalResult: VoteResult;
  }> {
    const vote = await this.findOne(id, tenantId);
    
    const totalEligibleVoters = vote.assembly?.maxParticipants || 100;
    const participationRate = (vote.totalVotes / totalEligibleVoters) * 100;

    return {
      vote,
      results: vote.results,
      totalVotes: vote.totalVotes,
      participationRate,
      finalResult: vote.result,
    };
  }

  private shouldAutoComplete(vote: Vote): boolean {
    // Auto-complete logic based on voting type and participation
    const totalEligibleVoters = vote.assembly?.maxParticipants || 100;
    const participationRate = (vote.totalVotes / totalEligibleVoters) * 100;

    // If we've reached 100% participation or the vote has ended
    return participationRate >= 100 || new Date() >= vote.endTime;
  }
}