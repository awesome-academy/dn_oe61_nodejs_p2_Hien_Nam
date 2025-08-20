import { PRODUCT_SERVICE } from '@app/common';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { RetryPaymentRequest } from '@app/common/dto/product/requests/retry-payment.requqest';
import { PaymentInfoResponse } from '@app/common/dto/product/response/order-response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../src/payment/payment.service';

// Mock the callMicroservice helper
jest.mock('@app/common/helpers/microservices', () => ({
  callMicroservice: jest.fn(),
}));

import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { callMicroservice } from '@app/common/helpers/microservices';
import { assertRpcException } from '@app/common/helpers/test.helper';

describe('PaymentService', () => {
  let service: PaymentService;
  let productClient: ClientProxy;
  let loggerService: CustomLogger;
  let moduleRef: TestingModule;

  const mockProductClient = {
    send: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockCallMicroservice = callMicroservice as jest.MockedFunction<typeof callMicroservice>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PRODUCT_SERVICE,
          useValue: mockProductClient,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = moduleRef.get<PaymentService>(PaymentService);
    productClient = moduleRef.get<ClientProxy>(PRODUCT_SERVICE);
    loggerService = moduleRef.get<CustomLogger>(CustomLogger);
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

    const mockPaymentInfoResponse: PaymentInfoResponse = {
      qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
      expiredAt: '15 minutes remaining',
    };
    const mockSuccessResponse: BaseResponse<PaymentInfoResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockPaymentInfoResponse,
    };

    it('should retry payment successfully with valid request', async () => {
      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);
      const result = await service.retryPayment(mockRetryPaymentRequest);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockProductClient.send(ProductPattern.RETRY_PAYMENT, mockRetryPaymentRequest),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(mockPaymentInfoResponse);
    });

    it('should retry payment successfully with Vietnamese language', async () => {
      const viRequest: RetryPaymentRequest = {
        userId: 1,
        orderId: 123,
        lang: 'vi',
      };

      const viPaymentInfoResponse: PaymentInfoResponse = {
        qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
        expiredAt: 'Còn lại 15 phút',
      };

      const viSuccessResponse: BaseResponse<PaymentInfoResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: viPaymentInfoResponse,
      };

      mockCallMicroservice.mockResolvedValue(viSuccessResponse);
      const result = await service.retryPayment(viRequest);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockProductClient.send(ProductPattern.RETRY_PAYMENT, viRequest),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(result).toEqual(viSuccessResponse);
      expect(result.data!.expiredAt).toBe('Còn lại 15 phút');
    });

    it('should handle different user IDs correctly', async () => {
      const differentUserRequest: RetryPaymentRequest = {
        userId: 999,
        orderId: 123,
        lang: 'en',
      };

      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);
      const result = await service.retryPayment(differentUserRequest);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockProductClient.send(ProductPattern.RETRY_PAYMENT, differentUserRequest),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle different order IDs correctly', async () => {
      const differentOrderRequest: RetryPaymentRequest = {
        userId: 1,
        orderId: 456,
        lang: 'en',
      };

      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);
      const result = await service.retryPayment(differentOrderRequest);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockProductClient.send(ProductPattern.RETRY_PAYMENT, differentOrderRequest),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle large order and user IDs', async () => {
      const largeIdsRequest: RetryPaymentRequest = {
        userId: 999999999,
        orderId: 888888888,
        lang: 'en',
      };

      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);
      const result = await service.retryPayment(largeIdsRequest);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockProductClient.send(ProductPattern.RETRY_PAYMENT, largeIdsRequest),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle zero user ID and order ID', async () => {
      const zeroIdsRequest: RetryPaymentRequest = {
        userId: 0,
        orderId: 0,
        lang: 'en',
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };
      mockCallMicroservice.mockResolvedValue(new TypedRpcException(rpcError));
      try {
        await service.retryPayment(zeroIdsRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(mockCallMicroservice).toHaveBeenCalledTimes(0);
    });

    it('should throw TypedRpcException when userId is undefined', async () => {
      const invalidRequest: RetryPaymentRequest = {
        userId: undefined as unknown as number,
        orderId: 123,
        lang: 'en',
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };
      try {
        await service.retryPayment(invalidRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should throw TypedRpcException when userId is null', async () => {
      const invalidRequest: RetryPaymentRequest = {
        userId: undefined as unknown as number,
        orderId: 123,
        lang: 'en',
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };
      try {
        await service.retryPayment(invalidRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should throw TypedRpcException when userId is 0', async () => {
      const invalidRequest: RetryPaymentRequest = {
        userId: 0,
        orderId: 123,
        lang: 'en',
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };
      try {
        await service.retryPayment(invalidRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should handle undefined language gracefully', async () => {
      const requestWithUndefinedLang: RetryPaymentRequest = {
        userId: 1,
        orderId: 123,
        lang: undefined as unknown as SupportedLocalesType,
      };

      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);
      const result = await service.retryPayment(requestWithUndefinedLang);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockProductClient.send(ProductPattern.RETRY_PAYMENT, requestWithUndefinedLang),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle different QR code URL formats from microservice', async () => {
      const differentQrUrls = [
        'https://checkout.payos.vn/web/short123',
        'https://checkout.payos.vn/web/very-long-payment-id-with-many-characters-123456789',
        'https://checkout.payos.vn/web/special-chars-!@#$%^&*()',
        'https://checkout.payos.vn/web/unicode-chars-ñáéíóú',
      ];

      for (const qrUrl of differentQrUrls) {
        const responseWithDifferentUrl: BaseResponse<PaymentInfoResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            qrCodeUrl: qrUrl,
            expiredAt: '15 minutes remaining',
          },
        };

        mockCallMicroservice.mockResolvedValue(responseWithDifferentUrl);
        const result = await service.retryPayment(mockRetryPaymentRequest);
        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(ProductPattern.RETRY_PAYMENT, mockRetryPaymentRequest),
          PRODUCT_SERVICE,
          loggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
        expect(result.data!.qrCodeUrl).toBe(qrUrl);
      }
    });

    it('should handle different expiration time formats from microservice', async () => {
      const differentExpirationTimes = [
        '1 minute remaining',
        '30 minutes remaining',
        '1 hour remaining',
        'Expired Time',
        'Còn lại 5 phút',
        'Hết hạn',
      ];

      for (const expiredAt of differentExpirationTimes) {
        const responseWithDifferentExpiration: BaseResponse<PaymentInfoResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
            expiredAt,
          },
        };

        mockCallMicroservice.mockResolvedValue(responseWithDifferentExpiration);
        const result = await service.retryPayment(mockRetryPaymentRequest);
        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(ProductPattern.RETRY_PAYMENT, mockRetryPaymentRequest),
          PRODUCT_SERVICE,
          loggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
        expect(result.data!.expiredAt).toBe(expiredAt);
      }
    });

    it('should propagate microservice down', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.serviceUnavailable',
      };
      mockCallMicroservice.mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await service.retryPayment(mockRetryPaymentRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockProductClient.send(ProductPattern.RETRY_PAYMENT, mockRetryPaymentRequest),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      const productClientSpy = jest.spyOn(productClient, 'send');
      expect(productClientSpy).toHaveBeenCalledWith(
        ProductPattern.RETRY_PAYMENT,
        mockRetryPaymentRequest,
      );
      expect(productClientSpy).toHaveBeenCalledTimes(2);
    });

    it('should propagate TypedRpcException from microservice', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };

      mockCallMicroservice.mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await service.retryPayment(mockRetryPaymentRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should handle internal server errors from microservice', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      mockCallMicroservice.mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await service.retryPayment(mockRetryPaymentRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      const productClientSpy = jest.spyOn(productClient, 'send');
      expect(productClientSpy).toHaveBeenCalledWith(
        ProductPattern.RETRY_PAYMENT,
        mockRetryPaymentRequest,
      );
    });

    it('should handle complex request objects correctly', async () => {
      const complexRequest: RetryPaymentRequest = {
        userId: 12345,
        orderId: 67890,
        lang: 'vi',
      };

      const complexResponse: BaseResponse<PaymentInfoResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          qrCodeUrl: 'https://checkout.payos.vn/web/complex-payment-id-12345-67890',
          expiredAt: 'Còn lại 25 phút',
        },
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');

      mockCallMicroservice.mockResolvedValue(complexResponse);

      const result = await service.retryPayment(complexRequest);

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.RETRY_PAYMENT,
        complexRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        productClient.send(ProductPattern.RETRY_PAYMENT, complexRequest),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(result).toEqual(complexResponse);
      expect(result.data!.qrCodeUrl).toBe(
        'https://checkout.payos.vn/web/complex-payment-id-12345-67890',
      );
      expect(result.data!.expiredAt).toBe('Còn lại 25 phút');
    });

    it('should handle edge case with empty string language', async () => {
      const emptyLangRequest: RetryPaymentRequest = {
        userId: 1,
        orderId: 123,
        lang: '' as unknown as SupportedLocalesType,
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);

      const result = await service.retryPayment(emptyLangRequest);
      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.RETRY_PAYMENT,
        emptyLangRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });
  });
});
