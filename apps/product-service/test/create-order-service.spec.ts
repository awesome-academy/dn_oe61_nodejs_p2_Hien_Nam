import { NOTIFICATION_SERVICE } from '@app/common';
import { OrderRequest } from '@app/common/dto/product/requests/order-request';
import { OrderResponse } from '@app/common/dto/product/response/order-response';
import { PayOSCreatePaymentResponseDto } from '@app/common/dto/product/response/payos-creation.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { assertRpcException } from '@app/common/helpers/test.helper';
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

describe('ProductService - createOrder', () => {
  let service: ProductService;
  let loggerService: CustomLogger;
  let configService: ConfigService;
  let notificationClient: ClientProxy;
  let i18nService: I18nService;
  let productProducer: ProductProducer;
  let moduleRef: TestingModule;

  const mockPrismaService = {
    client: {
      productVariant: {
        findMany: jest.fn(),
      },
      product: {
        updateMany: jest.fn(),
      },
      order: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
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
  } as unknown as CacheService;
  interface MockPrismaTransaction {
    product: { updateMany: jest.Mock };
    order: { create: jest.Mock };
  }
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

  describe('createOrder', () => {
    const mockOrderRequest: OrderRequest = {
      userId: 1,
      deliveryAddress: '123 Test Street, Test City',
      paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
      items: [
        {
          productVariantId: 1,
          quantity: 2,
          note: 'Extra spicy',
        },
        {
          productVariantId: 2,
          quantity: 1,
        },
      ],
      lang: 'en',
      note: 'Please deliver quickly',
    };

    const mockProductVariants = [
      {
        id: 1,
        productId: 101,
        price: 25.99,
        product: { quantity: 10 },
      },
      {
        id: 2,
        productId: 102,
        price: 15.5,
        product: { quantity: 5 },
      },
    ];
    const cashCreatedOrder = {
      id: 1,
      userId: 1,
      deliveryAddress: '123 Test Street, Test City',
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
      amount: 67.48,
      note: 'Please deliver quickly',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      items: [
        {
          id: 1,
          productVariantId: 1,
          quantity: 2,
          amount: 51.98,
          note: 'Extra spicy',
          productVariant: {
            id: 1,
            size: 'S',
            product: {
              name: 'Pizza Hawaii',
            },
          },
        },
        {
          id: 2,
          productVariantId: 2,
          quantity: 1,
          amount: 15.5,
          note: null,
          productVariant: {
            id: 2,
            size: 'M',
            product: {
              name: 'Pizza Chicken',
            },
          },
        },
      ],
    };

    const mockCreatedOrder = {
      id: 1,
      userId: 1,
      deliveryAddress: '123 Test Street, Test City',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.PENDING,
      amount: 67.48,
      note: 'Please deliver quickly',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      items: [
        {
          id: 1,
          productVariantId: 1,
          quantity: 2,
          amount: 51.98,
          note: 'Extra spicy',
          productVariant: {
            id: 1,
            size: 'S',
            product: {
              name: 'Pizza Hawaii',
            },
          },
        },
        {
          id: 2,
          productVariantId: 2,
          quantity: 1,
          amount: 15.5,
          note: null,
          productVariant: {
            id: 2,
            size: 'M',
            product: {
              name: 'Pizza Chicken',
            },
          },
        },
      ],
    };
    const mockPaymentData: PayOSCreatePaymentResponseDto = {
      data: {
        checkoutUrl: 'https://checkout.payos.vn/web/abc123',
        qrCode: '123',
        orderCode: 123,
        orderId: 1,
        amount: 20000,
        description: 'Payment Order',
      },
      desc: 'Payment created successfully',
    };
    it('should create order successfully with BANK_TRANSFER payment method', async () => {
      const prismaFindManySpy = jest
        .spyOn(mockPrismaService.client.productVariant, 'findMany')
        .mockResolvedValue(mockProductVariants);

      const prismaTransactionSpy = jest
        .spyOn(mockPrismaService.client, '$transaction')
        .mockImplementation(
          async <T>(callback: (tx: MockPrismaTransaction) => Promise<T>): Promise<T> => {
            return callback({
              product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
              order: { create: jest.fn().mockResolvedValue(mockCreatedOrder) },
            });
          },
        );
      const configGetSpy = jest.spyOn(configService, 'get').mockReturnValue('1h');
      const createPaymentInfoSpy = jest
        .spyOn(service, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);
      jest.spyOn(i18nService, 'translate').mockReturnValue('15 minutes left');
      const result = await service.createOrder(mockOrderRequest);
      expect(prismaFindManySpy).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        include: { product: { select: { quantity: true } } },
      });
      expect(prismaTransactionSpy).toHaveBeenCalledTimes(1);
      expect(configGetSpy).toHaveBeenCalledWith('payOS.expireTime', '1h');
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data!.paymentInfo).toBeDefined();
      expect(result.data!.paymentInfo!.qrCodeUrl).toBe('https://checkout.payos.vn/web/abc123');
    });

    it('should create order successfully with CASH payment method', async () => {
      const cashOrderRequest: OrderRequest = {
        ...mockOrderRequest,
        paymentMethod: PaymentMethodEnum.CASH,
      };

      const cashCreatedOrder = {
        ...mockCreatedOrder,
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.UNPAID,
      };

      const prismaFindManySpy = jest
        .spyOn(mockPrismaService.client.productVariant, 'findMany')
        .mockResolvedValue(mockProductVariants);

      const prismaTransactionSpy = jest
        .spyOn(mockPrismaService.client, '$transaction')
        .mockImplementation(
          async <T>(callback: (tx: MockPrismaTransaction) => Promise<T>): Promise<T> => {
            return callback({
              product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
              order: { create: jest.fn().mockResolvedValue(cashCreatedOrder) },
            });
          },
        );
      const notificationEmitSpy = jest.spyOn(notificationClient, 'emit');
      const toOrderResponseSpy = jest.spyOn(service, 'toOrderResponse').mockReturnValue({
        id: 1,
        paymentMethod: PaymentMethodEnum.CASH,
        paymentStatus: PaymentStatus.UNPAID,
      } as OrderResponse);

      const result = await service.createOrder(cashOrderRequest);

      expect(prismaFindManySpy).toHaveBeenCalledTimes(1);
      expect(prismaTransactionSpy).toHaveBeenCalledTimes(1);
      expect(notificationEmitSpy).toHaveBeenCalledTimes(1);
      expect(toOrderResponseSpy).toHaveBeenCalledWith(cashCreatedOrder);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data!.paymentInfo).toBeUndefined();
    });

    it('should throw TypedRpcException when userId is undefined', async () => {
      const invalidRequest: OrderRequest = {
        ...mockOrderRequest,
        userId: undefined as unknown as number,
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
        ...mockOrderRequest,
        userId: null as unknown as number,
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
        ...mockOrderRequest,
        userId: 0,
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

    it('should throw TypedRpcException when items array is empty', async () => {
      const invalidRequest: OrderRequest = {
        ...mockOrderRequest,
        items: [],
      };

      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.order.itemsMustAtLeast1',
      };

      try {
        await service.createOrder(invalidRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should throw TypedRpcException when some product variants do not exist', async () => {
      const prismaFindManySpy = jest
        .spyOn(mockPrismaService.client.productVariant, 'findMany')
        .mockResolvedValue([mockProductVariants[0]]); // Only return first variant

      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.product.someProductNotExist',
        args: {
          missingIds: '2',
        },
      };

      try {
        await service.createOrder(mockOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(prismaFindManySpy).toHaveBeenCalledTimes(1);
    });

    it('should throw TypedRpcException when products are out of stock', async () => {
      const outOfStockVariants = [
        { ...mockProductVariants[0], product: { quantity: 1 } }, // Less than requested quantity (2)
        mockProductVariants[1],
      ];

      const prismaFindManySpy = jest
        .spyOn(mockPrismaService.client.productVariant, 'findMany')
        .mockResolvedValue(outOfStockVariants);

      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.product.multipleOutOfStock',
        args: {
          productIds: [1],
        },
      };

      try {
        await service.createOrder(mockOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(prismaFindManySpy).toHaveBeenCalledTimes(1);
    });

    it('should handle payment creation failure with timeout error', async () => {
      const prismaFindManySpy = jest
        .spyOn(mockPrismaService.client.productVariant, 'findMany')
        .mockResolvedValue(mockProductVariants);

      const prismaTransactionSpy = jest
        .spyOn(mockPrismaService.client, '$transaction')
        .mockImplementation(
          async <T>(callback: (tx: MockPrismaTransaction) => Promise<T>): Promise<T> => {
            return callback({
              product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
              order: { create: jest.fn().mockResolvedValue(mockCreatedOrder) },
            });
          },
        );

      const configGetSpy = jest.spyOn(configService, 'get').mockReturnValue('1h');

      const timeoutError = new TypedRpcException({
        code: HTTP_ERROR_CODE.TIME_OUT_OR_NETWORK,
        message: 'common.errors.timeOutOrNetwork',
      });

      const createPaymentInfoSpy = jest
        .spyOn(service, 'createPaymentInfo')
        .mockRejectedValue(timeoutError);

      const loggerErrorSpy = jest.spyOn(loggerService, 'error');
      const addJobRetryPaymentSpy = jest.spyOn(productProducer, 'addJobRetryPayment');

      jest.spyOn(service, 'toOrderResponse').mockReturnValue({} as OrderResponse);

      const result = await service.createOrder(mockOrderRequest);

      expect(prismaFindManySpy).toHaveBeenCalledTimes(1);
      expect(prismaTransactionSpy).toHaveBeenCalledTimes(1);
      expect(configGetSpy).toHaveBeenCalledTimes(1);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledTimes(2);
      expect(addJobRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should handle product update failure during transaction', async () => {
      const prismaFindManySpy = jest
        .spyOn(mockPrismaService.client.productVariant, 'findMany')
        .mockResolvedValue(mockProductVariants);

      const prismaTransactionSpy = jest
        .spyOn(mockPrismaService.client, '$transaction')
        .mockImplementation(
          async <T>(callback: (tx: MockPrismaTransaction) => Promise<T>): Promise<T> => {
            return callback({
              product: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
              order: { create: jest.fn() },
            });
          },
        );

      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.product.productOutStock',
        args: {
          productId: 101,
        },
      };

      try {
        await service.createOrder(mockOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(prismaFindManySpy).toHaveBeenCalledTimes(1);
      expect(prismaTransactionSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle Vietnamese language correctly', async () => {
      const viOrderRequest: OrderRequest = {
        ...mockOrderRequest,
        lang: 'vi',
      };

      const prismaFindManySpy = jest
        .spyOn(mockPrismaService.client.productVariant, 'findMany')
        .mockResolvedValue(mockProductVariants);

      const prismaTransactionSpy = jest
        .spyOn(mockPrismaService.client, '$transaction')
        .mockImplementation(
          async <T>(callback: (tx: MockPrismaTransaction) => Promise<T>): Promise<T> => {
            return callback({
              product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
              order: { create: jest.fn().mockResolvedValue(mockCreatedOrder) },
            });
          },
        );

      const configGetSpy = jest.spyOn(configService, 'get').mockReturnValue('1h');

      const createPaymentInfoSpy = jest
        .spyOn(service, 'createPaymentInfo')
        .mockResolvedValue(mockPaymentData);

      const i18nTranslateSpy = jest
        .spyOn(i18nService, 'translate')
        .mockReturnValue('Còn lại 15 phút');

      const toOrderResponseSpy = jest
        .spyOn(service, 'toOrderResponse')
        .mockReturnValue({} as OrderResponse);

      const result = await service.createOrder(viOrderRequest);

      expect(prismaFindManySpy).toHaveBeenCalledTimes(1);
      expect(prismaTransactionSpy).toHaveBeenCalledTimes(1);
      expect(configGetSpy).toHaveBeenCalledTimes(1);
      expect(createPaymentInfoSpy).toHaveBeenCalledTimes(1);
      expect(i18nTranslateSpy).toHaveBeenCalledTimes(1);
      expect(toOrderResponseSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should handle single item order correctly', async () => {
      const singleItemRequest: OrderRequest = {
        ...mockOrderRequest,
        items: [{ productVariantId: 1, quantity: 1 }],
      };

      const singleVariant = [mockProductVariants[0]];

      const prismaFindManySpy = jest
        .spyOn(mockPrismaService.client.productVariant, 'findMany')
        .mockResolvedValue(singleVariant);

      const prismaTransactionSpy = jest
        .spyOn(mockPrismaService.client, '$transaction')
        .mockImplementation(
          async <T>(callback: (tx: MockPrismaTransaction) => Promise<T>): Promise<T> => {
            return callback({
              product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
              order: { create: jest.fn().mockResolvedValue(cashCreatedOrder) },
            });
          },
        );

      const toOrderResponseSpy = jest
        .spyOn(service, 'toOrderResponse')
        .mockReturnValue({} as OrderResponse);

      const result = await service.createOrder(singleItemRequest);

      expect(prismaFindManySpy).toHaveBeenCalledWith({
        where: { id: { in: [1] } },
        include: { product: { select: { quantity: true } } },
      });
      expect(prismaTransactionSpy).toHaveBeenCalledTimes(1);
      expect(toOrderResponseSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should handle high quantity orders correctly', async () => {
      const highQuantityRequest: OrderRequest = {
        ...mockOrderRequest,
        items: [{ productVariantId: 1, quantity: 100 }],
      };

      const highQuantityVariant = [{ ...mockProductVariants[0], product: { quantity: 150 } }];

      const prismaFindManySpy = jest
        .spyOn(mockPrismaService.client.productVariant, 'findMany')
        .mockResolvedValue(highQuantityVariant);

      const prismaTransactionSpy = jest
        .spyOn(mockPrismaService.client, '$transaction')
        .mockImplementation(
          async <T>(callback: (tx: MockPrismaTransaction) => Promise<T>): Promise<T> => {
            return callback({
              product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
              order: { create: jest.fn().mockResolvedValue(cashCreatedOrder) },
            });
          },
        );

      const toOrderResponseSpy = jest
        .spyOn(service, 'toOrderResponse')
        .mockReturnValue({} as OrderResponse);

      const result = await service.createOrder(highQuantityRequest);

      expect(prismaFindManySpy).toHaveBeenCalledTimes(1);
      expect(prismaTransactionSpy).toHaveBeenCalledTimes(1);
      expect(toOrderResponseSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });
  });
});
