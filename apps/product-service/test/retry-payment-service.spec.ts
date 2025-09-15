import { NOTIFICATION_SERVICE } from '@app/common';
import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { EXPIRE_TIME_PAYMENT_DEFAULT } from '@app/common/constant/time.constant';
import { RetryPaymentRequest } from '@app/common/dto/product/requests/retry-payment.requqest';
import { PaymentInfoResponse } from '@app/common/dto/product/response/order-response';
import { PayOSCreatePaymentResponseDto } from '@app/common/dto/product/response/payos-creation.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { PrismaService } from '@app/prisma';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentMethod, PaymentStatus } from 'apps/product-service/generated/prisma';
import { I18nService } from 'nestjs-i18n';
import { ProductService } from '../src/product-service.service';
import { ProductProducer } from '../src/product.producer';
import { CacheService } from '@app/common/cache/cache.service';

describe('ProductService - retryPayment', () => {
  let service: ProductService;
  let loggerService: CustomLogger;
  let configService: ConfigService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let notificationClient: ClientProxy;
  let i18nService: I18nService;
  let productProducer: ProductProducer;
  let moduleRef: TestingModule;

  const mockPrismaService = {
    client: {
      order: {
        findUnique: jest.fn(),
      },
    },
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

  const mockNotificationClient = {
    emit: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
  };

  const mockProductProducer = {
    addJobRetryPayment: jest.fn(),
  };
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getOrSet: jest.fn(),
    deleteByPattern: jest.fn(),
  } as unknown as CacheService;
  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: PaginationService,
          useValue: {
            queryWithPagination: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NOTIFICATION_SERVICE,
          useValue: mockNotificationClient,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: ProductProducer,
          useValue: mockProductProducer,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = moduleRef.get<ProductService>(ProductService);
    loggerService = moduleRef.get<CustomLogger>(CustomLogger);
    configService = moduleRef.get<ConfigService>(ConfigService);
    notificationClient = moduleRef.get<ClientProxy>(NOTIFICATION_SERVICE);
    i18nService = moduleRef.get<I18nService>(I18nService);
    productProducer = moduleRef.get<ProductProducer>(ProductProducer);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('retryPayment', () => {
    const mockRetryPaymentRequest: RetryPaymentRequest = {
      userId: 1,
      orderId: 123,
      lang: 'en',
    };

    const mockOrderDetail = {
      id: 123,
      userId: 1,
      amount: 67.48,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.PENDING,
      deliveryAddress: '123 Test Street',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    };

    const mockPaymentData: PayOSCreatePaymentResponseDto = {
      data: {
        checkoutUrl: 'https://checkout.payos.vn/web/abc123',
        qrCode: '123',
        orderCode: 123,
        orderId: 123,
        amount: 67.48,
        description: 'PAY FOR ORDER-123',
      },
      desc: 'Payment created successfully',
    };

    const mockPaymentInfoResponse: PaymentInfoResponse = {
      qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
      expiredAt: '15 minutes left',
    };

    const mockSuccessResponse: BaseResponse<PaymentInfoResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockPaymentInfoResponse,
    };

    it('should retry payment successfully with valid request', async () => {
      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrderDetail);

      const configGetSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);

      const createPaymentInfoSpy = jest
        .spyOn(service, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      const i18nTranslateSpy = jest
        .spyOn(i18nService, 'translate')
        .mockReturnValue('15 minutes left');

      const result = await service.retryPayment(mockRetryPaymentRequest);

      expect(configGetSpy).toHaveBeenCalledWith('payOS.expireTime', EXPIRE_TIME_PAYMENT_DEFAULT);
      expect(configGetSpy).toHaveBeenCalledTimes(1);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(i18nTranslateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data!.qrCodeUrl).toBe('https://checkout.payos.vn/web/abc123');
    });

    it('should retry payment successfully with Vietnamese language', async () => {
      const viRequest: RetryPaymentRequest = {
        ...mockRetryPaymentRequest,
        lang: 'vi',
      };

      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrderDetail);

      const configGetSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);

      const createPaymentInfoSpy = jest
        .spyOn(service, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      const i18nTranslateSpy = jest
        .spyOn(i18nService, 'translate')
        .mockReturnValue('Còn lại 15 phút');

      const result = await service.retryPayment(viRequest);

      expect(configGetSpy).toHaveBeenCalledTimes(1);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(i18nTranslateSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data!.expiredAt).toBe('Còn lại 15 phút');
    });

    it('should handle different user IDs correctly', async () => {
      const differentUserRequest: RetryPaymentRequest = {
        userId: 999,
        orderId: 123,
        lang: 'en',
      };

      const differentUserOrder = {
        ...mockOrderDetail,
        userId: 999,
      };

      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(differentUserOrder);

      jest.spyOn(configService, 'get').mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);

      jest.spyOn(service, 'createPaymentInfo').mockResolvedValue(mockPaymentData);

      jest.spyOn(i18nService, 'translate').mockReturnValue('15 minutes left');

      const result = await service.retryPayment(differentUserRequest);

      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should handle different order IDs correctly', async () => {
      const differentOrderRequest: RetryPaymentRequest = {
        userId: 1,
        orderId: 456,
        lang: 'en',
      };

      const differentOrder = {
        ...mockOrderDetail,
        id: 456,
      };

      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(differentOrder);

      jest.spyOn(configService, 'get').mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);

      jest.spyOn(service, 'createPaymentInfo').mockResolvedValue(mockPaymentData);

      jest.spyOn(i18nService, 'translate').mockReturnValue('15 minutes left');

      const result = await service.retryPayment(differentOrderRequest);

      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should handle large order amounts correctly', async () => {
      const largeAmountOrder = {
        ...mockOrderDetail,
        amount: 9999.99,
      };

      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(largeAmountOrder);

      const configGetSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);

      const createPaymentInfoSpy = jest
        .spyOn(service, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      jest.spyOn(i18nService, 'translate').mockReturnValue('15 minutes left');

      const result = await service.retryPayment(mockRetryPaymentRequest);

      expect(configGetSpy).toHaveBeenCalledTimes(1);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should throw TypedRpcException when order is not found', async () => {
      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(null);

      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };

      try {
        await service.retryPayment(mockRetryPaymentRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should throw TypedRpcException when order belongs to different user', async () => {
      const wrongUserRequest: RetryPaymentRequest = {
        userId: 999,
        orderId: 123,
        lang: 'en',
      };

      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(null);

      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };

      try {
        await service.retryPayment(wrongUserRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should throw TypedRpcException when order is not BANK_TRANSFER payment method', async () => {
      const cashOrderRequest: RetryPaymentRequest = {
        userId: 1,
        orderId: 123,
        lang: 'en',
      };

      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(null); // Order not found because it's not BANK_TRANSFER

      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };

      try {
        await service.retryPayment(cashOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should handle undefined language gracefully', async () => {
      const undefinedLangRequest: RetryPaymentRequest = {
        userId: 1,
        orderId: 123,
        lang: undefined as unknown as SupportedLocalesType,
      };

      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrderDetail);

      const configGetSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);

      const createPaymentInfoSpy = jest
        .spyOn(service, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      jest.spyOn(i18nService, 'translate').mockReturnValue('15 minutes left');

      const result = await service.retryPayment(undefinedLangRequest);

      expect(configGetSpy).toHaveBeenCalledTimes(1);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should handle different QR code URL formats from payment service', async () => {
      const differentQrUrls = [
        'https://checkout.payos.vn/web/short123',
        'https://checkout.payos.vn/web/very-long-payment-id-with-many-characters-123456789',
        'https://checkout.payos.vn/web/special-chars-!@#$%^&*()',
        'https://checkout.payos.vn/web/unicode-chars-ñáéíóú',
      ];

      for (const qrUrl of differentQrUrls) {
        const paymentDataWithDifferentUrl: PayOSCreatePaymentResponseDto = {
          ...mockPaymentData,
          data: {
            ...mockPaymentData.data,
            checkoutUrl: qrUrl,
          },
        };
        (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrderDetail);
        const configGetSpy = jest
          .spyOn(configService, 'get')
          .mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);

        const createPaymentInfoSpy = jest
          .spyOn(service, 'createPaymentInfo')
          .mockResolvedValue(paymentDataWithDifferentUrl);

        jest.spyOn(i18nService, 'translate').mockReturnValue('15 minutes left');

        const result = await service.retryPayment(mockRetryPaymentRequest);

        expect(configGetSpy).toHaveBeenCalledTimes(1);
        expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
        expect(result.data!.qrCodeUrl).toBe(qrUrl);

        jest.clearAllMocks();
      }
    });

    it('should handle different expiration time formats', async () => {
      const differentExpirationTimes = [
        '1 minute left',
        '30 minutes left',
        '1 hour left',
        'Expired Time',
        'Còn lại 5 phút',
        'Hết hạn',
      ];
      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrderDetail);
      for (const expiredAt of differentExpirationTimes) {
        const configGetSpy = jest
          .spyOn(configService, 'get')
          .mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);

        const createPaymentInfoSpy = jest
          .spyOn(service, 'createPaymentInfo')
          .mockResolvedValue(mockPaymentData);

        jest.spyOn(i18nService, 'translate').mockReturnValue(expiredAt);

        const result = await service.retryPayment(mockRetryPaymentRequest);

        expect(configGetSpy).toHaveBeenCalledTimes(1);
        expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
        expect(result.data!.expiredAt).toBe(expiredAt);

        jest.clearAllMocks();
      }
    });

    it('should handle payment creation failure with timeout error and add retry job', async () => {
      const configGetSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);
      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(EXPIRE_TIME_PAYMENT_DEFAULT);
      const timeoutError = new TypedRpcException({
        code: HTTP_ERROR_CODE.TIME_OUT_OR_NETWORK,
        message: 'common.errors.timeOutOrNetwork',
      });

      const createPaymentInfoSpy = jest
        .spyOn(service, 'createPaymentInfo')
        .mockRejectedValue(timeoutError);

      const loggerErrorSpy = jest.spyOn(loggerService, 'error');
      const addJobRetryPaymentSpy = jest.spyOn(productProducer, 'addJobRetryPayment');

      try {
        await service.retryPayment(mockRetryPaymentRequest);
      } catch (error) {
        assertRpcException(error, HTTP_ERROR_CODE.TIME_OUT_OR_NETWORK, {
          code: HTTP_ERROR_CODE.TIME_OUT_OR_NETWORK,
          message: 'common.errors.timeOutOrNetwork',
        });
      }

      expect(configGetSpy).toHaveBeenCalledTimes(1);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(addJobRetryPaymentSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle payment creation failure with internal server error', async () => {
      const configGetSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);
      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrderDetail);

      const internalError = new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });

      const createPaymentInfoSpy = jest
        .spyOn(service, 'createPaymentInfo')
        .mockRejectedValue(internalError);

      const loggerErrorSpy = jest.spyOn(loggerService, 'error');
      const addJobRetryPaymentSpy = jest.spyOn(productProducer, 'addJobRetryPayment');

      try {
        await service.retryPayment(mockRetryPaymentRequest);
      } catch (error) {
        assertRpcException(error, HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR, {
          code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: 'common.errors.internalServerError',
        });
      }

      expect(configGetSpy).toHaveBeenCalledTimes(1);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(addJobRetryPaymentSpy).toHaveBeenCalledTimes(0); // Should not add retry job for non-timeout errors
    });

    it('should handle payment creation failure with validation error', async () => {
      const configGetSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);
      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrderDetail);

      const validationError = new TypedRpcException({
        code: HTTP_ERROR_CODE.VALIDATION_ERROR,
        message: 'common.errors.validationError',
      });

      const createPaymentInfoSpy = jest
        .spyOn(service, 'createPaymentInfo')
        .mockRejectedValue(validationError);

      const loggerErrorSpy = jest.spyOn(loggerService, 'error');
      const addJobRetryPaymentSpy = jest.spyOn(productProducer, 'addJobRetryPayment');

      try {
        await service.retryPayment(mockRetryPaymentRequest);
      } catch (error) {
        assertRpcException(error, HTTP_ERROR_CODE.VALIDATION_ERROR, {
          code: HTTP_ERROR_CODE.VALIDATION_ERROR,
          message: 'common.errors.validationError',
        });
      }

      expect(configGetSpy).toHaveBeenCalledTimes(1);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(addJobRetryPaymentSpy).toHaveBeenCalledTimes(0);
    });

    it('should handle different expire time configurations', async () => {
      const differentExpireTimes = ['15m', '30m', '1h', '2h'];
      for (const expireTime of differentExpireTimes) {
        const configGetSpy = jest.spyOn(configService, 'get').mockReturnValue(expireTime);
        (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrderDetail);
        const createPaymentInfoSpy = jest
          .spyOn(service, 'createPaymentInfo')
          .mockResolvedValue(mockPaymentData);
        jest.spyOn(i18nService, 'translate').mockReturnValue('15 minutes left');
        const result = await service.retryPayment(mockRetryPaymentRequest);
        expect(configGetSpy).toHaveBeenCalledWith('payOS.expireTime', EXPIRE_TIME_PAYMENT_DEFAULT);
        expect(configGetSpy).toHaveBeenCalledTimes(1);
        expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
        expect(result.statusKey).toBe(StatusKey.SUCCESS);

        jest.clearAllMocks();
      }
    });

    it('should handle complex order scenarios correctly', async () => {
      const complexOrder = {
        id: 999,
        userId: 12345,
        amount: 1234.56,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
        deliveryAddress: 'Complex address with special characters: áéíóú ñ @#$%^&*()',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const complexRequest: RetryPaymentRequest = {
        userId: 12345,
        orderId: 999,
        lang: 'vi',
      };

      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(complexOrder);

      const configGetSpy = jest
        .spyOn(configService, 'get')
        .mockReturnValue(EXPIRE_TIME_PAYMENT_DEFAULT);

      const createPaymentInfoSpy = jest
        .spyOn(service, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      jest.spyOn(i18nService, 'translate').mockReturnValue('Còn lại 15 phút');

      const result = await service.retryPayment(complexRequest);

      expect(configGetSpy).toHaveBeenCalledTimes(1);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data!.expiredAt).toBe('Còn lại 15 phút');
    });
  });
});
