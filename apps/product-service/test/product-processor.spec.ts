import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { DeleteSoftCartRequest } from '@app/common/dto/product/requests/delete-soft-cart.request';
import { PaymentCreationRequestDto } from '@app/common/dto/product/requests/payment-creation.request';

import { PayOSCreatePaymentResponseDto } from '@app/common/dto/product/response/payos-creation.response';

import { OrderResponse } from '@app/common/dto/product/response/order-response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { handleJobError } from '@app/common/helpers/queue.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { getRemainingTime } from '@app/common/utils/date.util';
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { I18nService } from 'nestjs-i18n';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../generated/prisma';
import { ProductService } from '../src/product-service.service';
import { ProductProcessor } from '../src/product.processor';

jest.mock('@app/common/helpers/queue.helper', () => ({
  handleJobError: jest.fn(),
}));

jest.mock('@app/common/utils/date.util', () => ({
  getRemainingTime: jest.fn(),
}));

describe('ProductProcessor', () => {
  let processor: ProductProcessor;
  let productService: ProductService;
  let loggerService: CustomLogger;
  let i18nService: I18nService;
  let moduleRef: TestingModule;

  const mockProductService = {
    deleteSoftCart: jest.fn(),
    createPaymentInfo: jest.fn(),
    updateOrderPaymentInfo: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
  };

  const mockHandleJobError = handleJobError as jest.MockedFunction<typeof handleJobError>;
  const mockGetRemainingTime = getRemainingTime as jest.MockedFunction<typeof getRemainingTime>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        ProductProcessor,
        {
          provide: ProductService,
          useValue: mockProductService,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    processor = moduleRef.get<ProductProcessor>(ProductProcessor);
    productService = moduleRef.get<ProductService>(ProductService);
    loggerService = moduleRef.get<CustomLogger>(CustomLogger);
    i18nService = moduleRef.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('handleSoftDeleteCart', () => {
    const mockDeleteSoftCartRequest: DeleteSoftCartRequest = {
      userId: 1,
    };
    const mockJob: Job<DeleteSoftCartRequest> = {
      id: 'job-1',
      data: mockDeleteSoftCartRequest,
      opts: {},
      progress: jest.fn(),
      log: jest.fn(),
      getState: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      retry: jest.fn(),
      discard: jest.fn(),
      promote: jest.fn(),
    } as unknown as Job<DeleteSoftCartRequest>;

    it('should handle soft delete cart successfully', async () => {
      const deleteSoftCartSpy = jest
        .spyOn(productService, 'deleteSoftCart')
        .mockResolvedValue(undefined);

      await processor.handleSoftDeleteCart(mockJob);

      expect(deleteSoftCartSpy).toHaveBeenCalledWith(mockDeleteSoftCartRequest);
      expect(deleteSoftCartSpy).toHaveBeenCalledTimes(1);
      expect(mockHandleJobError).not.toHaveBeenCalled();
    });

    it('should handle different user IDs correctly', async () => {
      const differentUserRequest: DeleteSoftCartRequest = {
        userId: 999,
      };

      const differentUserJob: Job<DeleteSoftCartRequest> = {
        ...mockJob,
        data: differentUserRequest,
      };

      const deleteSoftCartSpy = jest
        .spyOn(productService, 'deleteSoftCart')
        .mockResolvedValue(undefined);

      await processor.handleSoftDeleteCart(differentUserJob);

      expect(deleteSoftCartSpy).toHaveBeenCalledWith(differentUserRequest);
      expect(deleteSoftCartSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle different product variant IDs correctly', async () => {
      const differentVariantRequest: DeleteSoftCartRequest = {
        userId: 1,
      };

      const differentVariantJob: Job<DeleteSoftCartRequest> = {
        ...mockJob,
        data: differentVariantRequest,
      };

      const deleteSoftCartSpy = jest
        .spyOn(productService, 'deleteSoftCart')
        .mockResolvedValue(undefined);

      await processor.handleSoftDeleteCart(differentVariantJob);

      expect(deleteSoftCartSpy).toHaveBeenCalledWith(differentVariantRequest);
      expect(deleteSoftCartSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle service error and call handleJobError', async () => {
      const serviceError = new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.cart.notFound',
      });

      const deleteSoftCartSpy = jest
        .spyOn(productService, 'deleteSoftCart')
        .mockRejectedValue(serviceError);

      await processor.handleSoftDeleteCart(mockJob);

      expect(deleteSoftCartSpy).toHaveBeenCalledWith(mockDeleteSoftCartRequest);
      expect(deleteSoftCartSpy).toHaveBeenCalledTimes(1);
      expect(mockHandleJobError).toHaveBeenCalledWith(
        serviceError,
        mockJob,
        loggerService,
        '[Error delete soft cart]',
      );
      expect(mockHandleJobError).toHaveBeenCalledTimes(1);
    });

    it('should handle database error and call handleJobError', async () => {
      const databaseError = new Error('Database connection failed');

      const deleteSoftCartSpy = jest
        .spyOn(productService, 'deleteSoftCart')
        .mockRejectedValue(databaseError);

      await processor.handleSoftDeleteCart(mockJob);

      expect(deleteSoftCartSpy).toHaveBeenCalledTimes(1);
      expect(mockHandleJobError).toHaveBeenCalledWith(
        databaseError,
        mockJob,
        loggerService,
        '[Error delete soft cart]',
      );
      expect(mockHandleJobError).toHaveBeenCalledTimes(1);
    });

    it('should handle validation error and call handleJobError', async () => {
      const validationError = new TypedRpcException({
        code: HTTP_ERROR_CODE.VALIDATION_ERROR,
        message: 'common.errors.validationError',
      });

      const deleteSoftCartSpy = jest
        .spyOn(productService, 'deleteSoftCart')
        .mockRejectedValue(validationError);

      await processor.handleSoftDeleteCart(mockJob);

      expect(deleteSoftCartSpy).toHaveBeenCalledTimes(1);
      expect(mockHandleJobError).toHaveBeenCalledWith(
        validationError,
        mockJob,
        loggerService,
        '[Error delete soft cart]',
      );
      expect(mockHandleJobError).toHaveBeenCalledTimes(1);
    });
  });

  describe('handlePaymentRetry', () => {
    const mockPaymentPayload: PaymentCreationRequestDto = {
      amount: 67.48,
      orderId: 123,
      userId: 1,
      description: 'PAY FOR ORDER-123',
      expiredAt: Math.floor(Date.now() / 1000) + 900,
    };

    const mockJobData = {
      lang: 'en' as SupportedLocalesType,
      payload: mockPaymentPayload,
    };

    const mockPaymentRetryJob: Job<{
      lang: SupportedLocalesType;
      payload: PaymentCreationRequestDto;
    }> = {
      id: 'payment-job-1',
      data: mockJobData,
      opts: {},
      progress: jest.fn(),
      log: jest.fn(),
      getState: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      retry: jest.fn(),
      discard: jest.fn(),
      promote: jest.fn(),
    } as unknown as Job<{
      lang: SupportedLocalesType;
      payload: PaymentCreationRequestDto;
    }>;

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
    const mockOrderUpdateResult: OrderResponse = {
      id: 123,
      userId: 213,
      deliveryAddress: 'Da Nang city',
      note: 'Please deliver quickly',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.PENDING,
      totalPrice: 400000,
      items: [
        {
          id: 12,
          productVariantId: 12,
          productName: 'Pizza',
          productSize: 'S',
          quantity: 2,
          price: 200000,
          note: null,
        },
      ],
      paymentInfo: {
        qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
        expiredAt: '15 minutes left',
      },
      createdAt: new Date(),
    };

    it('should handle payment retry successfully with English language', async () => {
      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      mockGetRemainingTime.mockReturnValue('15 minutes left');
      const updateOrderPaymentInfoSpy = jest
        .spyOn(productService, 'updateOrderPaymentInfo')
        .mockResolvedValue(mockOrderUpdateResult);

      const loggerLogSpy = jest.spyOn(loggerService, 'log');

      await processor.handlePaymentRetry(mockPaymentRetryJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledWith(mockPaymentPayload);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(updateOrderPaymentInfoSpy).toHaveBeenCalledWith({
        orderId: mockPaymentPayload.orderId,
        qrCodeUrl: mockPaymentData.data.checkoutUrl,
        expiredAt: '15 minutes left',
      });
      expect(updateOrderPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Update order payment info successfully: ${JSON.stringify(mockOrderUpdateResult)}`,
      );
      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
      expect(mockHandleJobError).not.toHaveBeenCalled();
    });

    it('should handle payment retry successfully with Vietnamese language', async () => {
      const viJobData = {
        lang: 'vi' as SupportedLocalesType,
        payload: mockPaymentPayload,
      };

      const viJob: Job<{ lang: SupportedLocalesType; payload: PaymentCreationRequestDto }> = {
        ...mockPaymentRetryJob,
        data: viJobData,
      };

      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      mockGetRemainingTime.mockReturnValue('Còn lại 15 phút');

      const updateOrderPaymentInfoSpy = jest
        .spyOn(productService, 'updateOrderPaymentInfo')
        .mockResolvedValue(mockOrderUpdateResult);

      const loggerLogSpy = jest.spyOn(loggerService, 'log');

      await processor.handlePaymentRetry(viJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledWith(mockPaymentPayload);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(mockGetRemainingTime).toHaveBeenCalledWith(
        mockPaymentPayload.expiredAt,
        viJobData.lang,
        i18nService,
      );
      expect(updateOrderPaymentInfoSpy).toHaveBeenCalledWith({
        orderId: mockPaymentPayload.orderId,
        qrCodeUrl: mockPaymentData.data.checkoutUrl,
        expiredAt: 'Còn lại 15 phút',
      });
      expect(updateOrderPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle different order IDs correctly', async () => {
      const differentOrderPayload: PaymentCreationRequestDto = {
        ...mockPaymentPayload,
        orderId: 456,
        description: 'PAY FOR ORDER-456',
      };

      const differentOrderJobData = {
        lang: 'en' as SupportedLocalesType,
        payload: differentOrderPayload,
      };

      const differentOrderJob: Job<{
        lang: SupportedLocalesType;
        payload: PaymentCreationRequestDto;
      }> = {
        ...mockPaymentRetryJob,
        data: differentOrderJobData,
      };

      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      mockGetRemainingTime.mockReturnValue('15 minutes left');

      const updateOrderPaymentInfoSpy = jest
        .spyOn(productService, 'updateOrderPaymentInfo')
        .mockResolvedValue(mockOrderUpdateResult);

      await processor.handlePaymentRetry(differentOrderJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledWith(differentOrderPayload);
      expect(updateOrderPaymentInfoSpy).toHaveBeenCalledWith({
        orderId: differentOrderPayload.orderId,
        qrCodeUrl: mockPaymentData.data.checkoutUrl,
        expiredAt: '15 minutes left',
      });
    });

    it('should handle different amounts correctly', async () => {
      const differentAmountPayload: PaymentCreationRequestDto = {
        ...mockPaymentPayload,
        amount: 999.99,
      };

      const differentAmountJobData = {
        lang: 'en' as SupportedLocalesType,
        payload: differentAmountPayload,
      };

      const differentAmountJob: Job<{
        lang: SupportedLocalesType;
        payload: PaymentCreationRequestDto;
      }> = {
        ...mockPaymentRetryJob,
        data: differentAmountJobData,
      };

      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      mockGetRemainingTime.mockReturnValue('15 minutes left');

      jest.spyOn(productService, 'updateOrderPaymentInfo').mockResolvedValue(mockOrderUpdateResult);

      await processor.handlePaymentRetry(differentAmountJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledWith(differentAmountPayload);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle different QR code URLs correctly', async () => {
      const differentQrPaymentData: PayOSCreatePaymentResponseDto = {
        ...mockPaymentData,
        data: {
          ...mockPaymentData.data,
          checkoutUrl: 'https://checkout.payos.vn/web/different-url-xyz789',
        },
      };

      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockResolvedValue(differentQrPaymentData);

      mockGetRemainingTime.mockReturnValue('15 minutes left');

      const updateOrderPaymentInfoSpy = jest
        .spyOn(productService, 'updateOrderPaymentInfo')
        .mockResolvedValue(mockOrderUpdateResult);

      await processor.handlePaymentRetry(mockPaymentRetryJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(updateOrderPaymentInfoSpy).toHaveBeenCalledWith({
        orderId: mockPaymentPayload.orderId,
        qrCodeUrl: 'https://checkout.payos.vn/web/different-url-xyz789',
        expiredAt: '15 minutes left',
      });
    });

    it('should handle different expiration time formats correctly', async () => {
      const differentExpirationTimes = [
        '1 minute left',
        '30 minutes left',
        '1 hour left',
        'Expired Time',
        'Còn lại 5 phút',
        'Hết hạn',
      ];

      for (const expiredAt of differentExpirationTimes) {
        const createPaymentInfoSpy = jest
          .spyOn(productService, 'createPaymentInfo')
          .mockResolvedValue(mockPaymentData);

        mockGetRemainingTime.mockReturnValue(expiredAt);

        const updateOrderPaymentInfoSpy = jest
          .spyOn(productService, 'updateOrderPaymentInfo')
          .mockResolvedValue(mockOrderUpdateResult);

        await processor.handlePaymentRetry(mockPaymentRetryJob);

        expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
        expect(updateOrderPaymentInfoSpy).toHaveBeenCalledWith({
          orderId: mockPaymentPayload.orderId,
          qrCodeUrl: mockPaymentData.data.checkoutUrl,
          expiredAt,
        });

        jest.clearAllMocks();
      }
    });

    it('should handle createPaymentInfo error and call handleJobError', async () => {
      const paymentError = new TypedRpcException({
        code: HTTP_ERROR_CODE.TIME_OUT_OR_NETWORK,
        message: 'common.errors.timeOutOrNetwork',
      });

      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockRejectedValue(paymentError);

      await processor.handlePaymentRetry(mockPaymentRetryJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledWith(mockPaymentPayload);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(mockHandleJobError).toHaveBeenCalledWith(
        paymentError,
        mockPaymentRetryJob,
        loggerService,
        '[Error payment retry]',
      );
      expect(mockHandleJobError).toHaveBeenCalledTimes(1);
    });

    it('should handle updateOrderPaymentInfo error and call handleJobError', async () => {
      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      mockGetRemainingTime.mockReturnValue('15 minutes left');

      const updateError = new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      });

      const updateOrderPaymentInfoSpy = jest
        .spyOn(productService, 'updateOrderPaymentInfo')
        .mockRejectedValue(updateError);

      await processor.handlePaymentRetry(mockPaymentRetryJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(updateOrderPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(mockHandleJobError).toHaveBeenCalledWith(
        updateError,
        mockPaymentRetryJob,
        loggerService,
        '[Error payment retry]',
      );
      expect(mockHandleJobError).toHaveBeenCalledTimes(1);
    });

    it('should handle internal server error and call handleJobError', async () => {
      const internalError = new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });

      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockRejectedValue(internalError);

      await processor.handlePaymentRetry(mockPaymentRetryJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(mockHandleJobError).toHaveBeenCalledWith(
        internalError,
        mockPaymentRetryJob,
        loggerService,
        '[Error payment retry]',
      );
      expect(mockHandleJobError).toHaveBeenCalledTimes(1);
    });

    it('should handle validation error and call handleJobError', async () => {
      const validationError = new TypedRpcException({
        code: HTTP_ERROR_CODE.VALIDATION_ERROR,
        message: 'common.errors.validationError',
      });

      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockRejectedValue(validationError);

      await processor.handlePaymentRetry(mockPaymentRetryJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(mockHandleJobError).toHaveBeenCalledWith(
        validationError,
        mockPaymentRetryJob,
        loggerService,
        '[Error payment retry]',
      );
      expect(mockHandleJobError).toHaveBeenCalledTimes(1);
    });

    it('should handle network error and call handleJobError', async () => {
      const networkError = new Error('Network connection lost');

      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockRejectedValue(networkError);

      await processor.handlePaymentRetry(mockPaymentRetryJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(mockHandleJobError).toHaveBeenCalledWith(
        networkError,
        mockPaymentRetryJob,
        loggerService,
        '[Error payment retry]',
      );
      expect(mockHandleJobError).toHaveBeenCalledTimes(1);
    });

    it('should handle complex job data correctly', async () => {
      const complexPayload: PaymentCreationRequestDto = {
        amount: 1234.56,
        orderId: 99999,
        userId: 12345,
        description: 'Complex payment with special characters: áéíóú ñ @#$%^&*()',
        expiredAt: Math.floor(Date.now() / 1000) + 7200,
      };

      const complexJobData = {
        lang: 'vi' as SupportedLocalesType,
        payload: complexPayload,
      };

      const complexJob: Job<{ lang: SupportedLocalesType; payload: PaymentCreationRequestDto }> = {
        ...mockPaymentRetryJob,
        data: complexJobData,
      };

      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      mockGetRemainingTime.mockReturnValue('Còn lại 2 giờ');

      const updateOrderPaymentInfoSpy = jest
        .spyOn(productService, 'updateOrderPaymentInfo')
        .mockResolvedValue(mockOrderUpdateResult);

      const loggerLogSpy = jest.spyOn(loggerService, 'log');

      await processor.handlePaymentRetry(complexJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledWith(complexPayload);
      expect(mockGetRemainingTime).toHaveBeenCalledWith(
        complexPayload.expiredAt,
        complexJobData.lang,
        i18nService,
      );
      expect(updateOrderPaymentInfoSpy).toHaveBeenCalledWith({
        orderId: complexPayload.orderId,
        qrCodeUrl: mockPaymentData.data.checkoutUrl,
        expiredAt: 'Còn lại 2 giờ',
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Update order payment info successfully: ${JSON.stringify(mockOrderUpdateResult)}`,
      );
    });

    it('should handle undefined language gracefully', async () => {
      const undefinedLangJobData = {
        lang: undefined as unknown as SupportedLocalesType,
        payload: mockPaymentPayload,
      };

      const undefinedLangJob: Job<{
        lang: SupportedLocalesType;
        payload: PaymentCreationRequestDto;
      }> = {
        ...mockPaymentRetryJob,
        data: undefinedLangJobData,
      };

      const createPaymentInfoSpy = jest
        .spyOn(productService, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      mockGetRemainingTime.mockReturnValue('15 minutes left');

      jest.spyOn(productService, 'updateOrderPaymentInfo').mockResolvedValue(mockOrderUpdateResult);

      await processor.handlePaymentRetry(undefinedLangJob);

      expect(createPaymentInfoSpy).toHaveBeenCalledWith(mockPaymentPayload);
      expect(mockGetRemainingTime).toHaveBeenCalledWith(
        mockPaymentPayload.expiredAt,
        undefined,
        i18nService,
      );
    });
  });
});
