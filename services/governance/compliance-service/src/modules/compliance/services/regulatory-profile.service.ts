import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegulatoryProfile } from '../entities/regulatory-profile.entity';

@Injectable()
export class RegulatoryProfileService {
  constructor(
    @InjectRepository(RegulatoryProfile)
    private readonly profileRepository: Repository<RegulatoryProfile>,
  ) {}

  async getProfile(
    tenantId: string,
    countryCode: string,
  ): Promise<RegulatoryProfile | null> {
    return this.profileRepository.findOne({
      where: {
        tenantId,
        countryCode,
        isActive: true,
      },
    });
  }

  async createDefaultProfile(
    tenantId: string,
    countryCode: string,
  ): Promise<RegulatoryProfile> {
    const defaultRules = this.getDefaultRulesByCountry(countryCode);
    
    const profile = this.profileRepository.create({
      tenantId,
      countryCode,
      legalFramework: defaultRules.legalFramework,
      assemblyRules: defaultRules.assemblyRules,
      votingRules: defaultRules.votingRules,
      financialRules: defaultRules.financialRules,
      laborRules: defaultRules.laborRules,
      dsarRules: defaultRules.dsarRules,
    });

    return this.profileRepository.save(profile);
  }

  private getDefaultRulesByCountry(countryCode: string) {
    switch (countryCode) {
      case 'PE':
        return {
          legalFramework: 'Ley de Propiedad Horizontal - Ley N° 27157',
          assemblyRules: {
            minNoticedays: 15,
            quorumRequirements: {
              firstCall: 60, // 60% para primera convocatoria
              secondCall: 30, // 30% para segunda convocatoria
            },
            majorityRequirements: {
              simple: 50, // 50% + 1
              qualified: 66.67, // 2/3
              unanimous: 100, // 100%
            },
            allowedMethods: ['PRESENCIAL', 'VIRTUAL', 'MIXTA'],
          },
          votingRules: {
            allowedMethods: ['DIGITAL', 'PRESENCIAL', 'DELEGACION'],
            secretVoting: true,
            delegationAllowed: true,
            maxDelegationsPerPerson: 2,
          },
          financialRules: {
            accountingStandard: 'PCGE',
            auditRequired: true,
            reportingFrequency: 'ANNUAL',
            budgetApprovalRequired: true,
          },
          laborRules: {
            payrollSystem: 'PLAME',
            benefitsRequired: ['CTS', 'GRATIFICACION', 'VACACIONES'],
            sst: {
              required: true,
              certificationRequired: false,
            },
          },
          dsarRules: {
            dataRetentionDays: 2555, // ~7 años
            rightToPortability: true,
            rightToErasure: true,
            consentRequired: true,
            breachNotificationHours: 48,
          },
        };

      case 'CO':
        return {
          legalFramework: 'Ley 675 de 2001 - Régimen de Propiedad Horizontal',
          assemblyRules: {
            minNoticedays: 10,
            quorumRequirements: {
              firstCall: 50,
              secondCall: 25,
            },
            majorityRequirements: {
              simple: 50,
              qualified: 70,
              unanimous: 100,
            },
            allowedMethods: ['PRESENCIAL', 'VIRTUAL', 'MIXTA'],
          },
          votingRules: {
            allowedMethods: ['DIGITAL', 'PRESENCIAL'],
            secretVoting: false,
            delegationAllowed: true,
            maxDelegationsPerPerson: 1,
          },
          financialRules: {
            accountingStandard: 'NIIF',
            auditRequired: false,
            reportingFrequency: 'QUARTERLY',
            budgetApprovalRequired: true,
          },
          laborRules: {
            payrollSystem: 'PILA',
            benefitsRequired: ['CESANTIAS', 'PRIMA', 'VACACIONES'],
            sst: {
              required: true,
              certificationRequired: true,
            },
          },
          dsarRules: {
            dataRetentionDays: 1825, // ~5 años
            rightToPortability: true,
            rightToErasure: true,
            consentRequired: true,
            breachNotificationHours: 72,
          },
        };

      default:
        // Reglas genéricas conservadoras
        return {
          legalFramework: 'Generic International Standards',
          assemblyRules: {
            minNoticedays: 21,
            quorumRequirements: {
              firstCall: 66.67,
              secondCall: 50,
            },
            majorityRequirements: {
              simple: 50,
              qualified: 66.67,
              unanimous: 100,
            },
            allowedMethods: ['PRESENCIAL'],
          },
          votingRules: {
            allowedMethods: ['PRESENCIAL'],
            secretVoting: true,
            delegationAllowed: false,
            maxDelegationsPerPerson: 0,
          },
          financialRules: {
            accountingStandard: 'IFRS',
            auditRequired: true,
            reportingFrequency: 'ANNUAL',
            budgetApprovalRequired: true,
          },
          laborRules: {
            payrollSystem: 'GENERIC',
            benefitsRequired: [],
            sst: {
              required: false,
              certificationRequired: false,
            },
          },
          dsarRules: {
            dataRetentionDays: 2555,
            rightToPortability: true,
            rightToErasure: true,
            consentRequired: true,
            breachNotificationHours: 72,
          },
        };
    }
  }
}