import { PRODUCT_SERVICE } from '@app/common';
import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { OrderRequest } from '@app/common/dto/product/requests/order-request';
import { ConfirmOrderRequest } from '@app/common/dto/product/requests/confirm-order.request';
import { RejectOrderRequest } from '@app/common/dto/product/requests/reject-order.request';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../src/order/order.service';

// Mock the callMicroservice helper
jest.mock('@app/common/helpers/microservices', () => ({
  callMicroservice: jest.fn(),
}));

// Mock firstValueFrom from rxjs
const mockFirstValueFrom = jest.fn();
jest.mock('rxjs', () => {
  const originalRxjs = jest.requireActual<typeof import('rxjs')>('rxjs');
  return {
    ...originalRxjs,
    firstValueFrom: jest.fn(),
  };
});

import {
  OrderResponse,
  PaymentInfoResponse,
} from '@app/common/dto/product/response/order-response';
import { RejectOrderResponse } from '@app/common/dto/product/response/reject-order.response';
import { REJECT_ORDER_STATUS } from '@app/common/enums/order.enum';
import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import { callMicroservice } from '@app/common/helpers/microservices';
import { PaymentStatus } from 'apps/product-service/generated/prisma';
import { firstValueFrom, Observable } from 'rxjs';
import { CacheService } from '@app/common/cache/cache.service';

