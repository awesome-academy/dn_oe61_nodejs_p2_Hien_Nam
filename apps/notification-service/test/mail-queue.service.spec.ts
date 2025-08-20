import { SUPPORTED_LOCALES } from '@app/common/constant/locales.constant';
import { MailJobDataDto } from '@app/common/dto/mail.dto';
import { SendStatisticOrderMonthly } from '@app/common/dto/product/payload/send-statistic-oder-monthly';
import { StatisticOrderByMonthResponse } from '@app/common/dto/product/response/statistic-order-by-month.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { MailerService } from '@nestjs-modules/mailer';
import { getQueueToken } from '@nestjs/bull';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { I18nService } from 'nestjs-i18n';
import 'reflect-metadata';
import { MailQueueService } from '../src/mail/mail-queue.service';

// Mock class-transformer and class-validator
jest.mock('class-validator', () => ({
  IsEmail: () => () => {},
  IsNotEmpty: () => () => {},
  IsNumber: () => () => {},
  IsEnum: () => () => {},
  validateOrReject: jest.fn(),
}));
jest.mock('class-transformer', () => ({
  plainToInstance: jest.fn(),
}));
// Mock the payload class to avoid decorator issues
jest.mock('@app/common/dto/product/payload/send-email-admin-order-created.payload', () => ({
  SendEmailOrderCreatedPayload: class MockSendEmailOrderCreatedPayload {
    email: string;
    name: string;
    data: unknown;
  },
}));

// Define the interface for type safety
interface SendEmailOrderCreatedPayload {
  email: string;
  name: string;
  data: {
    orderId: number;
    userId: number;
    userName: string;
    paymentMethod: string;
    totalAmount: number;
    paymentStatus: string;
    createdAt: Date;
    lang: 'en' | 'vi';
  };
}

