import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  Req,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { ValidateBiometricDto } from './dto/validate-biometric.dto';
import { ValidateCodeDto } from './dto/validate-code.dto';
import { RegisterAttendeeDto } from './dto/register-attendee.dto';
import { SessionAttendee } from './entities/session-attendee.entity';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { UserId } from '../../common/decorators/user-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { DPoPGuard } from '../../common/guards/dpop.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Attendance')
@Controller('sessions/:sessionId/attendance')
@UseGuards(ThrottlerGuard) // Rate limiting for all attendance endpoints
export class AttendanceController {
  private readonly logger = new Logger(AttendanceController.name);

  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('validate-qr')
  @UseGuards(JwtAuthGuard, TenantGuard, DPoPGuard)
  @ApiBearerAuth()
  @ApiSecurity('DPoPAuth')
  @ApiOperation({ summary: 'Validate QR code for attendance' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'QR code validated successfully',
    type: SessionAttendee,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid QR code or user already registered',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async validateQr(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() validateQrDto: ValidateQrDto,
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Req() req: Request,
  ): Promise<SessionAttendee> {
    this.logger.log(`QR validation attempt for session ${sessionId}, user ${userId}`);
    
    return await this.attendanceService.validateQr(
      sessionId,
      validateQrDto,
      tenantId,
      userId,
      req.ip,
      req.get('User-Agent') || '',
    );
  }

  @Post('validate-biometric')
  @UseGuards(JwtAuthGuard, TenantGuard, DPoPGuard)
  @ApiBearerAuth()
  @ApiSecurity('DPoPAuth')
  @ApiOperation({ summary: 'Validate biometric data for attendance' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Biometric validation successful',
    type: SessionAttendee,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Biometric validation failed or user already registered',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async validateBiometric(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() validateBiometricDto: ValidateBiometricDto,
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Req() req: Request,
  ): Promise<SessionAttendee> {
    this.logger.log(`Biometric validation attempt for session ${sessionId}, user ${userId}`);
    
    return await this.attendanceService.validateBiometric(
      sessionId,
      validateBiometricDto,
      tenantId,
      userId,
      req.ip,
      req.get('User-Agent') || '',
    );
  }

  @Post('validate-code')
  @UseGuards(JwtAuthGuard, TenantGuard, DPoPGuard)
  @ApiBearerAuth()
  @ApiSecurity('DPoPAuth')
  @ApiOperation({ summary: 'Validate SMS/Email code for attendance' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Code validation successful',
    type: SessionAttendee,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid code or user already registered',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async validateCode(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() validateCodeDto: ValidateCodeDto,
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Req() req: Request,
  ): Promise<SessionAttendee> {
    this.logger.log(`Code validation attempt for session ${sessionId}, user ${userId}`);
    
    return await this.attendanceService.validateCode(
      sessionId,
      validateCodeDto,
      tenantId,
      userId,
      req.ip,
      req.get('User-Agent') || '',
    );
  }

  @Post('register-attendee')
  @UseGuards(JwtAuthGuard, TenantGuard, DPoPGuard)
  @ApiBearerAuth()
  @ApiSecurity('DPoPAuth')
  @ApiOperation({ summary: 'Manually register attendee (moderator only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Attendee registered successfully',
    type: SessionAttendee,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User already registered or invalid data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions (moderator required)',
  })
  async registerAttendee(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() registerAttendeeDto: RegisterAttendeeDto,
    @TenantId() tenantId: string,
    @UserId() moderatorId: string,
    @Req() req: Request,
  ): Promise<SessionAttendee> {
    this.logger.log(`Manual registration attempt for session ${sessionId}, user ${registerAttendeeDto.userId} by moderator ${moderatorId}`);
    
    return await this.attendanceService.registerAttendee(
      sessionId,
      registerAttendeeDto,
      tenantId,
      moderatorId,
      req.ip,
      req.get('User-Agent') || '',
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all attendees for session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attendees retrieved successfully',
    type: [SessionAttendee],
  })
  async getAttendees(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @TenantId() tenantId: string,
  ): Promise<SessionAttendee[]> {
    return await this.attendanceService.getSessionAttendees(sessionId, tenantId);
  }

  @Post(':userId/mark-left')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark attendee as left' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attendee marked as left',
    type: SessionAttendee,
  })
  async markAttendeeAsLeft(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @TenantId() tenantId: string,
  ): Promise<SessionAttendee> {
    return await this.attendanceService.markAttendeeAsLeft(sessionId, userId, tenantId);
  }
}