describe('OrderService', () => {
  let service: OrderService;
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
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getOrSet: jest.fn(),
  } as unknown as CacheService;
  const mockCallMicroservice = callMicroservice as jest.MockedFunction<typeof callMicroservice>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PRODUCT_SERVICE,
          useValue: mockProductClient,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = moduleRef.get<OrderService>(OrderService);
    productClient = moduleRef.get<ClientProxy>(PRODUCT_SERVICE);
    loggerService = moduleRef.get<CustomLogger>(CustomLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('createOrder', () => {
    const mockOrderRequest: OrderRequest = {
      userId: 1,
      deliveryAddress: '123 Test Street, Test City',
      paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
      items: [
        {
          productVariantId: 1,
          quantity: 2,
        },
        {
          productVariantId: 2,
          quantity: 1,
        },
      ],
      lang: 'en',
    };

    const mockPaymentInfo: PaymentInfoResponse = {
      qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
      expiredAt: '15 minutes remaining',
    };

    const mockOrderResponse: OrderResponse = {
      id: 1,
      userId: 1,
      deliveryAddress: '123 Test Street, Test City',
      paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
      paymentStatus: PaymentStatus.PENDING,
      status: 'PENDING',
      totalPrice: 67.48,
      items: [
        {
          id: 1,
          productVariantId: 1,
          quantity: 2,
          price: 25.99,
          note: 'abc',
          productName: 'Pizza hawa',
          productSize: 'S',
        },
        {
          id: 2,
          productVariantId: 2,
          quantity: 1,
          price: 15.5,
          note: 'abc',
          productName: 'Pizza ga',
          productSize: 'S',
        },
      ],
      paymentInfo: mockPaymentInfo,
      note: 'abc',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    };
    const mockSuccessResponse: BaseResponse<OrderResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockOrderResponse,
    };

    it('should create order successfully with valid request', async () => {
      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);

      const result = await service.createOrder(mockOrderRequest);

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        mockOrderRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        productClient.send(ProductPattern.CREATE_ORDER, mockOrderRequest),
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
      expect(result.data).toEqual(mockOrderResponse);
    });

    it('should create order successfully with CASH payment method', async () => {
      const cashOrderRequest: OrderRequest = {
        ...mockOrderRequest,
        paymentMethod: PaymentMethodEnum.CASH,
      };

      const cashOrderResponse: OrderResponse = {
        ...mockOrderResponse,
        paymentMethod: PaymentMethodEnum.CASH,
        paymentStatus: PaymentStatus.UNPAID,
        paymentInfo: undefined,
      };

      const cashSuccessResponse: BaseResponse<OrderResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: cashOrderResponse,
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockResolvedValue(cashSuccessResponse);

      const result = await service.createOrder(cashOrderRequest);

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        cashOrderRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(cashSuccessResponse);
      expect(result.data!.paymentMethod).toBe(PaymentMethodEnum.CASH);
      expect(result.data!.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect(result.data!.paymentInfo).toBeUndefined();
    });

    it('should create order successfully with Vietnamese language', async () => {
      const viOrderRequest: OrderRequest = {
        ...mockOrderRequest,
        lang: 'vi',
      };

      const viOrderResponse: OrderResponse = {
        ...mockOrderResponse,
        paymentInfo: {
          qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
          expiredAt: 'Còn lại 15 phút',
        },
      };

      const viSuccessResponse: BaseResponse<OrderResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: viOrderResponse,
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockResolvedValue(viSuccessResponse);

      const result = await service.createOrder(viOrderRequest);

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        viOrderRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(viSuccessResponse);
      expect(result.data!.paymentInfo!.expiredAt).toBe('Còn lại 15 phút');
    });

    it('should handle different user IDs correctly', async () => {
      const differentUserRequest: OrderRequest = {
        ...mockOrderRequest,
        userId: 999,
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);

      const result = await service.createOrder(differentUserRequest);

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        differentUserRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle single item order', async () => {
      const singleItemRequest: OrderRequest = {
        userId: 1,
        deliveryAddress: '456 Single Street',
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        items: [
          {
            productVariantId: 1,
            quantity: 1,
          },
        ],
        lang: 'en',
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);

      const result = await service.createOrder(singleItemRequest);

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        singleItemRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle multiple items order', async () => {
      const multipleItemsRequest: OrderRequest = {
        userId: 1,
        deliveryAddress: '789 Multiple Street',
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        items: [
          { productVariantId: 1, quantity: 2 },
          { productVariantId: 2, quantity: 1 },
          { productVariantId: 3, quantity: 3 },
          { productVariantId: 4, quantity: 1 },
        ],
        lang: 'en',
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);

      const result = await service.createOrder(multipleItemsRequest);

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        multipleItemsRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle large order amounts', async () => {
      const largeAmountRequest: OrderRequest = {
        userId: 1,
        deliveryAddress: '999 Large Amount Street',
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        items: [
          {
            productVariantId: 1,
            quantity: 100,
          },
        ],
        lang: 'en',
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);

      const result = await service.createOrder(largeAmountRequest);

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        largeAmountRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should throw TypedRpcException when userId is undefined', async () => {
      const invalidRequest: OrderRequest = {
        userId: undefined as unknown as number,
        deliveryAddress: '123 Test Street',
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        items: [{ productVariantId: 1, quantity: 1 }],
        lang: 'en',
      };

      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };

      try {
        await service.createOrder(invalidRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should throw TypedRpcException when userId is null', async () => {
      const invalidRequest: OrderRequest = {
        userId: null as unknown as number,
        deliveryAddress: '123 Test Street',
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        items: [{ productVariantId: 1, quantity: 1 }],
        lang: 'en',
      };

      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };

      try {
        await service.createOrder(invalidRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should throw TypedRpcException when userId is 0', async () => {
      const invalidRequest: OrderRequest = {
        userId: 0,
        deliveryAddress: '123 Test Street',
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        items: [{ productVariantId: 1, quantity: 1 }],
        lang: 'en',
      };

      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };

      try {
        await service.createOrder(invalidRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should handle undefined language gracefully', async () => {
      const requestWithUndefinedLang: OrderRequest = {
        ...mockOrderRequest,
        lang: undefined as unknown as SupportedLocalesType,
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);

      const result = await service.createOrder(requestWithUndefinedLang);

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        requestWithUndefinedLang,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
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
        const responseWithDifferentUrl: BaseResponse<OrderResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            ...mockOrderResponse,
            paymentInfo: {
              qrCodeUrl: qrUrl,
              expiredAt: '15 minutes remaining',
            },
          },
        };

        const productClientSendSpy = jest.spyOn(productClient, 'send');
        mockCallMicroservice.mockResolvedValue(responseWithDifferentUrl);

        const result = await service.createOrder(mockOrderRequest);

        expect(productClientSendSpy).toHaveBeenCalledWith(
          ProductPattern.CREATE_ORDER,
          mockOrderRequest,
        );
        expect(result.data!.paymentInfo!.qrCodeUrl).toBe(qrUrl);
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
        const responseWithDifferentExpiration: BaseResponse<OrderResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            ...mockOrderResponse,
            paymentInfo: {
              qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
              expiredAt,
            },
          },
        };

        const productClientSendSpy = jest.spyOn(productClient, 'send');
        mockCallMicroservice.mockResolvedValue(responseWithDifferentExpiration);

        const result = await service.createOrder(mockOrderRequest);

        expect(productClientSendSpy).toHaveBeenCalledWith(
          ProductPattern.CREATE_ORDER,
          mockOrderRequest,
        );
        expect(result.data!.paymentInfo!.expiredAt).toBe(expiredAt);
      }
    });

    it('should propagate microservice down error', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.serviceUnavailable',
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await service.createOrder(mockOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        mockOrderRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
    });

    it('should propagate ValidationException from microservice', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.VALIDATION_ERROR,
        message: 'common.errors.validationError',
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await service.createOrder(mockOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        mockOrderRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
    });

    it('should propagate BadRequestException from microservice', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.product.productOutOfStock',
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await service.createOrder(mockOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        mockOrderRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
    });

    it('should propagate InternalServerError from microservice', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await service.createOrder(mockOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        mockOrderRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout errors from microservice', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.TIME_OUT_OR_NETWORK,
        message: 'common.errors.timeOutOrNetwork',
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await service.createOrder(mockOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        mockOrderRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle complex order request correctly', async () => {
      const complexRequest: OrderRequest = {
        userId: 12345,
        deliveryAddress: 'Complex delivery address with special characters: áéíóú ñ @#$%^&*()',
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        items: [
          { productVariantId: 1, quantity: 5 },
          { productVariantId: 2, quantity: 3 },
          { productVariantId: 3, quantity: 1 },
        ],
        lang: 'vi',
      };

      const complexResponse: BaseResponse<OrderResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockOrderResponse,
          userId: 12345,
          deliveryAddress: 'Complex delivery address with special characters: áéíóú ñ @#$%^&*()',
          totalPrice: 1248.42,
          paymentInfo: {
            qrCodeUrl: 'https://checkout.payos.vn/web/complex-payment-id-12345',
            expiredAt: 'Còn lại 25 phút',
          },
        },
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockResolvedValue(complexResponse);

      const result = await service.createOrder(complexRequest);

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        complexRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(complexResponse);
      expect(result.data!.userId).toBe(12345);
      expect(result.data!.totalPrice).toBe(1248.42);
      expect(result.data!.paymentInfo!.expiredAt).toBe('Còn lại 25 phút');
    });

    it('should handle edge case with empty string language', async () => {
      const emptyLangRequest: OrderRequest = {
        ...mockOrderRequest,
        lang: '' as unknown as SupportedLocalesType,
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);

      const result = await service.createOrder(emptyLangRequest);

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CREATE_ORDER,
        emptyLangRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });
  });

  describe('rejectOrder', () => {
    const mockRejectOrderRequest: RejectOrderRequest = {
      userId: 1,
      orderId: 123,
    };

    const mockRejectOrderResponse: RejectOrderResponse = {
      status: REJECT_ORDER_STATUS.SUCCESS,
      orderId: 123,
      paymentMethod: PaymentMethodEnum.CASH,
      rejectedAt: new Date('2024-01-01T00:00:00Z'),
    };

    const mockSuccessResponse: BaseResponse<RejectOrderResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockRejectOrderResponse,
    };

    it('should reject order successfully with valid request', async () => {
      const productClientSendSpy = jest.spyOn(productClient, 'send');
      const mockObservable = { subscribe: jest.fn() } as unknown as Observable<unknown>;
      productClientSendSpy.mockReturnValue(mockObservable);
      (firstValueFrom as jest.Mock).mockResolvedValue(mockSuccessResponse);
      const result = await service.rejectOrder(mockRejectOrderRequest);
      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.REJECT_ORDER,
        mockRejectOrderRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data!.status).toBe(REJECT_ORDER_STATUS.SUCCESS);
      expect(result.data!.orderId).toBe(123);
    });

    it('should throw TypedRpcException when userId is undefined', async () => {
      const invalidRequest: RejectOrderRequest = {
        userId: undefined as unknown as number,
        orderId: 123,
      };

      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };

      try {
        await service.rejectOrder(invalidRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should propagate UnauthorizedException from microservice', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      const mockObservable = { subscribe: jest.fn() } as unknown as Observable<unknown>;
      productClientSendSpy.mockReturnValue(mockObservable);

      mockFirstValueFrom.mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await service.rejectOrder(mockRejectOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.REJECT_ORDER,
        mockRejectOrderRequest,
      );
    });

    it('should propagate NotFound exception when order not found', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      const mockObservable = { subscribe: jest.fn() } as unknown as Observable<unknown>;
      productClientSendSpy.mockReturnValue(mockObservable);

      mockFirstValueFrom.mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await service.rejectOrder(mockRejectOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.REJECT_ORDER,
        mockRejectOrderRequest,
      );
    });

    it('should propagate InternalServerError from microservice', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };

      const productClientSendSpy = jest.spyOn(productClient, 'send');
      const mockObservable = { subscribe: jest.fn() } as unknown as Observable<unknown>;
      productClientSendSpy.mockReturnValue(mockObservable);

      mockFirstValueFrom.mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await service.rejectOrder(mockRejectOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.REJECT_ORDER,
        mockRejectOrderRequest,
      );
    });
  });

  describe('confirmOrder', () => {
    const mockConfirmOrderRequest: ConfirmOrderRequest = {
      userId: 1,
      orderId: 123,
    };

    const mockConfirmOrderResponse: OrderResponse = {
      id: 123,
      userId: 1,
      status: PaymentStatus.PAID,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      deliveryAddress: '123 Test Street',
      note: 'Test order',
      paymentMethod: PaymentMethodEnum.CASH,
      paymentStatus: PaymentStatus.PAID,
      paymentInfo: {
        status: PaymentStatus.PAID,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        qrCodeUrl: 'https://example.com/qr',
        expiredAt: '2024-01-02T00:00:00Z',
      } as PaymentInfoResponse,
    } as OrderResponse;

    const mockSuccessResponse: BaseResponse<OrderResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockConfirmOrderResponse,
    };

    it('should confirm order successfully with valid request', async () => {
      const productClientSendSpy = jest.spyOn(productClient, 'send');
      const mockObservable = { subscribe: jest.fn() } as unknown as Observable<unknown>;
      productClientSendSpy.mockReturnValue(mockObservable);
      mockCallMicroservice.mockResolvedValue(mockSuccessResponse);
      const result = await service.confirmOrder(mockConfirmOrderRequest);
      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CONFIRM_ORDER,
        mockConfirmOrderRequest,
      );
      expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data!.id).toBe(123);
      expect(result.data!.status).toBe(PaymentStatus.PAID);
    });

    it('should throw TypedRpcException when userId is undefined', async () => {
      const invalidRequest: ConfirmOrderRequest = {
        userId: undefined as unknown as number,
        orderId: 123,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };
      try {
        await service.confirmOrder(invalidRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should throw TypedRpcException when userId is null', async () => {
      const invalidRequest: ConfirmOrderRequest = {
        userId: null as unknown as number,
        orderId: 123,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };
      try {
        await service.confirmOrder(invalidRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should propagate Unauthorized Exception from microservice', async () => {
      const productClientSendSpy = jest.spyOn(productClient, 'send');
      const mockObservable = { subscribe: jest.fn() } as unknown as Observable<unknown>;
      productClientSendSpy.mockReturnValue(mockObservable);
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'Order not found or access denied',
      };
      mockCallMicroservice.mockResolvedValue(new TypedRpcException(rpcError));

      try {
        await service.confirmOrder(mockConfirmOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CONFIRM_ORDER,
        mockConfirmOrderRequest,
      );
    });

    it('should propagate NotFound exception from microservice', async () => {
      const productClientSendSpy = jest.spyOn(productClient, 'send');
      const mockObservable = { subscribe: jest.fn() } as unknown as Observable<unknown>;
      productClientSendSpy.mockReturnValue(mockObservable);
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };
      mockCallMicroservice.mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await service.confirmOrder(mockConfirmOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CONFIRM_ORDER,
        mockConfirmOrderRequest,
      );
    });

    it('should propagate InternalServerError from microservice', async () => {
      const productClientSendSpy = jest.spyOn(productClient, 'send');
      const mockObservable = { subscribe: jest.fn() } as unknown as Observable<unknown>;
      productClientSendSpy.mockReturnValue(mockObservable);
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      mockCallMicroservice.mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await service.confirmOrder(mockConfirmOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(productClientSendSpy).toHaveBeenCalledWith(
        ProductPattern.CONFIRM_ORDER,
        mockConfirmOrderRequest,
      );
    });
  });
});
