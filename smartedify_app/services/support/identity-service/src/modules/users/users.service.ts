import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ConsentAudit } from './entities/consent-audit.entity';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ConsentAudit)
    private consentAuditRepository: Repository<ConsentAudit>,
    private dataSource: DataSource,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, consent_granted, policy_version, ...rest } = createUserDto;

    return this.dataSource.transaction(async (transactionalEntityManager) => {
      let hashedPassword: string | undefined;
      if (password) {
        hashedPassword = await argon2.hash(password);
      }

      const user = transactionalEntityManager.create(User, {
        ...rest,
        password: hashedPassword,
      });
      const savedUser = await transactionalEntityManager.save(user);

      const consentAudit = transactionalEntityManager.create(ConsentAudit, {
        user: savedUser,
        consent_type: 'terms_of_service',
        consent_granted: consent_granted,
        policy_version: policy_version,
        // ip_address and user_agent would ideally be passed from the controller
      });
      await transactionalEntityManager.save(consentAudit);

      return savedUser;
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
