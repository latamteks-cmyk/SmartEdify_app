import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Session, SessionStatus } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async create(createSessionDto: CreateSessionDto, tenantId: string): Promise<Session> {
    // Validate session dates
    if (createSessionDto.startTime >= createSessionDto.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for overlapping sessions in the same assembly
    const overlapping = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.tenantId = :tenantId', { tenantId })
      .andWhere('session.assemblyId = :assemblyId', { assemblyId: createSessionDto.assemblyId })
      .andWhere('session.status != :status', { status: SessionStatus.CANCELLED })
      .andWhere(
        '(session.startTime <= :endTime AND session.endTime >= :startTime)',
        {
          startTime: createSessionDto.startTime,
          endTime: createSessionDto.endTime,
        }
      )
      .getOne();

    if (overlapping) {
      throw new BadRequestException('Session times overlap with existing session');
    }

    const session = this.sessionRepository.create({
      ...createSessionDto,
      tenantId,
      status: SessionStatus.SCHEDULED,
    });

    return await this.sessionRepository.save(session);
  }

  async findAll(
    tenantId: string,
    paginationDto: PaginationDto,
    assemblyId?: string,
    status?: SessionStatus,
  ): Promise<{ data: Session[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.assembly', 'assembly')
      .where('session.tenantId = :tenantId', { tenantId });

    if (assemblyId) {
      queryBuilder.andWhere('session.assemblyId = :assemblyId', { assemblyId });
    }

    if (status) {
      queryBuilder.andWhere('session.status = :status', { status });
    }

    const [data, total] = await queryBuilder
      .orderBy('session.startTime', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, tenantId: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id, tenantId } as FindOptionsWhere<Session>,
      relations: ['assembly', 'votes'],
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return session;
  }

  async update(id: string, updateSessionDto: UpdateSessionDto, tenantId: string): Promise<Session> {
    const session = await this.findOne(id, tenantId);

    if (!session.canBeModified()) {
      throw new ForbiddenException('Cannot update active or completed session');
    }

    // Validate dates if provided
    if (updateSessionDto.startTime && updateSessionDto.endTime) {
      if (updateSessionDto.startTime >= updateSessionDto.endTime) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    Object.assign(session, updateSessionDto);
    return await this.sessionRepository.save(session);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const session = await this.findOne(id, tenantId);

    if (!session.canBeModified()) {
      throw new ForbiddenException('Only scheduled sessions can be deleted');
    }

    await this.sessionRepository.remove(session);
  }

  async start(id: string, tenantId: string): Promise<Session> {
    const session = await this.findOne(id, tenantId);

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be started');
    }

    session.status = SessionStatus.ACTIVE;
    return await this.sessionRepository.save(session);
  }

  async complete(id: string, tenantId: string): Promise<Session> {
    const session = await this.findOne(id, tenantId);

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Only active sessions can be completed');
    }

    session.status = SessionStatus.COMPLETED;
    return await this.sessionRepository.save(session);
  }

  async cancel(id: string, tenantId: string): Promise<Session> {
    const session = await this.findOne(id, tenantId);

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed session');
    }

    session.status = SessionStatus.CANCELLED;
    return await this.sessionRepository.save(session);
  }
}