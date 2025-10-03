import { Test, TestingModule } from '@nestjs/testing';
import { PrivacyService } from '../../../../src/modules/privacy/privacy.service';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { ComplianceService } from '../../../../src/modules/compliance/compliance.service';

describe('PrivacyService', () => {
  let service: PrivacyService;
  let httpService: HttpService;
  let complianceService: ComplianceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ComplianceService,
          useValue: {
            exportData: jest.fn().mockResolvedValue({ id: 'job-1', status_callback_url: 'http://cb' }),
            deleteData: jest.fn().mockResolvedValue({ id: 'job-2', status_callback_url: 'http://cb' }),
          },
        },
      ],
    }).compile();

    service = module.get<PrivacyService>(PrivacyService);
    httpService = module.get<HttpService>(HttpService);
    complianceService = module.get<ComplianceService>(ComplianceService);
  });

  it('should export user data via compliance service after tenant validation', async () => {
    (httpService.get as jest.Mock).mockReturnValue(of({ status: 200, data: { tenant_id: 'tenant-a' } }));
    const result = await service.exportUserData({ user_id: 'u1', tenant_id: 'tenant-a' });
    expect(complianceService.exportData).toHaveBeenCalled();
    expect(result).toHaveProperty('job_id');
    expect(result.status).toBe('ACCEPTED');
  });

  it('should require verification_code for delete data', async () => {
    (httpService.get as jest.Mock).mockReturnValue(of({ status: 200, data: { tenant_id: 'tenant-b' } }));
    await expect(
      service.deleteUserData({ user_id: 'u1', tenant_id: 'tenant-b', verification_code: '' as unknown as string }),
    ).rejects.toThrow('verification_code is required');
  });

  it('should delete user data when verification_code provided', async () => {
    (httpService.get as jest.Mock).mockReturnValue(of({ status: 200, data: { tenant_id: 'tenant-b' } }));
    const result = await service.deleteUserData({ user_id: 'u1', tenant_id: 'tenant-b', verification_code: '123456' });
    expect(complianceService.deleteData).toHaveBeenCalled();
    expect(result).toHaveProperty('job_id');
  });

  it('should throw on invalid tenant', async () => {
    (httpService.get as jest.Mock).mockReturnValue(throwError(() => new Error('down')));
    await expect(service.exportUserData({ user_id: 'u', tenant_id: 'bad' })).rejects.toThrow('Invalid user_id or tenant_id');
  });
});