describe('MailQueueService', () => {
  let service: MailQueueService;
  let mockPlainToInstance: jest.MockedFunction<typeof plainToInstance>;
  let mockValidateOrReject: jest.MockedFunction<typeof validateOrReject>;

  const mockMailQueue = {
    add: jest.fn(),
  };
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockMailerService = {
    sendMail: jest.fn(),
  };
  const mockI18nService = {
    translate: jest.fn(),
  };

  beforeEach(async () => {
    // Setup mocked functions
    mockPlainToInstance = plainToInstance as jest.MockedFunction<typeof plainToInstance>;
    mockValidateOrReject = validateOrReject as jest.MockedFunction<typeof validateOrReject>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailQueueService,
        {
          provide: getQueueToken(QueueName.EMAIL),
          useValue: mockMailQueue,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<MailQueueService>(MailQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enqueueMailJob', () => {
    const jobName = 'send-email';
    const data: MailJobDataDto = {
      to: 'test@example.com',
      subject: 'Test Email',
      template: 'test-template',
      context: { name: 'Test' },
    };

    it('should log a warning and return if jobName is not provided', async () => {
      await service.enqueueMailJob('', data);

      expect(mockLogger.warn).toHaveBeenCalledWith('Missing required jobName');
      expect(mockMailQueue.add).not.toHaveBeenCalled();
    });

    it('should add a job to the mail queue', async () => {
      mockMailQueue.add.mockResolvedValue(undefined);

      await service.enqueueMailJob(jobName, data);

      expect(mockMailQueue.add).toHaveBeenCalledWith(jobName, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
    });

    it('should log an error and re-throw if adding to queue fails', async () => {
      const error = new Error('Queue Error');
      mockMailQueue.add.mockRejectedValue(error);

      await expect(service.enqueueMailJob(jobName, data)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to add mail job '${jobName}' for recipient: ${data.to}`,
        error.stack,
      );
    });
  });

  describe('sendEmailOrderCreated', () => {
    const validPayload: SendEmailOrderCreatedPayload = {
      email: 'admin@example.com',
      name: 'Admin User',
      data: {
        orderId: 12345,
        userId: 1,
        userName: 'John Doe',
        paymentMethod: 'Cash',
        totalAmount: 99.99,
        paymentStatus: 'PAID',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        lang: 'en',
      },
    };

    const mockTranslatedSubject = 'Order 12345 has been created';
    const mockTranslatedIntro = 'Hello Admin User, a new order has been created.';
    const mockTranslatedLabels = {
      orderId: 'Order ID',
      user: 'Customer',
      paymentMethod: 'Payment Method',
      totalPrice: 'Total Amount',
      paymentStatus: 'Payment Status',
      createdAt: 'Created At',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockPlainToInstance.mockReturnValue(validPayload);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockI18nService.translate
        .mockReturnValueOnce(mockTranslatedSubject)
        .mockReturnValueOnce(mockTranslatedIntro)
        .mockReturnValueOnce(mockTranslatedLabels);
      mockMailerService.sendMail.mockResolvedValue(undefined);
    });

    describe('Happy Path', () => {
      it('should send email successfully with valid payload', async () => {
        const i18nServiceSpy = jest.spyOn(mockI18nService, 'translate');
        const mailerServiceSpy = jest.spyOn(mockMailerService, 'sendMail');

        await service.sendEmailOrderCreated(validPayload);

        expect(mockPlainToInstance).toHaveBeenCalledWith(expect.anything(), validPayload);
        expect(mockValidateOrReject).toHaveBeenCalledWith(validPayload);

        expect(i18nServiceSpy).toHaveBeenCalledWith('common.order.notification.email.subject', {
          lang: 'en',
          args: { orderId: 12345 },
        });
        expect(i18nServiceSpy).toHaveBeenCalledWith('common.order.notification.email.intro', {
          lang: 'en',
          args: { adminName: 'Admin User' },
        });
        expect(i18nServiceSpy).toHaveBeenCalledWith('common.order.notification.email.labels', {
          lang: 'en',
        });

        expect(mailerServiceSpy).toHaveBeenCalledWith({
          to: 'admin@example.com',
          subject: mockTranslatedSubject,
          template: 'send-email-order-created',
          context: {
            intro: mockTranslatedIntro,
            labels: mockTranslatedLabels,
            order: {
              id: 12345,
              user: 'John Doe',
              paymentMethod: 'Cash',
              totalPrice: 99.99,
              paymentStatus: 'PAID',
              createdAt: 'Jan 1,2024, 5:00 PM',
              url: 'https://your-system.com/orders/12345',
            },
          },
        });
      });

      it('should handle Vietnamese language correctly', async () => {
        const vietnamesePayload: SendEmailOrderCreatedPayload = {
          ...validPayload,
          data: {
            ...validPayload.data,
            lang: 'vi',
          },
        };

        mockPlainToInstance.mockReturnValue(vietnamesePayload);
        const i18nServiceSpy = jest.spyOn(mockI18nService, 'translate');

        await service.sendEmailOrderCreated(vietnamesePayload);

        expect(i18nServiceSpy).toHaveBeenCalledWith('common.order.notification.email.subject', {
          lang: 'vi',
          args: { orderId: 12345 },
        });
        expect(i18nServiceSpy).toHaveBeenCalledWith('common.order.notification.email.intro', {
          lang: 'vi',
          args: { adminName: 'Admin User' },
        });
        expect(i18nServiceSpy).toHaveBeenCalledWith('common.order.notification.email.labels', {
          lang: 'vi',
        });
      });
    });

    describe('Validation Errors', () => {
      it('should throw TypedRpcException when payload validation fails', async () => {
        const invalidPayload: SendEmailOrderCreatedPayload = {
          email: 'invalid-email',
          name: 'Admin User',
          data: {
            orderId: 12345,
            userId: 1,
            userName: 'John Doe',
            paymentMethod: 'Cash',
            totalAmount: 99.99,
            paymentStatus: 'PAID',
            createdAt: new Date('2024-01-01T10:00:00Z'),
            lang: 'en',
          },
        };

        const validationError = new Error('Validation failed');
        mockValidateOrReject.mockRejectedValue(validationError);
        const loggerSpy = jest.spyOn(mockLogger, 'error');
        const mailerSpy = jest.spyOn(mockMailerService, 'sendMail');

        try {
          await service.sendEmailOrderCreated(invalidPayload);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          const typedError = error as TypedRpcException;
          expect(typedError.getError().code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
          expect(typedError.getError().message).toBe('Order created payload invalid ');
        }

        expect(loggerSpy).toHaveBeenCalledWith(
          '[Order Created payload invalid]',
          `Payload:: ${JSON.stringify(invalidPayload)} - Errors detail:: ${JSON.stringify(validationError)}`,
        );
        expect(mailerSpy).not.toHaveBeenCalled();
      });

      it('should handle missing required fields', async () => {
        const invalidPayload = {
          ...validPayload,
          email: undefined,
        } as unknown as SendEmailOrderCreatedPayload;

        const validationError = new Error('Email is required');
        mockValidateOrReject.mockRejectedValue(validationError);
        const loggerSpy = jest.spyOn(mockLogger, 'error');

        try {
          await service.sendEmailOrderCreated(invalidPayload);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          const typedError = error as TypedRpcException;
          expect(typedError.getError().code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        }

        expect(loggerSpy).toHaveBeenCalledWith(
          '[Order Created payload invalid]',
          `Payload:: ${JSON.stringify(invalidPayload)} - Errors detail:: ${JSON.stringify(validationError)}`,
        );
      });
    });

    describe('Email Sending Errors', () => {
      it('should log error but not throw when mailer service fails', async () => {
        const mailerError = new Error('SMTP connection failed');
        mockMailerService.sendMail.mockRejectedValue(mailerError);
        const loggerSpy = jest.spyOn(mockLogger, 'error');
        // Should not throw - method catches and logs the error

        await expect(service.sendEmailOrderCreated(validPayload)).rejects.toThrow(
          'SMTP connection failed',
        );

        expect(loggerSpy).toHaveBeenCalledWith(
          'sendEmailOrderCreated -[Mailer general error]',
          `SMTP connection failed`,
        );
      });
      it('should handle timeout errors from mailer service', async () => {
        const timeoutError = new Error('Request timeout');
        mockMailerService.sendMail.mockRejectedValue(timeoutError);
        const loggerSpy = jest.spyOn(mockLogger, 'error');
        await expect(service.sendEmailOrderCreated(validPayload)).rejects.toThrow(
          'Request timeout',
        );
        expect(loggerSpy).toHaveBeenCalledWith(
          'sendEmailOrderCreated - [Mailer timeout]',
          `Request timeout`,
        );
      });

      it('should handle authentication errors from mailer service', async () => {
        const authError = new Error('Authentication failed');
        mockMailerService.sendMail.mockRejectedValue(authError);
        const loggerSpy = jest.spyOn(mockLogger, 'error');
        await expect(service.sendEmailOrderCreated(validPayload)).rejects.toThrow(
          'Authentication failed',
        );
        expect(loggerSpy).toHaveBeenCalledWith(
          'sendEmailOrderCreated - [Mailer auth error]',
          `Authentication failed`,
        );
      });
    });
  });
  describe('sendStatisticOrderMonthly', () => {
    const validPayload: SendStatisticOrderMonthly = {
      email: 'invalid-email',
      data: 'data' as unknown as StatisticOrderByMonthResponse,
      lang: SUPPORTED_LOCALES.en,
      month: 10,
      year: 2025,
      name: 'Tran Van B',
    };
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should throw TypedRpcException and log error if payload validation fails', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationErrors',
      };
      mockValidateOrReject.mockRejectedValue(new TypedRpcException(rpcError));
      await expect(service.sendStatisticOrderMonthly(validPayload)).rejects.toThrow(
        TypedRpcException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `[Send statistic order monthly payload invalid]`,
        expect.stringContaining('"name":"Tran Van B"'),
      );
      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should send email successfully when payload is valid', async () => {
      mockValidateOrReject.mockResolvedValue(undefined);
      jest.spyOn(service as any, 'buildContentSendStatisticOrder').mockReturnValue({
        subject: 'Monthly Statistic',
        context: { totalOrders: 10 },
      });
      mockMailerService.sendMail.mockResolvedValue(undefined);

      await service.sendStatisticOrderMonthly(validPayload);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: validPayload.email,
        subject: 'Monthly Statistic',
        template: 'statistic-order-monthly',
        context: { totalOrders: 10 },
      });
    });
    it('should log error and rethrow if mailerService.sendMail fails', async () => {
      mockValidateOrReject.mockResolvedValue(undefined);
      jest.spyOn(service as any, 'buildContentSendStatisticOrder').mockReturnValue({
        subject: 'Monthly Statistic',
        context: { totalOrders: 10 },
      });
      const error = new Error('SendMail failed');
      mockMailerService.sendMail.mockRejectedValue(error);

      await expect(service.sendStatisticOrderMonthly(validPayload)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `sendStatisticOrderMonthly -[Mailer general error]`,
        expect.stringContaining('SendMail failed'),
      );
    });
  });
});
