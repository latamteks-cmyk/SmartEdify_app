import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification, NotificationStatus, NotificationPriority } from '../entities/notification.entity';
import { NotificationHistory, HistoryAction } from '../entities/notification-history.entity';
import { TemplateService } from '../../templates/services/template.service';
import { ChannelService } from '../../channels/services/channel.service';

export interface CreateNotificationDto {
  tenantId: string;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  type: string;
  subject: string;
  content: string;
  htmlContent?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationHistory)
    private readonly historyRepository: Repository<NotificationHistory>,
    private readonly templateService: TemplateService,
    private readonly channelService: ChannelService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createNotification(createDto: CreateNotificationDto): Promise<Notification> {
    let processedContent = createDto.content;
    let processedSubject = createDto.subject;
    let processedHtmlContent = createDto.htmlContent;

    // Process template if provided
    if (createDto.templateId) {
      const template = await this.templateService.findById(createDto.templateId, createDto.tenantId);
      if (!template) {
        throw new NotFoundException('Template not found');
      }

      const templateData = createDto.templateData || {};
      processedSubject = this.templateService.processTemplate(template.subjectTemplate, templateData);
      processedContent = this.templateService.processTemplate(template.contentTemplate, templateData);
      
      if (template.htmlTemplate) {
        processedHtmlContent = this.templateService.processTemplate(template.htmlTemplate, templateData);
      }
    }

    const notification = this.notificationRepository.create({
      ...createDto,
      subject: processedSubject,
      content: processedContent,
      htmlContent: processedHtmlContent,
      status: createDto.scheduledAt && createDto.scheduledAt > new Date() 
        ? NotificationStatus.PENDING 
        : NotificationStatus.PENDING,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Create history entry
    await this.createHistoryEntry(
      savedNotification.tenantId,
      savedNotification.id,
      HistoryAction.CREATED,
      undefined,
      NotificationStatus.PENDING,
      'Notification created',
    );

    // Emit event
    this.eventEmitter.emit('notification.created', {
      notificationId: savedNotification.id,
      tenantId: savedNotification.tenantId,
      recipientId: savedNotification.recipientId,
      type: savedNotification.type,
      priority: savedNotification.priority,
    });

    // If not scheduled, send immediately
    if (!savedNotification.isScheduled) {
      await this.sendNotification(savedNotification.id);
    }

    return savedNotification;
  }

  async sendNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.status !== NotificationStatus.PENDING) {
      throw new BadRequestException('Notification is not in pending status');
    }

    try {
      // Get appropriate channel
      const channel = await this.channelService.getChannelForNotification(
        notification.tenantId,
        notification.type as any,
      );

      if (!channel) {
        throw new Error('No available channel for notification type');
      }

      // Update status to sending
      await this.updateNotificationStatus(
        notification.id,
        NotificationStatus.SENT,
        'Sending notification',
      );

      // Send through channel (this would integrate with actual providers)
      const result = await this.channelService.sendNotification(channel, notification);

      // Update with delivery info
      notification.sentAt = new Date();
      notification.externalId = result.externalId;
      notification.deliveryInfo = result.deliveryInfo;
      
      await this.notificationRepository.save(notification);

      // Create history entry
      await this.createHistoryEntry(
        notification.tenantId,
        notification.id,
        HistoryAction.SENT,
        NotificationStatus.PENDING,
        NotificationStatus.SENT,
        'Notification sent successfully',
        { channelId: channel.id, processingTime: result.processingTime },
      );

      this.logger.log(`Notification ${notificationId} sent successfully`);

    } catch (error) {
      await this.handleNotificationFailure(notification, error.message);
      throw error;
    }
  }

  async retryNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.canRetry) {
      throw new BadRequestException('Notification cannot be retried');
    }

    notification.retryCount += 1;
    notification.status = NotificationStatus.PENDING;
    notification.failureReason = null;
    notification.failedAt = null;

    await this.notificationRepository.save(notification);

    await this.createHistoryEntry(
      notification.tenantId,
      notification.id,
      HistoryAction.RETRIED,
      NotificationStatus.FAILED,
      NotificationStatus.PENDING,
      `Retry attempt ${notification.retryCount}`,
    );

    await this.sendNotification(notificationId);
  }

  async cancelNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.status !== NotificationStatus.PENDING) {
      throw new BadRequestException('Only pending notifications can be cancelled');
    }

    await this.updateNotificationStatus(
      notification.id,
      NotificationStatus.CANCELLED,
      'Notification cancelled',
    );
  }

  async getNotificationsByRecipient(
    tenantId: string,
    recipientId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { tenantId, recipientId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { notifications, total };
  }

  async getNotificationHistory(notificationId: string): Promise<NotificationHistory[]> {
    return this.historyRepository.find({
      where: { notificationId },
      order: { createdAt: 'ASC' },
    });
  }

  async getScheduledNotifications(): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: {
        status: NotificationStatus.PENDING,
        scheduledAt: { $lte: new Date() } as any,
      },
      order: { priority: 'DESC', scheduledAt: 'ASC' },
    });
  }

  async processScheduledNotifications(): Promise<void> {
    const scheduledNotifications = await this.getScheduledNotifications();
    
    this.logger.log(`Processing ${scheduledNotifications.length} scheduled notifications`);

    for (const notification of scheduledNotifications) {
      try {
        await this.sendNotification(notification.id);
      } catch (error) {
        this.logger.error(`Failed to send scheduled notification ${notification.id}:`, error);
      }
    }
  }

  private async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    details?: string,
  ): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      return;
    }

    const previousStatus = notification.status;
    notification.status = status;

    if (status === NotificationStatus.FAILED) {
      notification.failedAt = new Date();
      notification.failureReason = details;
    }

    await this.notificationRepository.save(notification);

    await this.createHistoryEntry(
      notification.tenantId,
      notificationId,
      this.getHistoryActionFromStatus(status),
      previousStatus,
      status,
      details,
    );
  }

  private async handleNotificationFailure(notification: Notification, errorMessage: string): Promise<void> {
    notification.status = NotificationStatus.FAILED;
    notification.failedAt = new Date();
    notification.failureReason = errorMessage;

    await this.notificationRepository.save(notification);

    await this.createHistoryEntry(
      notification.tenantId,
      notification.id,
      HistoryAction.FAILED,
      NotificationStatus.PENDING,
      NotificationStatus.FAILED,
      errorMessage,
    );

    this.logger.error(`Notification ${notification.id} failed: ${errorMessage}`);
  }

  private async createHistoryEntry(
    tenantId: string,
    notificationId: string,
    action: HistoryAction,
    previousStatus?: NotificationStatus,
    newStatus?: NotificationStatus,
    details?: string,
    contextData?: Record<string, any>,
  ): Promise<void> {
    const history = this.historyRepository.create({
      tenantId,
      notificationId,
      action,
      previousStatus,
      newStatus,
      details,
      contextData: contextData || {},
    });

    await this.historyRepository.save(history);
  }

  private getHistoryActionFromStatus(status: NotificationStatus): HistoryAction {
    switch (status) {
      case NotificationStatus.SENT:
        return HistoryAction.SENT;
      case NotificationStatus.DELIVERED:
        return HistoryAction.DELIVERED;
      case NotificationStatus.FAILED:
        return HistoryAction.FAILED;
      case NotificationStatus.CANCELLED:
        return HistoryAction.CANCELLED;
      default:
        return HistoryAction.UPDATED;
    }
  }
}