import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationChannel, ChannelType, ChannelStatus, ChannelProvider } from '../entities/notification-channel.entity';
import { Notification } from '../../notifications/entities/notification.entity';

export interface CreateChannelDto {
  tenantId: string;
  name: string;
  description?: string;
  type: ChannelType;
  provider: ChannelProvider;
  providerConfig: Record<string, any>;
  rateLimits?: {
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
  isDefault?: boolean;
  isFallback?: boolean;
  priority?: number;
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  };
}

export interface SendResult {
  success: boolean;
  externalId?: string;
  deliveryInfo?: Record<string, any>;
  processingTime?: number;
  error?: string;
}

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(
    @InjectRepository(NotificationChannel)
    private readonly channelRepository: Repository<NotificationChannel>,
  ) {}

  async createChannel(createDto: CreateChannelDto): Promise<NotificationChannel> {
    // Validate provider config
    this.validateProviderConfig(createDto.type, createDto.provider, createDto.providerConfig);

    // If setting as default, unset other defaults
    if (createDto.isDefault) {
      await this.channelRepository.update(
        { tenantId: createDto.tenantId, type: createDto.type, isDefault: true },
        { isDefault: false },
      );
    }

    const channel = this.channelRepository.create({
      ...createDto,
      status: ChannelStatus.ACTIVE,
      priority: createDto.priority || 1,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        ...createDto.retryConfig,
      },
    });

    return this.channelRepository.save(channel);
  }

  async updateChannel(
    channelId: string,
    tenantId: string,
    updateDto: Partial<CreateChannelDto>,
  ): Promise<NotificationChannel> {
    const channel = await this.channelRepository.findOne({
      where: { id: channelId, tenantId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Validate provider config if being updated
    if (updateDto.providerConfig) {
      this.validateProviderConfig(
        updateDto.type || channel.type,
        updateDto.provider || channel.provider,
        updateDto.providerConfig,
      );
    }

    // Handle default channel logic
    if (updateDto.isDefault && !channel.isDefault) {
      await this.channelRepository.update(
        { tenantId, type: channel.type, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(channel, updateDto);
    return this.channelRepository.save(channel);
  }

  async getChannelForNotification(tenantId: string, type: ChannelType): Promise<NotificationChannel | null> {
    // First try to get default channel
    let channel = await this.channelRepository.findOne({
      where: {
        tenantId,
        type,
        status: ChannelStatus.ACTIVE,
        isDefault: true,
      },
    });

    // If no default, get highest priority healthy channel
    if (!channel) {
      const channels = await this.channelRepository.find({
        where: {
          tenantId,
          type,
          status: ChannelStatus.ACTIVE,
        },
        order: { priority: 'DESC' },
      });

      channel = channels.find(c => c.isHealthy) || channels[0] || null;
    }

    return channel;
  }

  async getFallbackChannel(tenantId: string, type: ChannelType): Promise<NotificationChannel | null> {
    return this.channelRepository.findOne({
      where: {
        tenantId,
        type,
        status: ChannelStatus.ACTIVE,
        isFallback: true,
      },
    });
  }

  async sendNotification(channel: NotificationChannel, notification: Notification): Promise<SendResult> {
    const startTime = Date.now();

    try {
      // Check rate limits
      await this.checkRateLimits(channel);

      let result: SendResult;

      // Route to appropriate provider
      switch (channel.provider) {
        case ChannelProvider.SENDGRID:
          result = await this.sendViaSendGrid(channel, notification);
          break;
        case ChannelProvider.TWILIO:
          result = await this.sendViaTwilio(channel, notification);
          break;
        case ChannelProvider.FCM:
          result = await this.sendViaFCM(channel, notification);
          break;
        case ChannelProvider.SMTP:
          result = await this.sendViaSMTP(channel, notification);
          break;
        default:
          throw new Error(`Provider ${channel.provider} not implemented`);
      }

      // Update channel stats
      await this.updateChannelStats(channel.id, true);

      result.processingTime = Date.now() - startTime;
      return result;

    } catch (error) {
      // Update channel stats
      await this.updateChannelStats(channel.id, false, error.message);

      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  async testChannel(channelId: string, tenantId: string): Promise<SendResult> {
    const channel = await this.channelRepository.findOne({
      where: { id: channelId, tenantId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Create test notification
    const testNotification = {
      id: 'test',
      tenantId,
      recipientId: 'test',
      recipientEmail: 'test@example.com',
      recipientPhone: '+1234567890',
      type: channel.type,
      subject: 'Test Notification',
      content: 'This is a test notification to verify channel configuration.',
      htmlContent: '<p>This is a test notification to verify channel configuration.</p>',
    } as Notification;

    return this.sendNotification(channel, testNotification);
  }

  private async checkRateLimits(channel: NotificationChannel): Promise<void> {
    // This would implement actual rate limiting logic
    // For now, just a placeholder
    if (channel.rateLimits.perMinute && channel.rateLimits.perMinute > 0) {
      // Check rate limit implementation would go here
    }
  }

  private async updateChannelStats(channelId: string, success: boolean, errorMessage?: string): Promise<void> {
    const updateData: any = {
      lastUsedAt: new Date(),
    };

    if (success) {
      updateData.successCount = () => 'success_count + 1';
    } else {
      updateData.errorCount = () => 'error_count + 1';
      updateData.lastErrorAt = new Date();
      updateData.lastErrorMessage = errorMessage;
    }

    await this.channelRepository.update(channelId, updateData);
  }

  private validateProviderConfig(type: ChannelType, provider: ChannelProvider, config: Record<string, any>): void {
    switch (provider) {
      case ChannelProvider.SENDGRID:
        if (!config.apiKey) {
          throw new BadRequestException('SendGrid API key is required');
        }
        if (!config.fromEmail) {
          throw new BadRequestException('SendGrid from email is required');
        }
        break;

      case ChannelProvider.TWILIO:
        if (!config.accountSid || !config.authToken || !config.fromPhone) {
          throw new BadRequestException('Twilio accountSid, authToken, and fromPhone are required');
        }
        break;

      case ChannelProvider.FCM:
        if (!config.serverKey && !config.serviceAccountKey) {
          throw new BadRequestException('FCM server key or service account key is required');
        }
        break;

      case ChannelProvider.SMTP:
        if (!config.host || !config.port || !config.username || !config.password) {
          throw new BadRequestException('SMTP host, port, username, and password are required');
        }
        break;

      default:
        throw new BadRequestException(`Provider ${provider} validation not implemented`);
    }
  }

  // Provider-specific sending methods (simplified implementations)
  private async sendViaSendGrid(channel: NotificationChannel, notification: Notification): Promise<SendResult> {
    // This would integrate with actual SendGrid SDK
    this.logger.log(`Sending email via SendGrid to ${notification.recipientEmail}`);
    
    return {
      success: true,
      externalId: `sg_${Date.now()}`,
      deliveryInfo: {
        provider: 'sendgrid',
        to: notification.recipientEmail,
        subject: notification.subject,
      },
    };
  }

  private async sendViaTwilio(channel: NotificationChannel, notification: Notification): Promise<SendResult> {
    // This would integrate with actual Twilio SDK
    this.logger.log(`Sending SMS via Twilio to ${notification.recipientPhone}`);
    
    return {
      success: true,
      externalId: `tw_${Date.now()}`,
      deliveryInfo: {
        provider: 'twilio',
        to: notification.recipientPhone,
        message: notification.content,
      },
    };
  }

  private async sendViaFCM(channel: NotificationChannel, notification: Notification): Promise<SendResult> {
    // This would integrate with actual FCM SDK
    this.logger.log(`Sending push notification via FCM to ${notification.recipientId}`);
    
    return {
      success: true,
      externalId: `fcm_${Date.now()}`,
      deliveryInfo: {
        provider: 'fcm',
        to: notification.recipientId,
        title: notification.subject,
        body: notification.content,
      },
    };
  }

  private async sendViaSMTP(channel: NotificationChannel, notification: Notification): Promise<SendResult> {
    // This would integrate with actual SMTP client
    this.logger.log(`Sending email via SMTP to ${notification.recipientEmail}`);
    
    return {
      success: true,
      externalId: `smtp_${Date.now()}`,
      deliveryInfo: {
        provider: 'smtp',
        to: notification.recipientEmail,
        subject: notification.subject,
      },
    };
  }
}