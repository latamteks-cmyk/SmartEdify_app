import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService, CreateNotificationDto } from '../services/notification.service';
import { Notification } from '../entities/notification.entity';
import { NotificationHistory } from '../entities/notification-history.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Notification created successfully' })
  async createNotification(
    @CurrentTenant() tenantId: string,
    @Body() createDto: Omit<CreateNotificationDto, 'tenantId'>,
  ): Promise<Notification> {
    return this.notificationService.createNotification({
      ...createDto,
      tenantId,
    });
  }

  @Put(':notificationId/send')
  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification sent successfully' })
  async sendNotification(
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<{ message: string }> {
    await this.notificationService.sendNotification(notificationId);
    return { message: 'Notification sent successfully' };
  }

  @Put(':notificationId/retry')
  @ApiOperation({ summary: 'Retry a failed notification' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification retry initiated' })
  async retryNotification(
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<{ message: string }> {
    await this.notificationService.retryNotification(notificationId);
    return { message: 'Notification retry initiated' };
  }

  @Put(':notificationId/cancel')
  @ApiOperation({ summary: 'Cancel a pending notification' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification cancelled successfully' })
  async cancelNotification(
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<{ message: string }> {
    await this.notificationService.cancelNotification(notificationId);
    return { message: 'Notification cancelled successfully' };
  }

  @Get('recipient/:recipientId')
  @ApiOperation({ summary: 'Get notifications for a recipient' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notifications retrieved successfully' })
  async getNotificationsByRecipient(
    @CurrentTenant() tenantId: string,
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ notifications: Notification[]; total: number }> {
    return this.notificationService.getNotificationsByRecipient(
      tenantId,
      recipientId,
      limit || 50,
      offset || 0,
    );
  }

  @Get(':notificationId/history')
  @ApiOperation({ summary: 'Get notification history' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification history retrieved successfully' })
  async getNotificationHistory(
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<NotificationHistory[]> {
    return this.notificationService.getNotificationHistory(notificationId);
  }

  @Get('scheduled')
  @ApiOperation({ summary: 'Get scheduled notifications' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Scheduled notifications retrieved successfully' })
  async getScheduledNotifications(): Promise<Notification[]> {
    return this.notificationService.getScheduledNotifications();
  }

  @Post('process-scheduled')
  @ApiOperation({ summary: 'Process scheduled notifications' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Scheduled notifications processed' })
  async processScheduledNotifications(): Promise<{ message: string }> {
    await this.notificationService.processScheduledNotifications();
    return { message: 'Scheduled notifications processed' };
  }
}