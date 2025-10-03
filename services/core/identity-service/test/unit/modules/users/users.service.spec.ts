import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../../../src/modules/users/entities/user.entity';
import { UsersService } from '../../../../src/modules/users/users.service';
import { ConsentAudit } from '../../../../src/modules/users/entities/consent-audit.entity';
import { DataSource, Repository } from 'typeorm';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;
  let consentRepository: Repository<ConsentAudit>;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ConsentAudit),
          useClass: Repository,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (runInTransaction: any) => {
              // Provide a minimal transactional entity manager stub
              const manager = {
                create: (entity: any, data: any) => ({ ...data }),
                save: async (entity: any) => entity,
              };
              return runInTransaction(manager);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    consentRepository = module.get<Repository<ConsentAudit>>(getRepositoryToken(ConsentAudit));
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find a user by ID', async () => {
    // Mock the repository method
    const mockUser = {
      id: 'test-id',
      tenant_id: 'test-tenant',
      username: 'test@example.com',
      email: 'test@example.com',
      status: 'ACTIVE' as const,
      created_at: new Date(),
      updated_at: new Date(),
    };

    jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

    const result = await service.findById('test-id');
    expect(result).toEqual(mockUser);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'test-id' },
    });
  });

  it('should find a user by email', async () => {
    // Mock the repository method
    const mockUser = {
      id: 'test-id',
      tenant_id: 'test-tenant',
      username: 'test@example.com',
      email: 'test@example.com',
      status: 'ACTIVE' as const,
      created_at: new Date(),
      updated_at: new Date(),
    };

    jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

    const result = await service.findByEmail('test@example.com');
    expect(result).toEqual(mockUser);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('should create a new user', async () => {
    const userData = {
      tenant_id: 'test-tenant',
      username: 'test-user',
      email: 'test@example.com',
      consent_granted: true,
      policy_version: 'v1',
    };

    const mockCreatedUser = {
      id: 'new-id',
      ...userData,
      status: 'ACTIVE' as const,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Spy on DataSource.transaction to ensure it's used
    const txSpy = jest.spyOn(dataSource, 'transaction');

    // Mock the manager behavior inside transaction
    (dataSource.transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const manager = {
        create: (entity: any, data: any) => ({ ...data }),
        save: async (entity: any) => ({ id: 'new-id', ...entity }),
      };
      return fn(manager);
    });

    const result = await service.create(userData as any);
    expect(result).toEqual(expect.objectContaining({
      id: 'new-id',
      email: 'test@example.com',
      username: 'test-user',
      tenant_id: 'test-tenant',
    }));
    expect(txSpy).toHaveBeenCalled();
  });
});
