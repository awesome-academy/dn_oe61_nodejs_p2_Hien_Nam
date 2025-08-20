import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { PaymentCreationRequestDto } from '@app/common/dto/product/requests/payment-creation.request';
import { ProductEvent } from '@app/common/enums/queue/product-event.enum';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { addJobWithRetry } from '@app/common/helpers/queue.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { getQueueToken } from '@nestjs/bull';
import { Test, TestingModule } from '@nestjs/testing';
import { Job, Queue } from 'bull';
import { ProductProducer } from '../src/product.producer';
import { ConfigService } from '@nestjs/config';

// Mock the queue helper
jest.mock('@app/common/helpers/queue.helper', () => ({
  addJobWithRetry: jest.fn(),
}));

describe('ProductProducer', () => {
  let producer: ProductProducer;
  let productQueue: Queue;
  let loggerService: CustomLogger;
  let moduleRef: TestingModule;

  const mockProductQueue = {
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
    removeJobs: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };
  const mockAddJobWithRetry = addJobWithRetry as jest.MockedFunction<typeof addJobWithRetry>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        ProductProducer,
        {
          provide: getQueueToken(QueueName.PRODUCT),
          useValue: mockProductQueue,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    producer = moduleRef.get<ProductProducer>(ProductProducer);
    productQueue = moduleRef.get<Queue>(getQueueToken(QueueName.PRODUCT));
    loggerService = moduleRef.get<CustomLogger>(CustomLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('addJobRetryPayment', () => {
    const mockPaymentPayload: PaymentCreationRequestDto = {
      amount: 67.48,
      orderId: 123,
      userId: 1,
      description: 'PAY FOR ORDER-123',
      expiredAt: Math.floor(Date.now() / 1000) + 900, // 15 minutes from now
    };

    it('should add retry payment job successfully with English language', async () => {
      const lang: SupportedLocalesType = 'en';
      mockAddJobWithRetry.mockResolvedValue(undefined);

      await producer.addJobRetryPayment(lang, mockPaymentPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
        lang,
        payload: mockPaymentPayload,
      });
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(1);
    });

    it('should add retry payment job successfully with Vietnamese language', async () => {
      const lang: SupportedLocalesType = 'vi';
      mockAddJobWithRetry.mockResolvedValue(undefined);

      await producer.addJobRetryPayment(lang, mockPaymentPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
        lang,
        payload: mockPaymentPayload,
      });
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(1);
    });

    it('should handle different payment amounts correctly', async () => {
      const differentAmounts = [1.0, 99.99, 1000.5, 9999.99];
      const lang: SupportedLocalesType = 'en';

      for (const amount of differentAmounts) {
        const payloadWithDifferentAmount: PaymentCreationRequestDto = {
          ...mockPaymentPayload,
          amount,
        };

        mockAddJobWithRetry.mockResolvedValue(undefined);

        await producer.addJobRetryPayment(lang, payloadWithDifferentAmount);

        expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
          lang,
          payload: payloadWithDifferentAmount,
        });

        jest.clearAllMocks();
      }
    });

    it('should handle different order IDs correctly', async () => {
      const differentOrderIds = [1, 999, 12345, 99999];
      const lang: SupportedLocalesType = 'en';

      for (const orderId of differentOrderIds) {
        const payloadWithDifferentOrderId: PaymentCreationRequestDto = {
          ...mockPaymentPayload,
          orderId,
          description: `PAY FOR ORDER-${orderId}`,
        };

        mockAddJobWithRetry.mockResolvedValue(undefined);

        await producer.addJobRetryPayment(lang, payloadWithDifferentOrderId);

        expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
          lang,
          payload: payloadWithDifferentOrderId,
        });

        jest.clearAllMocks();
      }
    });

    it('should handle different user IDs correctly', async () => {
      const differentUserIds = [1, 100, 5000, 99999];
      const lang: SupportedLocalesType = 'en';

      for (const userId of differentUserIds) {
        const payloadWithDifferentUserId: PaymentCreationRequestDto = {
          ...mockPaymentPayload,
          userId,
        };

        mockAddJobWithRetry.mockResolvedValue(undefined);

        await producer.addJobRetryPayment(lang, payloadWithDifferentUserId);

        expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
          lang,
          payload: payloadWithDifferentUserId,
        });

        jest.clearAllMocks();
      }
    });

    it('should handle different expiration times correctly', async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const differentExpirationTimes = [
        currentTime + 300, // 5 minutes
        currentTime + 900, // 15 minutes
        currentTime + 1800, // 30 minutes
        currentTime + 3600, // 1 hour
      ];
      const lang: SupportedLocalesType = 'en';

      for (const expiredAt of differentExpirationTimes) {
        const payloadWithDifferentExpiration: PaymentCreationRequestDto = {
          ...mockPaymentPayload,
          expiredAt,
        };

        mockAddJobWithRetry.mockResolvedValue(undefined);

        await producer.addJobRetryPayment(lang, payloadWithDifferentExpiration);

        expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
          lang,
          payload: payloadWithDifferentExpiration,
        });

        jest.clearAllMocks();
      }
    });

    it('should handle different description formats correctly', async () => {
      const differentDescriptions = ['PAY FOR ORDER-1', 'PAY FOR ORDER-999', 'PAY FOR ORDER-12345'];
      const lang: SupportedLocalesType = 'en';

      for (const description of differentDescriptions) {
        const payloadWithDifferentDescription: PaymentCreationRequestDto = {
          ...mockPaymentPayload,
          description,
        };

        mockAddJobWithRetry.mockResolvedValue(undefined);

        await producer.addJobRetryPayment(lang, payloadWithDifferentDescription);

        expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
          lang,
          payload: payloadWithDifferentDescription,
        });

        jest.clearAllMocks();
      }
    });

    it('should handle undefined language gracefully', async () => {
      const undefinedLang = undefined as unknown as SupportedLocalesType;
      mockAddJobWithRetry.mockResolvedValue(undefined);

      await producer.addJobRetryPayment(undefinedLang, mockPaymentPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
        lang: undefinedLang,
        payload: mockPaymentPayload,
      });
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(1);
    });

    it('should handle complex payment payload correctly', async () => {
      const complexPayload: PaymentCreationRequestDto = {
        amount: 1234.56,
        orderId: 99999,
        userId: 12345,
        description: 'Complex payment with special characters: áéíóú ñ @#$%^&*()',
        expiredAt: Math.floor(Date.now() / 1000) + 7200, // 2 hours
      };
      const lang: SupportedLocalesType = 'vi';

      mockAddJobWithRetry.mockResolvedValue(undefined);

      await producer.addJobRetryPayment(lang, complexPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
        lang,
        payload: complexPayload,
      });
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(1);
    });

    it('should log error and not throw when addJobWithRetry fails', async () => {
      const lang: SupportedLocalesType = 'en';
      const queueError = new Error('Queue connection failed');
      const loggerErrorSpy = jest.spyOn(loggerService, 'error');

      mockAddJobWithRetry.mockRejectedValue(queueError);

      await producer.addJobRetryPayment(lang, mockPaymentPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
        lang,
        payload: mockPaymentPayload,
      });
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[Add job retry payment failed]',
        `Details:: ${queueError.stack}`,
      );
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should log error and not throw when addJobWithRetry fails with timeout error', async () => {
      const lang: SupportedLocalesType = 'vi';
      const timeoutError = new Error('Queue timeout');
      timeoutError.stack = 'Error: Queue timeout\n    at ProductProducer.addJobRetryPayment';
      const loggerErrorSpy = jest.spyOn(loggerService, 'error');

      mockAddJobWithRetry.mockRejectedValue(timeoutError);

      await producer.addJobRetryPayment(lang, mockPaymentPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[Add job retry payment failed]',
        `Details:: ${timeoutError.stack}`,
      );
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should log error and not throw when addJobWithRetry fails with network error', async () => {
      const lang: SupportedLocalesType = 'en';
      const networkError = new Error('Network connection lost');
      networkError.stack = 'Error: Network connection lost\n    at Queue.add';
      const loggerErrorSpy = jest.spyOn(loggerService, 'error');

      mockAddJobWithRetry.mockRejectedValue(networkError);

      await producer.addJobRetryPayment(lang, mockPaymentPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[Add job retry payment failed]',
        `Details:: ${networkError.stack}`,
      );
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should log error and not throw when addJobWithRetry fails with Redis error', async () => {
      const lang: SupportedLocalesType = 'vi';
      const redisError = new Error('Redis connection refused');
      redisError.stack = 'Error: Redis connection refused\n    at RedisClient.connect';
      const loggerErrorSpy = jest.spyOn(loggerService, 'error');

      mockAddJobWithRetry.mockRejectedValue(redisError);

      await expect(producer.addJobRetryPayment(lang, mockPaymentPayload)).resolves.toBeUndefined();

      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[Add job retry payment failed]',
        `Details:: ${redisError.stack}`,
      );
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle error without stack trace gracefully', async () => {
      const lang: SupportedLocalesType = 'en';
      const errorWithoutStack = new Error('Simple error');
      errorWithoutStack.stack = undefined;
      const loggerErrorSpy = jest.spyOn(loggerService, 'error');

      mockAddJobWithRetry.mockRejectedValue(errorWithoutStack);

      await expect(producer.addJobRetryPayment(lang, mockPaymentPayload)).resolves.toBeUndefined();

      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[Add job retry payment failed]',
        'Details:: undefined',
      );
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple consecutive calls correctly', async () => {
      const lang: SupportedLocalesType = 'en';
      const payloads = [
        { ...mockPaymentPayload, orderId: 1, amount: 10.0 },
        { ...mockPaymentPayload, orderId: 2, amount: 20.0 },
        { ...mockPaymentPayload, orderId: 3, amount: 30.0 },
      ];

      mockAddJobWithRetry.mockResolvedValue(undefined);

      for (const payload of payloads) {
        await producer.addJobRetryPayment(lang, payload);
      }

      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(3);
      payloads.forEach((payload, index) => {
        expect(mockAddJobWithRetry).toHaveBeenNthCalledWith(
          index + 1,
          productQueue,
          ProductEvent.PAYMENT_RETRY,
          { lang, payload },
        );
      });
    });

    it('should handle mixed success and failure scenarios', async () => {
      const lang: SupportedLocalesType = 'en';
      const loggerErrorSpy = jest.spyOn(loggerService, 'error');

      // First call succeeds
      mockAddJobWithRetry.mockResolvedValueOnce(undefined);
      await producer.addJobRetryPayment(lang, mockPaymentPayload);

      // Second call fails
      const error = new Error('Queue full');
      mockAddJobWithRetry.mockRejectedValueOnce(error);
      await producer.addJobRetryPayment(lang, mockPaymentPayload);

      // Third call succeeds
      mockAddJobWithRetry.mockResolvedValueOnce(undefined);
      await producer.addJobRetryPayment(lang, mockPaymentPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(3);
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[Add job retry payment failed]',
        `Details:: ${error.stack}`,
      );
    });

    it('should use correct queue and event type', async () => {
      const lang: SupportedLocalesType = 'en';
      mockAddJobWithRetry.mockResolvedValue(undefined);

      await producer.addJobRetryPayment(lang, mockPaymentPayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
        lang,
        payload: mockPaymentPayload,
      });

      // Verify correct queue instance is used
      expect(mockAddJobWithRetry.mock.calls[0][0]).toBe(productQueue);
      // Verify correct event type is used
      expect(mockAddJobWithRetry.mock.calls[0][1]).toBe(ProductEvent.PAYMENT_RETRY);
    });

    it('should handle large payload data correctly', async () => {
      const largePayload: PaymentCreationRequestDto = {
        amount: 999999.99,
        orderId: 999999999,
        userId: 999999999,
        description: 'A'.repeat(1000), // Very long description
        expiredAt: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      };
      const lang: SupportedLocalesType = 'vi';

      mockAddJobWithRetry.mockResolvedValue(undefined);

      await producer.addJobRetryPayment(lang, largePayload);

      expect(mockAddJobWithRetry).toHaveBeenCalledWith(productQueue, ProductEvent.PAYMENT_RETRY, {
        lang,
        payload: largePayload,
      });
      expect(mockAddJobWithRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('addJobHandleExpiredPaymentOrder', () => {
    const mockOrderId = 123;
    const mockExpiredAt = Math.floor(Date.now() / 1000) + 900; // 15 minutes from now
    const mockReminderBeforeExpire = '300000'; // 5 minutes in ms

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // Mock current time
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should add expired payment order job successfully with valid parameters', async () => {
      const productQueueAddSpy = jest.spyOn(productQueue, 'add');
      const loggerLogSpy = jest.spyOn(loggerService, 'log');
      const loggerDebugSpy = jest.spyOn(loggerService, 'debug');
      const configServiceGetSpy = jest.spyOn(mockConfigService, 'get');

      configServiceGetSpy.mockReturnValue(mockReminderBeforeExpire);
      productQueueAddSpy.mockResolvedValue({} as unknown as Job);

      await producer.addJobHandleExpiredPaymentOrder(mockOrderId, mockExpiredAt);

      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Add job handle expired payment orderId ${mockOrderId}`,
      );
      expect(configServiceGetSpy).toHaveBeenCalledWith('payOS.reminderBeforeExpire', '30m');
      expect(loggerDebugSpy).toHaveBeenCalledWith(`[Reminder ms:: ] ${mockReminderBeforeExpire}`);

      const expectedJobId = `expired-${mockOrderId}`;
      const expectedDelay = (mockExpiredAt - Math.floor(1640995200000 / 1000)) * 1000;

      expect(productQueueAddSpy).toHaveBeenCalledWith(
        ProductEvent.EXPIRED_PAYMENT_ORDER,
        { orderId: mockOrderId },
        { delay: expectedDelay, jobId: expectedJobId },
      );
      expect(productQueueAddSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle different order IDs correctly', async () => {
      const differentOrderIds = [1, 999, 12345, 99999];
      const productQueueAddSpy = jest.spyOn(productQueue, 'add');
      const configServiceGetSpy = jest.spyOn(mockConfigService, 'get');

      configServiceGetSpy.mockReturnValue(mockReminderBeforeExpire);
      productQueueAddSpy.mockResolvedValue({} as unknown as Job);

      for (const orderId of differentOrderIds) {
        await producer.addJobHandleExpiredPaymentOrder(orderId, mockExpiredAt);

        const expectedJobId = `expired-${orderId}`;
        expect(productQueueAddSpy).toHaveBeenCalledWith(
          ProductEvent.EXPIRED_PAYMENT_ORDER,
          { orderId },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          { delay: expect.any(Number), jobId: expectedJobId },
        );

        jest.clearAllMocks();
      }
    });

    it('should handle different expiration times correctly', async () => {
      const currentTimeSec = Math.floor(1640995200000 / 1000);
      const differentExpirationTimes = [
        currentTimeSec + 300, // 5 minutes
        currentTimeSec + 900, // 15 minutes
        currentTimeSec + 1800, // 30 minutes
        currentTimeSec + 3600, // 1 hour
      ];
      const productQueueAddSpy = jest.spyOn(productQueue, 'add');
      const configServiceGetSpy = jest.spyOn(mockConfigService, 'get');

      configServiceGetSpy.mockReturnValue(mockReminderBeforeExpire);
      productQueueAddSpy.mockResolvedValue({} as unknown as Job);

      for (const expiredAt of differentExpirationTimes) {
        await producer.addJobHandleExpiredPaymentOrder(mockOrderId, expiredAt);

        const expectedDelay = (expiredAt - currentTimeSec) * 1000;
        expect(productQueueAddSpy).toHaveBeenCalledWith(
          ProductEvent.EXPIRED_PAYMENT_ORDER,
          { orderId: mockOrderId },
          { delay: expectedDelay, jobId: `expired-${mockOrderId}` },
        );

        jest.clearAllMocks();
      }
    });

    it('should not add job when expiration time is in the past', async () => {
      const pastExpiredAt = Math.floor(1640995200000 / 1000) - 300; // 5 minutes ago
      const productQueueAddSpy = jest.spyOn(productQueue, 'add');
      const configServiceGetSpy = jest.spyOn(mockConfigService, 'get');

      configServiceGetSpy.mockReturnValue(mockReminderBeforeExpire);

      await producer.addJobHandleExpiredPaymentOrder(mockOrderId, pastExpiredAt);

      expect(productQueueAddSpy).not.toHaveBeenCalled();
    });

    it('should use default reminder value when config is not available', async () => {
      const productQueueAddSpy = jest.spyOn(productQueue, 'add');
      const configServiceGetSpy = jest.spyOn(mockConfigService, 'get');
      const loggerDebugSpy = jest.spyOn(loggerService, 'debug');

      configServiceGetSpy.mockReturnValue(undefined);
      productQueueAddSpy.mockResolvedValue({} as unknown as Job);

      await producer.addJobHandleExpiredPaymentOrder(mockOrderId, mockExpiredAt);

      expect(configServiceGetSpy).toHaveBeenCalledWith('payOS.reminderBeforeExpire', '30m');
      expect(loggerDebugSpy).toHaveBeenCalledWith('[Reminder ms:: ] undefined');
      expect(productQueueAddSpy).toHaveBeenCalledTimes(1);
    });

    it('should log error and not throw when queue.add fails', async () => {
      const queueError = new Error('Queue connection failed');
      const productQueueAddSpy = jest.spyOn(productQueue, 'add');
      const loggerErrorSpy = jest.spyOn(loggerService, 'error');
      const configServiceGetSpy = jest.spyOn(mockConfigService, 'get');

      configServiceGetSpy.mockReturnValue(mockReminderBeforeExpire);
      productQueueAddSpy.mockRejectedValue(queueError);

      await producer.addJobHandleExpiredPaymentOrder(mockOrderId, mockExpiredAt);

      expect(productQueueAddSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[ADD JOB handle expired payment order failed]',
        `Details:: ${queueError.stack}`,
      );
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should log error and not throw when queue.add fails with timeout error', async () => {
      const timeoutError = new Error('Queue timeout');
      timeoutError.stack =
        'Error: Queue timeout\n    at ProductProducer.addJobHandleExpiredPaymentOrder';
      const productQueueAddSpy = jest.spyOn(productQueue, 'add');
      const loggerErrorSpy = jest.spyOn(loggerService, 'error');
      const configServiceGetSpy = jest.spyOn(mockConfigService, 'get');

      configServiceGetSpy.mockReturnValue(mockReminderBeforeExpire);
      productQueueAddSpy.mockRejectedValue(timeoutError);

      await producer.addJobHandleExpiredPaymentOrder(mockOrderId, mockExpiredAt);

      expect(productQueueAddSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[ADD JOB handle expired payment order failed]',
        `Details:: ${timeoutError.stack}`,
      );
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle error without stack trace gracefully', async () => {
      const errorWithoutStack = new Error('Simple error');
      errorWithoutStack.stack = undefined;
      const productQueueAddSpy = jest.spyOn(productQueue, 'add');
      const loggerErrorSpy = jest.spyOn(loggerService, 'error');
      const configServiceGetSpy = jest.spyOn(mockConfigService, 'get');

      configServiceGetSpy.mockReturnValue(mockReminderBeforeExpire);
      productQueueAddSpy.mockRejectedValue(errorWithoutStack);

      await expect(
        producer.addJobHandleExpiredPaymentOrder(mockOrderId, mockExpiredAt),
      ).resolves.toBeUndefined();

      expect(productQueueAddSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[ADD JOB handle expired payment order failed]',
        'Details:: undefined',
      );
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should calculate delay correctly for edge cases', async () => {
      const currentTimeSec = Math.floor(1640995200000 / 1000);
      const edgeCases = [
        { expiredAt: currentTimeSec + 1, expectedDelay: 1000 }, // 1 second
        { expiredAt: currentTimeSec + 60, expectedDelay: 60000 }, // 1 minute
        { expiredAt: currentTimeSec + 86400, expectedDelay: 86400000 }, // 1 day
      ];

      const productQueueAddSpy = jest.spyOn(productQueue, 'add');
      const configServiceGetSpy = jest.spyOn(mockConfigService, 'get');

      configServiceGetSpy.mockReturnValue(mockReminderBeforeExpire);
      productQueueAddSpy.mockResolvedValue({} as unknown as Job);

      for (const { expiredAt, expectedDelay } of edgeCases) {
        await producer.addJobHandleExpiredPaymentOrder(mockOrderId, expiredAt);

        expect(productQueueAddSpy).toHaveBeenCalledWith(
          ProductEvent.EXPIRED_PAYMENT_ORDER,
          { orderId: mockOrderId },
          { delay: expectedDelay, jobId: `expired-${mockOrderId}` },
        );

        jest.clearAllMocks();
      }
    });
  });

  describe('clearScheduleHandleExpiredPayment', () => {
    const mockOrderId = 123;

    it('should remove scheduled job successfully with valid order ID', async () => {
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');
      productQueueRemoveJobsSpy.mockResolvedValue({} as unknown as void);
      await producer.clearScheduleHandleExpiredPayment(mockOrderId);
      const expectedJobId = `expired-${mockOrderId}`;
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledWith(expectedJobId);
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle different order IDs correctly', async () => {
      const differentOrderIds = [1, 999, 12345, 99999];
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');

      productQueueRemoveJobsSpy.mockResolvedValue({} as unknown as void);

      for (const orderId of differentOrderIds) {
        await producer.clearScheduleHandleExpiredPayment(orderId);

        const expectedJobId = `expired-${orderId}`;
        expect(productQueueRemoveJobsSpy).toHaveBeenCalledWith(expectedJobId);

        jest.clearAllMocks();
      }
    });

    it('should handle zero order ID', async () => {
      const zeroOrderId = 0;
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');
      productQueueRemoveJobsSpy.mockResolvedValue({} as unknown as void);

      await producer.clearScheduleHandleExpiredPayment(zeroOrderId);

      const expectedJobId = `expired-${zeroOrderId}`;
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledWith(expectedJobId);
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle negative order ID', async () => {
      const negativeOrderId = -123;
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');
      productQueueRemoveJobsSpy.mockResolvedValue({} as unknown as void);

      await producer.clearScheduleHandleExpiredPayment(negativeOrderId);

      const expectedJobId = `expired-${negativeOrderId}`;
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledWith(expectedJobId);
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle large order ID numbers', async () => {
      const largeOrderId = 999999999;
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');
      productQueueRemoveJobsSpy.mockResolvedValue({} as unknown as void);

      await producer.clearScheduleHandleExpiredPayment(largeOrderId);

      const expectedJobId = `expired-${largeOrderId}`;
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledWith(expectedJobId);
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle when no jobs are found to remove', async () => {
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');
      productQueueRemoveJobsSpy.mockResolvedValue({} as unknown as void); // No jobs removed

      await producer.clearScheduleHandleExpiredPayment(mockOrderId);

      const expectedJobId = `expired-${mockOrderId}`;
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledWith(expectedJobId);
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle when multiple jobs are removed', async () => {
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');
      productQueueRemoveJobsSpy.mockResolvedValue({} as unknown as void); // Multiple jobs removed

      await producer.clearScheduleHandleExpiredPayment(mockOrderId);

      const expectedJobId = `expired-${mockOrderId}`;
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledWith(expectedJobId);
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle removeJobs failure gracefully', async () => {
      const queueError = new Error('Queue connection failed');
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');
      productQueueRemoveJobsSpy.mockRejectedValue(queueError);

      await expect(producer.clearScheduleHandleExpiredPayment(mockOrderId)).rejects.toThrow(
        'Queue connection failed',
      );

      const expectedJobId = `expired-${mockOrderId}`;
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledWith(expectedJobId);
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle Redis connection error', async () => {
      const redisError = new Error('Redis connection refused');
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');
      productQueueRemoveJobsSpy.mockRejectedValue(redisError);

      await expect(producer.clearScheduleHandleExpiredPayment(mockOrderId)).rejects.toThrow(
        'Redis connection refused',
      );

      const expectedJobId = `expired-${mockOrderId}`;
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledWith(expectedJobId);
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout error', async () => {
      const timeoutError = new Error('Operation timeout');
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');
      productQueueRemoveJobsSpy.mockRejectedValue(timeoutError);

      await expect(producer.clearScheduleHandleExpiredPayment(mockOrderId)).rejects.toThrow(
        'Operation timeout',
      );

      const expectedJobId = `expired-${mockOrderId}`;
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledWith(expectedJobId);
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple consecutive calls correctly', async () => {
      const orderIds = [1, 2, 3, 4, 5];
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');
      productQueueRemoveJobsSpy.mockResolvedValue({} as unknown as void);

      for (const orderId of orderIds) {
        await producer.clearScheduleHandleExpiredPayment(orderId);
      }

      expect(productQueueRemoveJobsSpy).toHaveBeenCalledTimes(5);
      orderIds.forEach((orderId, index) => {
        expect(productQueueRemoveJobsSpy).toHaveBeenNthCalledWith(index + 1, `expired-${orderId}`);
      });
    });

    it('should use correct job ID format', async () => {
      const testOrderId = 12345;
      const productQueueRemoveJobsSpy = jest.spyOn(productQueue, 'removeJobs');
      productQueueRemoveJobsSpy.mockResolvedValue({} as unknown as void);

      await producer.clearScheduleHandleExpiredPayment(testOrderId);

      // Verify the exact format of job ID
      expect(productQueueRemoveJobsSpy).toHaveBeenCalledWith('expired-12345');
      expect(productQueueRemoveJobsSpy.mock.calls[0][0]).toMatch(/^expired-\d+$/);
    });
  });
});
