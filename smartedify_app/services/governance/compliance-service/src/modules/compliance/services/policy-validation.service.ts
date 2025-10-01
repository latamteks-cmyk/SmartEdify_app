import { Injectable } from '@nestjs/common';
import { RegulatoryProfile } from '../entities/regulatory-profile.entity';
import { ValidateAssemblyDto } from '../dto/validate-assembly.dto';
import { ValidateQuorumDto } from '../dto/validate-quorum.dto';
import { ValidateMajorityDto } from '../dto/validate-majority.dto';

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  requirements?: Record<string, any>;
  computedValues?: Record<string, any>;
}

@Injectable()
export class PolicyValidationService {
  async validateAssembly(
    dto: ValidateAssemblyDto,
    profile: RegulatoryProfile,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requirements: Record<string, any> = {};
    const computedValues: Record<string, any> = {};

    // Validar días de aviso
    const noticeDate = new Date(dto.noticeDate);
    const scheduledDate = new Date(dto.scheduledDate);
    const daysDifference = Math.ceil(
      (scheduledDate.getTime() - noticeDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const minNoticeDays = profile.assemblyRules.minNoticedays;
    requirements.minNoticeDays = minNoticeDays;
    computedValues.actualNoticeDays = daysDifference;

    if (daysDifference < minNoticeDays) {
      errors.push(
        `Notice period is ${daysDifference} days, but minimum required is ${minNoticeDays} days`,
      );
    }

    // Validar modalidad permitida
    if (dto.modality && !profile.assemblyRules.allowedMethods.includes(dto.modality)) {
      errors.push(
        `Assembly modality '${dto.modality}' is not allowed. Permitted methods: ${profile.assemblyRules.allowedMethods.join(', ')}`,
      );
    }

    // Validar tipo de asamblea
    if (dto.assemblyType === 'EMERGENCY' && daysDifference < 1) {
      warnings.push(
        'Emergency assembly with less than 24 hours notice. Ensure legal justification is documented.',
      );
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      requirements,
      computedValues,
    };
  }

  async validateQuorum(
    dto: ValidateQuorumDto,
    profile: RegulatoryProfile,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requirements: Record<string, any> = {};
    const computedValues: Record<string, any> = {};

    // Obtener requisito de quórum según el número de llamada
    const quorumRequirement = dto.callNumber === 1 
      ? profile.assemblyRules.quorumRequirements.firstCall
      : profile.assemblyRules.quorumRequirements.secondCall;

    const attendancePercentage = (dto.currentAttendance / dto.totalEligible) * 100;
    
    requirements.quorumPercentage = quorumRequirement;
    requirements.callNumber = dto.callNumber;
    computedValues.attendancePercentage = Math.round(attendancePercentage * 100) / 100;
    computedValues.currentAttendance = dto.currentAttendance;
    computedValues.totalEligible = dto.totalEligible;

    if (attendancePercentage < quorumRequirement) {
      errors.push(
        `Quorum not met. Current attendance: ${attendancePercentage.toFixed(2)}%, required: ${quorumRequirement}%`,
      );
    }

    // Advertencia si está muy cerca del límite
    if (attendancePercentage >= quorumRequirement && attendancePercentage < quorumRequirement + 5) {
      warnings.push(
        'Quorum barely met. Consider waiting for more attendees to ensure stability.',
      );
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      requirements,
      computedValues,
    };
  }

  async validateMajority(
    dto: ValidateMajorityDto,
    profile: RegulatoryProfile,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requirements: Record<string, any> = {};
    const computedValues: Record<string, any> = {};

    const totalVotes = dto.votesFor + dto.votesAgainst + dto.abstentions;
    const forPercentage = totalVotes > 0 ? (dto.votesFor / totalVotes) * 100 : 0;

    // Determinar tipo de mayoría requerida según el tipo de votación
    let requiredMajority: number;
    let majorityType: string;

    // Lógica simplificada - en producción esto sería más complejo
    switch (dto.voteType) {
      case 'BUDGET_APPROVAL':
      case 'ORDINARY_MATTER':
        requiredMajority = profile.assemblyRules.majorityRequirements.simple;
        majorityType = 'simple';
        break;
      case 'STATUTE_CHANGE':
      case 'DISSOLUTION':
        requiredMajority = profile.assemblyRules.majorityRequirements.qualified;
        majorityType = 'qualified';
        break;
      case 'CONSTITUTIONAL_CHANGE':
        requiredMajority = profile.assemblyRules.majorityRequirements.unanimous;
        majorityType = 'unanimous';
        break;
      default:
        requiredMajority = profile.assemblyRules.majorityRequirements.simple;
        majorityType = 'simple';
    }

    requirements.majorityPercentage = requiredMajority;
    requirements.majorityType = majorityType;
    computedValues.forPercentage = Math.round(forPercentage * 100) / 100;
    computedValues.totalVotes = totalVotes;
    computedValues.votesFor = dto.votesFor;
    computedValues.votesAgainst = dto.votesAgainst;
    computedValues.abstentions = dto.abstentions;

    if (forPercentage < requiredMajority) {
      errors.push(
        `Required ${majorityType} majority not achieved. Votes in favor: ${forPercentage.toFixed(2)}%, required: ${requiredMajority}%`,
      );
    }

    // Advertencia para abstenciones altas
    const abstentionPercentage = (dto.abstentions / totalVotes) * 100;
    if (abstentionPercentage > 20) {
      warnings.push(
        `High abstention rate: ${abstentionPercentage.toFixed(2)}%. Consider clarifying the proposal.`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      requirements,
      computedValues,
    };
  }
}