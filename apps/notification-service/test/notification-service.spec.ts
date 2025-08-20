import { USER_SERVICE } from '@app/common';
import { JOBNAME, SUBJECT } from '@app/common/constant/mail.constant';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { OrderCreatedPayload } from '@app/common/dto/product/payload/order-created.payload';
import { AdminInfoResponse } from '@app/common/dto/user/responses/admin-info.response';
import { PayLoadJWTComplete } from '@app/common/dto/user/sign-token.dto';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { NotificationEvent } from '@app/common/enums/queue/order-event.enum';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { addJobWithRetry } from '@app/common/helpers/queue.helper';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../src/notification-service.service';
import { MailQueueService } from '../src/mail/mail-queue.service';
import { RpcException } from '@nestjs/microservices';
import { PRODUCT_SERVICE } from '@app/common';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { Decimal } from '@prisma/client/runtime/library';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';

// Mock external helpers
jest.mock('@app/common/helpers/microservices');
jest.mock('@app/common/helpers/queue.helper');

describe('NotificationService', () => {
  let service: NotificationService;
  let mockAddJobWithRetry: jest.MockedFunction<typeof addJobWithRetry>;

  const mockMailQueueService = {
    enqueueMailJob: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    write: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockProductServiceClient = {
    send: jest.fn(),
  };
  const mockChatworkQueue = {
    add: jest.fn(),
  };

  const mockEmailQueue = {
    add: jest.fn(),
  };

  const mockUserClient = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    // Setup mocked functions
    mockAddJobWithRetry = addJobWithRetry as jest.MockedFunction<typeof addJobWithRetry>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: MailQueueService,
          useValue: mockMailQueueService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PRODUCT_SERVICE,
          useValue: mockProductServiceClient,
        },
        {
          provide: getQueueToken(QueueName.CHATWORK),
          useValue: mockChatworkQueue,
        },
        {
          provide: getQueueToken(QueueName.EMAIL),
          useValue: mockEmailQueue,
        },
        {
          provide: USER_SERVICE,
          useValue: mockUserClient,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmailComplete', () => {
    const mockPayload: PayLoadJWTComplete = {
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        userName: 'testuser',
        status: 'ACTIVE',
        role: 'USER',
        deletedAt: null,
      },
      token: 'some-jwt-token',
    };

    it('should throw TypedRpcException if data is not provided', async () => {
      await expect(
        service.sendEmailComplete(null as unknown as PayLoadJWTComplete),
      ).rejects.toThrow(TypedRpcException);
    });

    it('should call sendEmail and return a success message', async () => {
      const frontendUrl = 'http://localhost:3000';
      const configSpy = jest.spyOn(mockConfigService, 'get').mockReturnValue(frontendUrl);
      const mailQueueSpy = jest
        .spyOn(mockMailQueueService, 'enqueueMailJob')
        .mockResolvedValue(undefined);

      const result = await service.sendEmailComplete(mockPayload);

      expect(configSpy).toHaveBeenCalledWith('app.frontendUrl');
      expect(mailQueueSpy).toHaveBeenCalledWith(JOBNAME.SEND_REDMINED_EMAIL, {
        to: 'test@example.com',
        subject: SUBJECT.COMPLETE_USER,
        template: 'sendEmailComplete',
        context: {
          baseUrl: frontendUrl,
          name: 'Test User',
          userName: 'testuser',
          token: 'some-jwt-token',
        },
      });
      expect(result).toBe('common.auth.action.sendEmailComplete.complete');
    });

    it('should throw RpcException if mailQueueService fails', async () => {
      const frontendUrl = 'http://localhost:3000';
      const configSpy = jest.spyOn(mockConfigService, 'get').mockReturnValue(frontendUrl);
      const mailQueueSpy = jest
        .spyOn(mockMailQueueService, 'enqueueMailJob')
        .mockRejectedValue(new Error('Queue Error'));
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      try {
        await service.sendEmailComplete(mockPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect((error as RpcException).getError()).toBe('common.errors.internalServerError');
      }

      expect(configSpy).toHaveBeenCalledWith('app.frontendUrl');
      expect(mailQueueSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        'SendEmail NotificationService error',
        expect.any(String),
      );
    });
  });

  describe('fetchAllAdmins', () => {
    const mockAdminsResponse: AdminInfoResponse[] = [
      {
        id: 1,
        email: 'admin1@example.com',
        name: 'Admin One',
      },
      {
        id: 2,
        email: 'admin2@example.com',
        name: 'Admin Two',
      },
    ];

    it('should fetch all admins successfully', async () => {
      const { callMicroservice } = await import('@app/common/helpers/microservices');
      const callMicroserviceMock = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
      callMicroserviceMock.mockResolvedValue(mockAdminsResponse);

      const userClientSpy = jest.spyOn(mockUserClient, 'send').mockReturnValue({} as any);

      const result = await service.fetchAllAdmins();

      expect(userClientSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_ADMIN, {});
      expect(callMicroserviceMock).toHaveBeenCalledWith({}, USER_SERVICE, expect.any(Object), {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      });
      expect(result).toEqual(mockAdminsResponse);
    });

    it('should return empty array if no admins found', async () => {
      const { callMicroservice } = await import('@app/common/helpers/microservices');
      const callMicroserviceMock = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
      callMicroserviceMock.mockResolvedValue(null);

      const userClientSpy = jest.spyOn(mockUserClient, 'send').mockReturnValue({} as any);

      const result = await service.fetchAllAdmins();

      expect(userClientSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_ADMIN, {});
      expect(result).toEqual([]);
    });

    it('should handle microservice call errors', async () => {
      const { callMicroservice } = await import('@app/common/helpers/microservices');
      const callMicroserviceMock = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.serviceUnavailable',
      };
      callMicroserviceMock.mockRejectedValue(new TypedRpcException(rpcError));
      const userClientSpy = jest.spyOn(mockUserClient, 'send').mockReturnValue({});
      try {
        await service.fetchAllAdmins();
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(userClientSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_ADMIN, {});
    });
  });

  describe('sendNotificationOrderCreated', () => {
    const mockOrderPayload: OrderCreatedPayload = {
      orderId: 12345,
      userId: 1,
      userName: 'John Doe',
      paymentMethod: 'Cash',
      totalAmount: 99.99,
      paymentStatus: 'PAID',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      lang: 'en',
    };

    const mockAdminsResponse: AdminInfoResponse[] = [
      {
        id: 1,
        email: 'admin1@example.com',
        name: 'Admin One',
      },
      {
        id: 2,
        email: 'admin2@example.com',
        name: 'Admin Two',
      },
    ];

    beforeEach(() => {
      mockAddJobWithRetry.mockResolvedValue(undefined);
    });

    it('should send chatwork notification and email notifications to all admins', async () => {
      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(mockAdminsResponse);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockChatworkQueue,
        NotificationEvent.ORDER_CREATED,
        mockOrderPayload,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockEmailQueue,
        NotificationEvent.ORDER_CREATED,
        {
          email: 'admin1@example.com',
          name: 'Admin One',
          data: mockOrderPayload,
        },
      );

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockEmailQueue,
        NotificationEvent.ORDER_CREATED,
        {
          email: 'admin2@example.com',
          name: 'Admin Two',
          data: mockOrderPayload,
        },
      );

      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should handle chatwork queue errors gracefully', async () => {
      const chatworkError = new Error('Chatwork queue failed');
      mockAddJobWithRetry.mockRejectedValueOnce(chatworkError).mockResolvedValue(undefined);

      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(mockAdminsResponse);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(loggerSpy).toHaveBeenCalledWith(
        '[Add job chatwork errors]',
        `Details:: ${chatworkError.stack}`,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(3); // 1 failed chatwork + 2 successful emails
    });

    it('should handle email queue errors gracefully', async () => {
      const emailError = new Error('Email queue failed');
      mockAddJobWithRetry
        .mockResolvedValueOnce(undefined) // chatwork success
        .mockRejectedValue(emailError); // email failures

      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(mockAdminsResponse);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(loggerSpy).toHaveBeenCalledWith(
        '[Add job email errors]',
        `Details:: ${emailError.stack}`,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
    });

    it('should handle fetchAllAdmins errors gracefully', async () => {
      const fetchError = new Error('Failed to fetch admins');
      const fetchAllAdminsSpy = jest.spyOn(service, 'fetchAllAdmins').mockRejectedValue(fetchError);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockChatworkQueue,
        NotificationEvent.ORDER_CREATED,
        mockOrderPayload,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[Add job email errors]',
        `Details:: ${fetchError.stack}`,
      );
    });

    it('should filter out admins without email', async () => {
      const adminsWithoutEmail: AdminInfoResponse[] = [
        {
          id: 1,
          email: 'admin1@example.com',
          name: 'Admin One',
        },
        {
          id: 2,
          email: null as unknown as string,
          name: 'Admin Two',
        },
      ];
      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(adminsWithoutEmail);

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(2);
      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockEmailQueue,
        NotificationEvent.ORDER_CREATED,
        {
          email: 'admin1@example.com',
          name: 'Admin One',
          data: mockOrderPayload,
        },
      );
    });
  });

  describe('fetchAllAdmins', () => {
    const mockAdminsResponse: AdminInfoResponse[] = [
      {
        id: 1,
        email: 'admin1@example.com',
        name: 'Admin One',
      },
      {
        id: 2,
        email: 'admin2@example.com',
        name: 'Admin Two',
      },
    ];

    it('should fetch all admins successfully', async () => {
      const { callMicroservice } = await import('@app/common/helpers/microservices');
      const callMicroserviceMock = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
      callMicroserviceMock.mockResolvedValue(mockAdminsResponse);

      const userClientSpy = jest.spyOn(mockUserClient, 'send').mockReturnValue({} as any);

      const result = await service.fetchAllAdmins();

      expect(userClientSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_ADMIN, {});
      expect(callMicroserviceMock).toHaveBeenCalledWith({}, USER_SERVICE, expect.any(Object), {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      });
      expect(result).toEqual(mockAdminsResponse);
    });

    it('should return empty array if no admins found', async () => {
      const { callMicroservice } = await import('@app/common/helpers/microservices');
      const callMicroserviceMock = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
      callMicroserviceMock.mockResolvedValue(null);

      const userClientSpy = jest.spyOn(mockUserClient, 'send').mockReturnValue({} as any);

      const result = await service.fetchAllAdmins();

      expect(userClientSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_ADMIN, {});
      expect(result).toEqual([]);
    });

    it('should handle microservice call errors', async () => {
      const { callMicroservice } = await import('@app/common/helpers/microservices');
      const callMicroserviceMock = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.serviceUnavailable',
      };
      callMicroserviceMock.mockRejectedValue(new TypedRpcException(rpcError));
      const userClientSpy = jest.spyOn(mockUserClient, 'send').mockReturnValue({});
      try {
        await service.fetchAllAdmins();
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(userClientSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_ADMIN, {});
    });
  });

  describe('sendNotificationOrderCreated', () => {
    const mockOrderPayload: OrderCreatedPayload = {
      orderId: 12345,
      userId: 1,
      userName: 'John Doe',
      paymentMethod: 'Cash',
      totalAmount: 99.99,
      paymentStatus: 'PAID',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      lang: 'en',
    };

    const mockAdminsResponse: AdminInfoResponse[] = [
      {
        id: 1,
        email: 'admin1@example.com',
        name: 'Admin One',
      },
      {
        id: 2,
        email: 'admin2@example.com',
        name: 'Admin Two',
      },
    ];

    beforeEach(() => {
      mockAddJobWithRetry.mockResolvedValue(undefined);
    });

    it('should send chatwork notification and email notifications to all admins', async () => {
      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(mockAdminsResponse);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockChatworkQueue,
        NotificationEvent.ORDER_CREATED,
        mockOrderPayload,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockEmailQueue,
        NotificationEvent.ORDER_CREATED,
        {
          email: 'admin1@example.com',
          name: 'Admin One',
          data: mockOrderPayload,
        },
      );

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockEmailQueue,
        NotificationEvent.ORDER_CREATED,
        {
          email: 'admin2@example.com',
          name: 'Admin Two',
          data: mockOrderPayload,
        },
      );

      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should handle chatwork queue errors gracefully', async () => {
      const chatworkError = new Error('Chatwork queue failed');
      mockAddJobWithRetry.mockRejectedValueOnce(chatworkError).mockResolvedValue(undefined);

      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(mockAdminsResponse);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(loggerSpy).toHaveBeenCalledWith(
        '[Add job chatwork errors]',
        `Details:: ${chatworkError.stack}`,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(3); // 1 failed chatwork + 2 successful emails
    });

    it('should handle email queue errors gracefully', async () => {
      const emailError = new Error('Email queue failed');
      mockAddJobWithRetry
        .mockResolvedValueOnce(undefined) // chatwork success
        .mockRejectedValue(emailError); // email failures

      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(mockAdminsResponse);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(loggerSpy).toHaveBeenCalledWith(
        '[Add job email errors]',
        `Details:: ${emailError.stack}`,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
    });

    it('should handle fetchAllAdmins errors gracefully', async () => {
      const fetchError = new Error('Failed to fetch admins');
      const fetchAllAdminsSpy = jest.spyOn(service, 'fetchAllAdmins').mockRejectedValue(fetchError);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockChatworkQueue,
        NotificationEvent.ORDER_CREATED,
        mockOrderPayload,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[Add job email errors]',
        `Details:: ${fetchError.stack}`,
      );
    });

    it('should filter out admins without email', async () => {
      const adminsWithoutEmail: AdminInfoResponse[] = [
        {
          id: 1,
          email: 'admin1@example.com',
          name: 'Admin One',
        },
        {
          id: 2,
          email: null as unknown as string,
          name: 'Admin Two',
        },
      ];
      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(adminsWithoutEmail);

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(2);
      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockEmailQueue,
        NotificationEvent.ORDER_CREATED,
        {
          email: 'admin1@example.com',
          name: 'Admin One',
          data: mockOrderPayload,
        },
      );
    });
  });

  describe('fetchAllAdmins', () => {
    const mockAdminsResponse: AdminInfoResponse[] = [
      {
        id: 1,
        email: 'admin1@example.com',
        name: 'Admin One',
      },
      {
        id: 2,
        email: 'admin2@example.com',
        name: 'Admin Two',
      },
    ];

    it('should fetch all admins successfully', async () => {
      const { callMicroservice } = await import('@app/common/helpers/microservices');
      const callMicroserviceMock = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
      callMicroserviceMock.mockResolvedValue(mockAdminsResponse);

      const userClientSpy = jest.spyOn(mockUserClient, 'send').mockReturnValue({} as any);

      const result = await service.fetchAllAdmins();

      expect(userClientSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_ADMIN, {});
      expect(callMicroserviceMock).toHaveBeenCalledWith({}, USER_SERVICE, expect.any(Object), {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      });
      expect(result).toEqual(mockAdminsResponse);
    });

    it('should return empty array if no admins found', async () => {
      const { callMicroservice } = await import('@app/common/helpers/microservices');
      const callMicroserviceMock = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
      callMicroserviceMock.mockResolvedValue(null);

      const userClientSpy = jest.spyOn(mockUserClient, 'send').mockReturnValue({} as any);

      const result = await service.fetchAllAdmins();

      expect(userClientSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_ADMIN, {});
      expect(result).toEqual([]);
    });

    it('should handle microservice call errors', async () => {
      const { callMicroservice } = await import('@app/common/helpers/microservices');
      const callMicroserviceMock = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.serviceUnavailable',
      };
      callMicroserviceMock.mockRejectedValue(new TypedRpcException(rpcError));
      const userClientSpy = jest.spyOn(mockUserClient, 'send').mockReturnValue({});
      try {
        await service.fetchAllAdmins();
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(userClientSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_ADMIN, {});
    });
  });

  describe('sendNotificationOrderCreated', () => {
    const mockOrderPayload: OrderCreatedPayload = {
      orderId: 12345,
      userId: 1,
      userName: 'John Doe',
      paymentMethod: 'Cash',
      totalAmount: 99.99,
      paymentStatus: 'PAID',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      lang: 'en',
    };

    const mockAdminsResponse: AdminInfoResponse[] = [
      {
        id: 1,
        email: 'admin1@example.com',
        name: 'Admin One',
      },
      {
        id: 2,
        email: 'admin2@example.com',
        name: 'Admin Two',
      },
    ];

    beforeEach(() => {
      mockAddJobWithRetry.mockResolvedValue(undefined);
    });

    it('should send chatwork notification and email notifications to all admins', async () => {
      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(mockAdminsResponse);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockChatworkQueue,
        NotificationEvent.ORDER_CREATED,
        mockOrderPayload,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockEmailQueue,
        NotificationEvent.ORDER_CREATED,
        {
          email: 'admin1@example.com',
          name: 'Admin One',
          data: mockOrderPayload,
        },
      );

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockEmailQueue,
        NotificationEvent.ORDER_CREATED,
        {
          email: 'admin2@example.com',
          name: 'Admin Two',
          data: mockOrderPayload,
        },
      );

      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should handle chatwork queue errors gracefully', async () => {
      const chatworkError = new Error('Chatwork queue failed');
      mockAddJobWithRetry.mockRejectedValueOnce(chatworkError).mockResolvedValue(undefined);

      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(mockAdminsResponse);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(loggerSpy).toHaveBeenCalledWith(
        '[Add job chatwork errors]',
        `Details:: ${chatworkError.stack}`,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(3); // 1 failed chatwork + 2 successful emails
    });

    it('should handle email queue errors gracefully', async () => {
      const emailError = new Error('Email queue failed');
      mockAddJobWithRetry
        .mockResolvedValueOnce(undefined) // chatwork success
        .mockRejectedValue(emailError); // email failures

      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(mockAdminsResponse);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(loggerSpy).toHaveBeenCalledWith(
        '[Add job email errors]',
        `Details:: ${emailError.stack}`,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
    });

    it('should handle fetchAllAdmins errors gracefully', async () => {
      const fetchError = new Error('Failed to fetch admins');
      const fetchAllAdminsSpy = jest.spyOn(service, 'fetchAllAdmins').mockRejectedValue(fetchError);
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockChatworkQueue,
        NotificationEvent.ORDER_CREATED,
        mockOrderPayload,
      );

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[Add job email errors]',
        `Details:: ${fetchError.stack}`,
      );
    });

    it('should filter out admins without email', async () => {
      const adminsWithoutEmail: AdminInfoResponse[] = [
        {
          id: 1,
          email: 'admin1@example.com',
          name: 'Admin One',
        },
        {
          id: 2,
          email: null as unknown as string,
          name: 'Admin Two',
        },
      ];
      const fetchAllAdminsSpy = jest
        .spyOn(service, 'fetchAllAdmins')
        .mockResolvedValue(adminsWithoutEmail);

      await service.sendNotificationOrderCreated(mockOrderPayload);

      expect(fetchAllAdminsSpy).toHaveBeenCalled();
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(2);
      expect(mockAddJobWithRetry).toHaveBeenCalledWith(
        mockEmailQueue,
        NotificationEvent.ORDER_CREATED,
        {
          email: 'admin1@example.com',
          name: 'Admin One',
          data: mockOrderPayload,
        },
      );
    });
  });
  describe('getShareProduct', () => {
    const createMockProduct = (): UserProductDetailResponse => ({
      id: 1,
      name: 'Test Product',
      skuId: 'SKU123',
      description: 'Test Description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(25.99),
      quantity: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: undefined,
      images: [],
      variants: [],
      categories: [],
      reviews: [],
    });

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'frontendUrl':
            return 'http://localhost:3000';
          case 'facebook.appID':
            return '123456789';
          case 'facebook.sharePostUrl':
            return 'https://www.facebook.com/dialog/share';
          case 'facebook.shareMessengerUrl':
            return 'https://www.facebook.com/dialog/send';
          default:
            return undefined;
        }
      });
    });

    it('should throw TypedRpcException if product is null', () => {
      expect(() => service.getShareProduct(null as unknown as UserProductDetailResponse)).toThrow(
        TypedRpcException,
      );
    });

    it('should throw TypedRpcException if product is undefined', () => {
      expect(() =>
        service.getShareProduct(undefined as unknown as UserProductDetailResponse),
      ).toThrow(TypedRpcException);
    });

    it('should return share URLs successfully', () => {
      const mockProduct = createMockProduct();
      const result = service.getShareProduct(mockProduct);

      expect(result).toHaveProperty('messengerShare');
      expect(result).toHaveProperty('facebookShare');
      expect(result).toHaveProperty('productUrl');
      expect(result.productUrl).toContain('/user/products/SKU123');
    });

    it('should return URLs even with empty config (no validation in current implementation)', () => {
      // Mock config to return empty strings
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'frontendUrl':
            return '';
          case 'facebook.appID':
            return '';
          case 'facebook.sharePostUrl':
            return '';
          case 'facebook.shareMessengerUrl':
            return '';
          default:
            return '';
        }
      });

      const mockProduct = createMockProduct();
      const result = service.getShareProduct(mockProduct);

      // Current implementation doesn't validate empty URLs, just returns them
      expect(result).toHaveProperty('messengerShare');
      expect(result).toHaveProperty('facebookShare');
      expect(result).toHaveProperty('productUrl');
    });

    it('should generate correct URLs with product information', () => {
      const mockProduct = createMockProduct();
      mockProduct.name = 'Special Product';
      mockProduct.basePrice = new Decimal(99.99);

      const result = service.getShareProduct(mockProduct);

      expect(result.facebookShare).toContain('quote=');
      expect(result.messengerShare).toContain('facebook.com/dialog/send');
      expect(result.facebookShare).toContain('facebook.com/dialog/share');
    });

    it('should handle products with special characters in name', () => {
      const mockProduct = createMockProduct();
      mockProduct.name = 'Product & Special "Chars"';

      const result = service.getShareProduct(mockProduct);

      expect(result).toHaveProperty('messengerShare');
      expect(result).toHaveProperty('facebookShare');
      expect(result).toHaveProperty('productUrl');
    });
  });
});
