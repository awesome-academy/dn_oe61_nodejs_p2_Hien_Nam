import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ProductService } from '../src/product-service.service';
import { PrismaService } from '@app/prisma';
import { ProductProducer } from '../src/product.producer';
import { PaymentPaidPayloadDto } from '@app/common/dto/product/payload/payment-paid.payload';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Order, Payment, PaymentMethod, PaymentStatus, PaymentType } from '../generated/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { NOTIFICATION_SERVICE } from '@app/common';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import * as prismaErrorUtils from '@app/common/utils/prisma-client-error';
import { CacheService } from '@app/common/cache/cache.service';

describe('ProductService - handlePaymentPaid', () => {
  let service: ProductService;
  let loggerService: CustomLogger;

  const mockOrder: Order = {
    id: 1,
    userId: 1,
    amount: new Decimal(100000),
    paymentMethod: 'BANK_TRANSFER',
    paymentStatus: PaymentStatus.PENDING,
    status: 'PENDING',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deliveryAddress: '123 Main St',
    note: 'abc',
  };

  const mockPayment: Payment = {
    id: 1,
    orderId: 1,
    amount: new Decimal(100000),
    transactionCode: 'TXN123456',
    accountNumber: '1234567890',
    bankCode: 'VCB',
    paymentType: PaymentType.PAYIN,
    status: PaymentStatus.PAID,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPaymentPaidPayload: PaymentPaidPayloadDto = {
    orderId: 1,
    amount: 100000,
    method: PaymentMethod.BANK_TRANSFER,
    accountNumber: '9876543210',
    reference: 'TXN123456',
    counterAccountBankId: 'VCB',
    counterAccounName: 'John Doe',
    counterAccountNumber: '9876543210',
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

  const mockI18nService = {
    translate: jest.fn(),
  };

  const mockProductProducer = {
    clearScheduleHandleExpiredPayment: jest.fn(),
  };

  const mockNotificationClient = {
    emit: jest.fn(),
  };

  const mockPrismaClient = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockPrismaService = {
    client: mockPrismaClient,
  };
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteByPattern: jest.fn(),
    getOrSet: jest.fn(),
  } as unknown as CacheService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<ProductService>(ProductService);
    loggerService = module.get<CustomLogger>(CustomLogger);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('handlePaymentPaid', () => {
    it('should throw TypedRpcException when order not found', async () => {
      // Arrange
      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(null);
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };
      // Act & Assert
      try {
        await service.handlePaymentPaid(mockPaymentPaidPayload);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should successfully process payment and return order and payment details', async () => {
      // Arrange
      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrder);
      const transactionSpy = jest.spyOn(mockPrismaClient, '$transaction');
      mockPrismaClient.$transaction.mockImplementation(
        async <T>(callback: (tx: typeof mockPrismaClient) => Promise<T>): Promise<T> => {
          const mockTx = {
            order: {
              update: jest
                .fn()
                .mockResolvedValue({ ...mockOrder, paymentStatus: PaymentStatus.PAID }),
            },
            payment: {
              create: jest.fn().mockResolvedValue(mockPayment),
            },
          } as unknown as typeof mockPrismaClient;

          return callback(mockTx);
        },
      );

      // Act
      const result = await service.handlePaymentPaid(mockPaymentPaidPayload);

      // Assert
      expect(result).toEqual({
        orderDetail: mockOrder,
        paymentDetail: mockPayment,
      });

      expect(transactionSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle database error during order find operation', async () => {
      // Arrange
      const databaseError = new Error('Database connection failed');
      (mockCacheService.getOrSet as jest.Mock).mockRejectedValue(databaseError);
      const handleServiceErrorSpy = jest
        .spyOn(prismaErrorUtils, 'handleServiceError')
        .mockImplementation(() => {
          throw new Error('Mocked error');
        });

      // Act & Assert
      try {
        await service.handlePaymentPaid(mockPaymentPaidPayload);
      } catch {
        // Expected to throw
      }

      expect(handleServiceErrorSpy).toHaveBeenCalledWith(
        databaseError,
        ProductService.name,
        'handleWebhookCallbackPayment',
        loggerService,
      );
    });

    it('should handle database error during transaction operation', async () => {
      // Arrange
      const databaseError = new Error('Transaction failed');
      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrder);
      const transactionSpy = jest
        .spyOn(mockPrismaClient, '$transaction')
        .mockRejectedValue(databaseError);
      const handleServiceErrorSpy = jest
        .spyOn(prismaErrorUtils, 'handleServiceError')
        .mockImplementation(() => {
          throw new Error('Mocked error');
        });

      // Act & Assert
      try {
        await service.handlePaymentPaid(mockPaymentPaidPayload);
      } catch {
        // Expected to throw
      }

      expect(transactionSpy).toHaveBeenCalledWith(expect.any(Function));

      expect(handleServiceErrorSpy).toHaveBeenCalledWith(
        databaseError,
        ProductService.name,
        'handleWebhookCallbackPayment',
        loggerService,
      );
    });

    it('should create payment with correct data structure', async () => {
      // Arrange
      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrder);
      let capturedPaymentData: unknown;
      const transactionSpy = jest.spyOn(mockPrismaClient, '$transaction');
      mockPrismaClient.$transaction.mockImplementation(
        async <T>(callback: (tx: typeof mockPrismaClient) => Promise<T>): Promise<T> => {
          const mockTx = {
            order: {
              update: jest
                .fn()
                .mockResolvedValue({ ...mockOrder, paymentStatus: PaymentStatus.PAID }),
            },
            payment: {
              create: jest.fn().mockImplementation((data: { data: unknown }) => {
                capturedPaymentData = data.data;
                return Promise.resolve(mockPayment);
              }),
            },
          } as unknown as typeof mockPrismaClient;

          return callback(mockTx);
        },
      );
      // Act
      await service.handlePaymentPaid(mockPaymentPaidPayload);
      // Assert
      expect(capturedPaymentData).toEqual({
        order: {
          connect: {
            id: mockOrder.id,
          },
        },
        amount: mockPaymentPaidPayload.amount,
        transactionCode: mockPaymentPaidPayload.reference,
        accountNumber: mockPaymentPaidPayload.counterAccountNumber,
        bankCode: mockPaymentPaidPayload.counterAccountBankId,
        paymentType: PaymentType.PAYIN,
        status: PaymentStatus.PAID,
      });
      expect(transactionSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should update order payment status to PAID during transaction', async () => {
      // Arrange
      (mockCacheService.getOrSet as jest.Mock).mockResolvedValue(mockOrder);
      let capturedOrderUpdate: unknown;
      const transactionSpy = jest.spyOn(mockPrismaClient, '$transaction');
      mockPrismaClient.$transaction.mockImplementation(
        async <T>(callback: (tx: typeof mockPrismaClient) => Promise<T>): Promise<T> => {
          const mockTx = {
            order: {
              update: jest.fn().mockImplementation((updateData: unknown) => {
                capturedOrderUpdate = updateData;
                return Promise.resolve({ ...mockOrder, paymentStatus: PaymentStatus.PAID });
              }),
            },
            payment: {
              create: jest.fn().mockResolvedValue(mockPayment),
            },
          } as unknown as typeof mockPrismaClient;

          return callback(mockTx);
        },
      );

      // Act
      await service.handlePaymentPaid(mockPaymentPaidPayload);

      // Assert
      expect(capturedOrderUpdate).toEqual({
        where: {
          id: mockOrder.id,
        },
        data: {
          paymentStatus: PaymentStatus.PAID,
        },
      });

      expect(transactionSpy).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
