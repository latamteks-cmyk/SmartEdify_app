import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Session } from '../../../../src/modules/sessions/entities/session.entity';
import { RevocationEvent } from '../../../../src/modules/sessions/entities/revocation-event.entity';
import { SessionsService } from '../../../../src/modules/sessions/sessions.service';
import { Repository } from 'typeorm';

describe('SessionsService', () => {
  let service: SessionsService;
  let sessionRepository: Repository<Session>;
  let revocationEventRepository: Repository<RevocationEvent>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: getRepositoryToken(Session),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(RevocationEvent),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    sessionRepository = module.get<Repository<Session>>(getRepositoryToken(Session));
    revocationEventRepository = module.get<Repository<RevocationEvent>>(getRepositoryToken(RevocationEvent));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get active sessions for a user', async () => {
    const mockSessions = [
      {
        id: 'session-1',
        user: { id: 'user-1' } as any,
        tenant_id: 'tenant-1',
        device_id: 'device-1',
        cnf_jkt: 'jkt-1',
        issued_at: new Date(),
        not_after: new Date(Date.now() + 3600000), // 1 hour from now
        version: 1,
        created_at: new Date(),
      },
    ];

    jest.spyOn(sessionRepository, 'find').mockResolvedValue(mockSessions as any);

    const result = await service.getActiveSessions('user-1', 'tenant-1');
    expect(result).toEqual([
      {
        id: 'session-1',
        device_id: 'device-1',
        cnf_jkt: 'jkt-1',
        issued_at: mockSessions[0].issued_at,
        not_after: mockSessions[0].not_after,
        version: mockSessions[0].version,
        created_at: mockSessions[0].created_at,
      }
    ]);
  });

  it('should revoke user sessions', async () => {
    const userId = 'user-1';
    const tenantId = 'tenant-1';

    // Mock the update operation
    jest.spyOn(sessionRepository, 'update').mockResolvedValue({} as any);

    // Mock the revocation event save operation
    const mockRevocationEvent = {
      type: 'USER_LOGOUT',
      subject: userId,
      tenant_id: tenantId,
      not_before: new Date(),
    };
    jest.spyOn(revocationEventRepository, 'create').mockReturnValue(mockRevocationEvent as any);
    jest.spyOn(revocationEventRepository, 'save').mockResolvedValue(mockRevocationEvent as any);

    await service.revokeUserSessions(userId, tenantId);

    expect(sessionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: userId },
        tenant_id: tenantId,
      }),
      expect.objectContaining({ revoked_at: expect.any(Date) })
    );
    expect(revocationEventRepository.create).toHaveBeenCalledWith({
      type: 'USER_LOGOUT',
      subject: userId,
      tenant_id: tenantId,
      not_before: expect.any(Date),
    });
    expect(revocationEventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'USER_LOGOUT',
        subject: userId,
        tenant_id: tenantId,
      })
    );
  });

  it('should get not before time', async () => {
    const mockRevocationEvent = {
      id: 'event-1',
      type: 'USER_LOGOUT',
      subject: 'user-1',
      tenant_id: 'tenant-1',
      not_before: new Date(Date.now() - 10000), // 10 seconds ago
    };

    jest.spyOn(revocationEventRepository, 'findOne').mockResolvedValue(mockRevocationEvent as any);

    const result = await service.getNotBeforeTime('user-1', 'tenant-1');
    expect(result).toEqual(mockRevocationEvent.not_before);
    expect(revocationEventRepository.findOne).toHaveBeenCalledWith({
      where: { subject: 'user-1', tenant_id: 'tenant-1', type: 'USER_LOGOUT' },
      order: { created_at: 'DESC' },
    });
  });
});
