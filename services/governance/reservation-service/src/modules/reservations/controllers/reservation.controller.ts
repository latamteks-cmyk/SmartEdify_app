import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationService, CreateReservationRequest } from '../services/reservation.service';
import { Reservation } from '../entities/reservation.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { DPoPGuard } from '../../../common/guards/dpop.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @UseGuards(DPoPGuard)
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Reservation created successfully' })
  async createReservation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: {
      condominiumId: string;
      amenityId: string;
      startTime: string;
      endTime: string;
      partySize: number;
    },
  ): Promise<Reservation> {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    const request: CreateReservationRequest = {
      tenantId,
      condominiumId: body.condominiumId,
      amenityId: body.amenityId,
      userId: user.sub,
      createdBy: user.sub,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      partySize: body.partySize,
      idempotencyKey,
    };

    return this.reservationService.createReservation(request);
  }

  @Get('availability/:amenityId')
  @ApiOperation({ summary: 'Get amenity availability' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Availability retrieved successfully' })
  async getAvailability(
    @CurrentTenant() tenantId: string,
    @Param('amenityId', ParseUUIDPipe) amenityId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<Array<{ start: Date; end: Date; available: boolean }>> {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    return this.reservationService.getAvailability(tenantId, amenityId, fromDate, toDate);
  }
}