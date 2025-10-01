import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CompliancePolicy } from './entities/compliance-policy.entity';
import { RegulatoryProfile } from './entities/regulatory-profile.entity';
import { ComplianceValidation } from './entities/compliance-validation.entity';
import { PolicyValidationService } from './services/policy-validation.service';
import { RegulatoryProfileService } from './services/regulatory-profile.service';
import { ValidateAssemblyDto } from './dto/validate-assembly.dto';
import { ValidateQuorumDto } from './dto/validate-quorum.dto';
import { ValidateMajorityDto } from './dto/validate-majority.dto';

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(CompliancePolicy)
    private readonly policyRepository: Repository<CompliancePolicy>,
    @InjectRepository(RegulatoryProfile)
    private readonly profileRepository: Repository<RegulatoryProfile>,
    @InjectRepository(ComplianceValidation)
    private readonly validationRepository: Repository<ComplianceValidation>,
    private readonly policyValidationService: PolicyValidationService,
    private readonly regulatoryProfileService: RegulatoryProfileService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async validateAssembly(dto: ValidateAssemblyDto) {
    const profile = await this.regulatoryProfileService.getProfile(
      dto.tenantId,
      dto.countryCode,
    );

    if (!profile) {
      throw new BadRequestException(
        `No regulatory profile found for tenant ${dto.tenantId} in ${dto.countryCode}`,
      );
    }

    const validation = await this.policyValidationService.validateAssembly(
      dto,
      profile,
    );

    // Guardar validación
    const validationRecord = this.validationRepository.create({
      tenantId: dto.tenantId,
      validationType: 'ASSEMBLY',
      entityId: dto.assemblyId,
      isValid: validation.isValid,
      validationResult: validation,
      metadata: {
        countryCode: dto.countryCode,
        assemblyType: dto.assemblyType,
      },
    });

    await this.validationRepository.save(validationRecord);

    // Emitir evento
    this.eventEmitter.emit('compliance.assembly.validated', {
      tenantId: dto.tenantId,
      assemblyId: dto.assemblyId,
      validation: validation,
      timestamp: new Date(),
    });

    return validation;
  }

  async validateQuorum(dto: ValidateQuorumDto) {
    const profile = await this.regulatoryProfileService.getProfile(
      dto.tenantId,
      dto.countryCode,
    );

    const validation = await this.policyValidationService.validateQuorum(
      dto,
      profile,
    );

    // Guardar validación
    const validationRecord = this.validationRepository.create({
      tenantId: dto.tenantId,
      validationType: 'QUORUM',
      entityId: dto.assemblyId,
      isValid: validation.isValid,
      validationResult: validation,
      metadata: {
        currentAttendance: dto.currentAttendance,
        totalEligible: dto.totalEligible,
      },
    });

    await this.validationRepository.save(validationRecord);

    return validation;
  }

  async validateMajority(dto: ValidateMajorityDto) {
    const profile = await this.regulatoryProfileService.getProfile(
      dto.tenantId,
      dto.countryCode,
    );

    const validation = await this.policyValidationService.validateMajority(
      dto,
      profile,
    );

    // Guardar validación
    const validationRecord = this.validationRepository.create({
      tenantId: dto.tenantId,
      validationType: 'MAJORITY',
      entityId: dto.voteId,
      isValid: validation.isValid,
      validationResult: validation,
      metadata: {
        votesFor: dto.votesFor,
        votesAgainst: dto.votesAgainst,
        abstentions: dto.abstentions,
      },
    });

    await this.validationRepository.save(validationRecord);

    return validation;
  }

  async getPolicies(
    tenantId: string,
    filters: { countryCode?: string; propertyType?: string },
  ) {
    const queryBuilder = this.policyRepository
      .createQueryBuilder('policy')
      .where('policy.tenantId = :tenantId', { tenantId })
      .andWhere('policy.isActive = :isActive', { isActive: true });

    if (filters.countryCode) {
      queryBuilder.andWhere('policy.countryCode = :countryCode', {
        countryCode: filters.countryCode,
      });
    }

    if (filters.propertyType) {
      queryBuilder.andWhere('policy.propertyType = :propertyType', {
        propertyType: filters.propertyType,
      });
    }

    return queryBuilder.getMany();
  }

  async getRegulatoryProfile(tenantId: string) {
    return this.profileRepository.findOne({
      where: { tenantId },
    });
  }
}