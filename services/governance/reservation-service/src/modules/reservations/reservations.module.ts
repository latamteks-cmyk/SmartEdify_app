import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { Reservation } from './entities/reservation.entity';
import { Amenity } from './entities/amenity.entity';
import { Attendance } from './entities/attendance.entity';
import { Blackout } from './entities/blackout.entity';
import { WaitlistItem } from './entities/waitlist-item.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';

// Services
import { ReservationService } from './services/reservation.service';
import { AttendanceService } from './services/attendance.service';
import { BlackoutService } from './services/blackout.service';
import { ComplianceService } from '../integrations/compliance.service';
import { FinanceService } from '../integrations/finance.service';

// Controllers
import { ReservationController } from './controllers/reservation.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { BlackoutController } from './controllers/blackout.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      Amenity,
      Attendance,
      Blackout,
      WaitlistItem,
      IdempotencyKey,
    ]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 0,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    ReservationController,
    AttendanceController,
    BlackoutController,
  ],
  providers: [
    ReservationService,
    AttendanceService,
    BlackoutService,
    ComplianceService,
    FinanceService,
  ],
  exports: [
    ReservationService,
    AttendanceService,
    BlackoutService,
    ComplianceService,
    FinanceService,
  ],
})
export class ReservationsModule {}