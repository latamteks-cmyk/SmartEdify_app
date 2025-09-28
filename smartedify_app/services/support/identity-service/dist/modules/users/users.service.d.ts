import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ConsentAudit } from './entities/consent-audit.entity';
export declare class UsersService {
    private usersRepository;
    private consentAuditRepository;
    private dataSource;
    constructor(usersRepository: Repository<User>, consentAuditRepository: Repository<ConsentAudit>, dataSource: DataSource);
    create(createUserDto: CreateUserDto): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
}
