import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JtiStoreService } from '../../../../../src/modules/auth/store/jti-store.service';
import { DpopReplayProof } from '../../../../../src/modules/auth/entities/dpop-replay-proof.entity';

describe('JtiStoreService', () => {
  let service: JtiStoreService;
  let repo: Repository<DpopReplayProof>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JtiStoreService,
        {
          provide: getRepositoryToken(DpopReplayProof),
          useValue: {
            delete: jest.fn().mockResolvedValue({}),
            insert: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<JtiStoreService>(JtiStoreService);
    repo = module.get<Repository<DpopReplayProof>>(getRepositoryToken(DpopReplayProof));
  });

  it('should register non-replayed jti successfully', async () => {
    await service.register({ tenantId: 't1', jkt: 'thumb', jti: 'id-1', iat: Math.floor(Date.now() / 1000) });
    expect(repo.delete).toHaveBeenCalled();
    expect(repo.insert).toHaveBeenCalled();
  });
});

