import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ComplianceService } from '../compliance/compliance.service';

interface ExportDataRequest {
  user_id: string;
  tenant_id: string;
  format?: 'json' | 'csv';
  include_services?: string[];
}

interface DeleteDataRequest {
  user_id: string;
  tenant_id: string;
  verification_code: string;
  reason?: string;
}

@Injectable()
export class PrivacyService {
  constructor(
    private readonly httpService: HttpService,
    private readonly complianceService: ComplianceService,
  ) {}

  async exportUserData(request: ExportDataRequest) {
    // Validar usuario existe y pertenece al tenant
    await this.validateUserTenant(request.user_id, request.tenant_id);

    // Usar el servicio de compliance existente para crear el job
    const job = await this.complianceService.exportData({
      user_id: request.user_id,
      tenant_id: request.tenant_id,
      affected_services: request.include_services || [
        'governance-service',
        'user-profile-service',
        'asset-management-service',
      ],
      result_callback_url: undefined, // Se puede agregar si se necesita webhook
    });

    return {
      job_id: job.id,
      status: 'ACCEPTED',
      message: 'Data export request has been queued for processing',
      estimated_completion: '15-30 minutes',
      status_callback_url: job.status_callback_url,
    };
  }

  async deleteUserData(request: DeleteDataRequest) {
    // Validar usuario existe y pertenece al tenant
    await this.validateUserTenant(request.user_id, request.tenant_id);

    // TODO: Validar verification_code (OTP, etc.)
    if (!request.verification_code) {
      throw new BadRequestException(
        'verification_code is required for data deletion',
      );
    }

    // Usar el servicio de compliance existente para crear el job
    const job = await this.complianceService.deleteData({
      user_id: request.user_id,
      tenant_id: request.tenant_id,
      affected_services: [
        'sessions-service', // Incluir para revocar sesiones automáticamente
        'governance-service',
        'user-profile-service',
        'asset-management-service',
      ],
      result_callback_url: undefined, // Se puede agregar si se necesita webhook
    });

    return {
      job_id: job.id,
      status: 'ACCEPTED',
      message: 'Data deletion request has been queued for processing',
      warning:
        'This action is irreversible. All user data will be permanently deleted.',
      estimated_completion: '5-10 minutes',
      status_callback_url: job.status_callback_url,
    };
  }

  private async validateUserTenant(
    user_id: string,
    tenant_id: string,
  ): Promise<void> {
    try {
      // Validar que el usuario existe y pertenece al tenant
      // Primero intentar validar localmente en identity-service
      // Si no existe localmente, validar contra user-profile-service
      const response = await firstValueFrom(
        this.httpService.get(
          `http://user-profile-service:3002/api/v1/user-profiles/${user_id}`,
          {
            headers: {
              'X-Tenant-ID': tenant_id,
            },
          },
        ),
      );

      if (response.status !== 200 || response.data?.tenant_id !== tenant_id) {
        throw new BadRequestException(
          'User not found or does not belong to tenant',
        );
      }
    } catch (error) {
      throw new BadRequestException('Invalid user_id or tenant_id');
    }
  }
}
