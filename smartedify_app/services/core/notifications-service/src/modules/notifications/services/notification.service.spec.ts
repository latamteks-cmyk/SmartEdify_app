import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import { Notification, NotificationStatus, NotificationPriority } from '../entities/notification.entity';
import { NotificationHistory } from '../entities/notification-history.entity';
import { TemplateService } from '../../templates/services/template.service';
import { ChannelService } from '../../channels/services/channel.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: Repository<Notification>;
  let historyRepository: Repository<NotificationHistory>;
  let templateService: TemplateService;
  let channelService: ChannelService;
  let eventEmitter: EventEmitter2;

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockHistoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockTemplateService = {
    findById: jest.fn(),
    processTemplate: jest.fn(),
  };

  const mockChannelService = {
    getChannelForNotification: jest.fn(),
    sendNotification: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: getRepositoryToken(NotificationHistory),
          useValue: mockHistoryRepository,
        },
        {
          provide: TemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: ChannelService,
          useValue: mockChannelService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get<Repository<Notification>>(getRepositoryToken(Notification));
    historyRepository = module.get<Repository<NotificationHistory>>(getRepositoryToken(NotificationHistory));
    templateService = module.get<TemplateService>(TemplateService);
    channelService = module.get<ChannelService>(ChannelService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create notification with template processing', async () => {
      const createDto = {
        tenantId: 'tenant-1',
        recipientId: 'user-1',
        recipientEmail: 'user@example.com',
        type: 'EMAIL' as any,
        subject: 'Test Subject',
        content: 'Test Content',
        templateId: 'template-1',
        templateData: { name: 'John Doe' },
        priority: NotificationPriority.NORMAL,
      };

      const mockTemplate = {
        id: 'template-1',
        subjectTemplate: 'Hello {{name}}',
        contentTemplate: 'Welcome {{name}}!',
        htmlTemplate: '<p>Welcome {{name}}!</p>',
      };

      const mockNotification = {
        id: 'notification-1',
        ...createDto,
        subject: 'Hello John Doe',
        content: 'Welcome John Doe!',
        htmlContent: '<p>Welcome John Doe!</p>',
        status: NotificationStatus.PENDING,
      };

      mockTemplateService.findById.mockResolvedValue(mockTemplate);
      mockTemplateService.processTemplate
        .mockReturnValueOnce('Hello John Doe')
        .mockReturnValueOnce('Welcome John Doe!')
        .mockReturnValueOnce('<p>Welcome John Doe!</p>');
      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      // Mock sendNotification to avoid actual sending
      jest.spyOn(service, 'sendNotification').mockResolvedValue();

      const result = await service.createNotification(createDto);

      expect(mockTemplateService.findById).toHaveBeenCalledWith('template-1', 'tenant-1');
      expect(mockTemplateService.processTemplate).toHaveBeenCalledTimes(3);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        ...createDto,
        subject: 'Hello John Doe',
        content: 'Welcome John Doe!',
        htmlContent: '<p>Welcome John Doe!</p>',
        status: NotificationStatus.PENDING,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.created', expect.any(Object));
      expect(result).toEqual(mockNotification);
    });

    it('should create notification without template', async () => {
      const createDto = {
        tenantId: 'tenant-1',
        recipientId: 'user-1',
        recipientEmail: 'user@example.com',
        type: 'EMAIL' as any,
        subject: 'Direct Subject',
        content: 'Direct Content',
        priority: NotificationPriority.HIGH,
      };

      const mockNotification = {
        id: 'notification-1',
        ...createDto,
        status: NotificationStatus.PENDING,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      // Mock sendNotification to avoid actual sending
      jest.spyOn(service, 'sendNotification').mockResolvedValue();

      const result = await service.createNotification(createDto);

      expect(mockTemplateService.findById).not.toHaveBeenCalled();
      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        ...createDto,
        status: NotificationStatus.PENDING,
      });
      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException when template not found', async () => {
      const createDto = {
        tenantId: 'tenant-1',
        recipientId: 'user-1',
        type: 'EMAIL' as any,
        subject: 'Test',
        content: 'Test',
        templateId: 'non-existent-template',
        templateData: {},
      };

      mockTemplateService.findById.mockResolvedValue(null);

      await expect(service.createNotification(createDto)).rejects.toThrow('Template not found');
    });
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const notificationId = 'notification-1';
      const mockNotification = {
        id: notificationId,
        tenantId: 'tenant-1',
        recipientId: 'user-1',
        type: 'EMAIL',
        status: NotificationStatus.PENDING,
        subject: 'Test Subject',
        content: 'Test Content',
      };

      const mockChannel = {
        id: 'channel-1',
        type: 'EMAIL',
        provider: 'SENDGRID',
      };

      const mockSendResult = {
        externalId: 'ext-123',
        deliveryInfo: { provider: 'sendgrid' },
        processingTime: 100,
      };

      mockNotificationRepository.findOne.mockResolvedValue(mockNotification);
      mockChannelService.getChannelForNotification.mockResolvedValue(mockChannel);
      mockChannelService.sendNotification.mockResolvedValue(mockSendResult);
      mockNotificationRepository.save.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.SENT,
        sentAt: expect.any(Date),
      });
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      await service.sendNotification(notificationId);

      expect(mockChannelService.getChannelForNotification).toHaveBeenCalledWith('tenant-1', 'EMAIL');
      expect(mockChannelService.sendNotification).toHaveBeenCalledWith(mockChannel, mockNotification);
      expect(mockNotificationRepository.save).toHaveBeenCalledTimes(2); // Status update + delivery info
      expect(mockEventEmitter.emit).not.toHaveBeenCalled(); // No event in sendNotification
    });

    it('should throw NotFoundException when notification not found', async () => {
      const notificationId = 'non-existent';

      mockNotificationRepository.findOne.mockResolvedValue(null);

      await expect(service.sendNotification(notificationId)).rejects.toThrow('Notification not found');
    });

    it('should throw BadRequestException when notification is not pending', async () => {
      const notificationId = 'notification-1';
      const mockNotification = {
        id: notificationId,
        status: NotificationStatus.SENT,
      };

      mockNotificationRepository.findOne.mockResolvedValue(mockNotification);

      await expect(service.sendNotification(notificationId)).rejects.toThrow(
        'Notification is not in pending status'
      );
    });
  });

  describe('getNotificationsByRecipient', () => {
    it('should return notifications for recipient with pagination', async () => {
      const tenantId = 'tenant-1';
      const recipientId = 'user-1';
      const limit = 10;
      const offset = 0;

      const mockNotifications = [
        { id: 'notification-1', recipientId },
        { id: 'notification-2', recipientId },
      ];

      mockNotificationRepository.findAndCount.mockResolvedValue([mockNotifications, 2]);

      const result = await service.getNotificationsByRecipient(tenantId, recipientId, limit, offset);

      expect(mockNotificationRepository.findAndCount).toHaveBeenCalledWith({
        where: { tenantId, recipientId },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      });
      expect(result).toEqual({
        notifications: mockNotifications,
        total: 2,
      });
    });
  });

  describe('retryNotification', () => {
    it('should retry failed notification successfully', async () => {
      const notificationId = 'notification-1';
      const mockNotification = {
        id: notificationId,
        tenantId: 'tenant-1',
        status: NotificationStatus.FAILED,
        retryCount: 1,
        maxRetries: 3,
        canRetry: true,
      };

      mockNotificationRepository.findOne.mockResolvedValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue({
        ...mockNotification,
        retryCount: 2,
        status: NotificationStatus.PENDING,
      });
      mockHistoryRepository.create.mockReturnValue({});
      mockHistoryRepository.save.mockResolvedValue({});

      // Mock sendNotification to avoid actual sending
      jest.spyOn(service, 'sendNotification').mockResolvedValue();

      await service.retryNotification(notificationId);

      expect(mockNotificationRepository.save).toHaveBeenCalledWith({
        ...mockNotification,
        retryCount: 2,
        status: NotificationStatus.PENDING,
        failureReason: null,
        failedAt: null,
      });
    });

    it('should throw BadRequestException when notification cannot be retried', async () => {
      const notificationId = 'notification-1';
      const mockNotification = {
        id: notificationId,
        status: NotificationStatus.FAILED,
        retryCount: 3,
        maxRetries: 3,
        canRetry: false,
      };

      mockNotificationRepository.findOne.mockResolvedValue(mockNotification);

      await expect(service.retryNotification(notificationId)).rejects.toThrow(
        'Notification cannot be retried'
      );
    });
  });
});