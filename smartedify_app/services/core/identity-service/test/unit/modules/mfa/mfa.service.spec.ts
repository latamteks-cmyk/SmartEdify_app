import { Test, TestingModule } from '@nestjs/testing';
import { MfaService } from '../../../../src/modules/mfa/mfa.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { authenticator } from 'otplib';

describe('MfaService', () => {
  let service: MfaService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should generate secret and otp auth url', () => {
    const secret = service.generateSecret('user-1');
    expect(typeof secret).toBe('string');
    const url = service.generateOtpAuthUrl('user-1', 'user1@example.com', secret);
    expect(url).toContain('otpauth://totp/');
  });

  it('should verify TOTP using stored user secret', async () => {
    const userId = 'user-2';
    const secret = authenticator.generateSecret();
    const code = authenticator.generate(secret);
    (usersService.findById as jest.Mock).mockResolvedValue({ id: userId, mfa_secret: secret });

    const ok = await service.verify(userId, code);
    expect(ok).toBe(true);
  });

  it('should return false when user has no secret', async () => {
    (usersService.findById as jest.Mock).mockResolvedValue({ id: 'x', mfa_secret: null });
    const ok = await service.verify('x', '000000');
    expect(ok).toBe(false);
  });
});

