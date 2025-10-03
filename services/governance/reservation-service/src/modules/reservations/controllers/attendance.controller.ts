import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from '../services/attendance.service';
import { Attendance, CheckInMethod } from '../entities/attendance.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { DPoPGuard } from '../../../common/guards/dpop.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('reservations/:reservationId/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @UseGuards(DPoPGuard)
  @ApiOperation({ summary: 'Check in to reservation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Check-in successful' })
  async checkIn(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() body: {
      method: CheckInMethod;
      payload?: string; // QR code, biometric data, SMS code
      location?: { lat: number; lng: number };
    },
  ): Promise<Attendance> {
    return this.attendanceService.checkIn({
      tenantId,
      reservationId,
      userId: user.sub,
      method: body.method,
      payload: body.payload,
      location: body.location,
      bySub: user.sub,
    });
  }

  @Post('check-out')
  @UseGuards(DPoPGuard)
  @ApiOperation({ summary: 'Check out from reservation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Check-out successful' })
  async checkOut(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() body: {
      method: CheckInMethod;
      payload?: string;
    },
  ): Promise<Attendance> {
    return this.attendanceService.checkOut({
      tenantId,
      reservationId,
      userId: user.sub,
      method: body.method,
      payload: body.payload,
      bySub: user.sub,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get attendance record' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Attendance record retrieved' })
  async getAttendance(
    @CurrentTenant() tenantId: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<Attendance | null> {
    return this.attendanceService.getAttendance(tenantId, reservationId);
  }
}