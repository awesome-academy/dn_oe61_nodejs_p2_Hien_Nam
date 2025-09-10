import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ProductService } from '../src/product-service.service';
import { PrismaService } from '@app/prisma';
import { ProductProducer } from '../src/product.producer';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { OrderItem, OrderStatus, Payment, PaymentStatus, PaymentType } from '../generated/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { NOTIFICATION_SERVICE } from '@app/common';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { PayOSPayoutPaymentResponseDto } from '@app/common/dto/product/response/payos-payout-creation.response';
import { PayBalanceResponseDto } from '@app/common/dto/product/response/payos-balance.response';
import axios, { AxiosRequestConfig } from 'axios';
import { PaymentCreationException } from '@app/common/exceptions/payment-creation-exception';
// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios> & {
  get: jest.MockedFunction<typeof axios.get>;
  post: jest.MockedFunction<typeof axios.post>;
};
describe('ProductService - createPayoutOrder', () => {
  let service: ProductService;
  let loggerService: CustomLogger;

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

  const mockRefundedPayment: Payment = {
    id: 2,
    orderId: 1,
    amount: new Decimal(100000),
    transactionCode: 'TXN123456',
    accountNumber: '1234567890',
    bankCode: 'VCB',
    paymentType: PaymentType.PAYOUT,
    status: PaymentStatus.PENDING,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockOrderItems: OrderItem[] = [
    {
      id: 1,
      orderId: 1,
      productVariantId: 1,
      quantity: 2,
      amount: new Decimal(50000),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      note: null,
    },
  ];

  const mockBalanceResponse: PayBalanceResponseDto = {
    code: '00',
    desc: 'success',
    data: {
      accountNumber: '1234567890',
      accountName: 'John Doe',
      currency: 'VND',
      balance: 200000,
    },
  };

  const mockPayoutResponse: PayOSPayoutPaymentResponseDto = {
    desc: 'success',
    data: {
      id: 'payout_123',
      amount: 100000,
      description: 'REFUNED ORDER1',
      referenceId: 'ref_123',
      transactions: [],
      toBin: '123456',
      toAccountNumber: '1234567890',
      toAccountName: 'John Doe',
      reference: 'ref_123',
      transactionDatetime: new Date('2024-01-01'),
      errorMessage: '',
      errorCode: '',
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
    payment: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
    product: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockPrismaService = {
    client: mockPrismaClient,
  };

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
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    loggerService = module.get<CustomLogger>(CustomLogger);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string) => {
      const configMap: Record<string, string> = {
        'payOS.endpoint': 'https://api.payos.vn',
        'payOS.payout.clientId': 'client123',
        'payOS.payout.apiKey': 'api456',
        'payOS.checkSumKey': 'checksum789',
      };
      return configMap[key] || '';
    });
  });

  describe('createPayoutOrder', () => {
    it('should throw TypedRpcException when payment not found', async () => {
      // Arrange
      const findFirstSpy = jest
        .spyOn(mockPrismaClient.payment, 'findFirst')
        .mockResolvedValue(null);

      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.payment.notFound',
      };

      // Act & Assert
      try {
        await service.createPayoutOrder(1, mockOrderItems);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(findFirstSpy).toHaveBeenCalledWith({
        where: {
          orderId: 1,
          status: PaymentStatus.PAID,
        },
      });
    });

    it('should throw TypedRpcException when payment already refunded', async () => {
      // Arrange
      const findFirstSpy = jest
        .spyOn(mockPrismaClient.payment, 'findFirst')
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(mockRefundedPayment);

      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.payment.refunded',
      };

      // Act & Assert
      try {
        await service.createPayoutOrder(1, mockOrderItems);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(findFirstSpy).toHaveBeenNthCalledWith(1, {
        where: {
          orderId: 1,
          status: PaymentStatus.PAID,
        },
      });

      expect(findFirstSpy).toHaveBeenNthCalledWith(2, {
        where: {
          orderId: 1,
          transactionCode: mockPayment.transactionCode,
          paymentType: PaymentType.PAYOUT,
        },
      });
    });

    it('should throw PaymentCreationException when balance check fails', async () => {
      // Arrange
      const findFirstSpy = jest
        .spyOn(mockPrismaClient.payment, 'findFirst')
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(null);

      const failedBalanceResponse = {
        data: {
          code: '01',
          desc: 'Balance check failed',
          data: null,
        },
      };

      mockedAxios.get.mockResolvedValue(failedBalanceResponse);
      // Act & Assert
      try {
        await service.createPayoutOrder(1, mockOrderItems);
        fail('Expected PaymentCreationException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PaymentCreationException);
      }

      expect(findFirstSpy).toHaveBeenCalledTimes(2);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.payos.vn/v1/payouts-account/balance',
        {
          headers: {
            'x-client-id': 'client123',
            'x-api-key': 'api456',
          },
        },
      );
    });

    it('should throw TypedRpcException when balance is insufficient', async () => {
      // Arrange
      const findFirstSpy = jest
        .spyOn(mockPrismaClient.payment, 'findFirst')
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(null);

      const insufficientBalanceResponse = {
        data: {
          ...mockBalanceResponse,
          data: {
            balance: 50000, // Less than payment amount (100000)
          },
        },
      };

      mockedAxios.get.mockResolvedValue(insufficientBalanceResponse);

      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.payment.balanceNotEnough',
      };
      const loggerServiceSpy = jest.spyOn(loggerService, 'error');
      // Act & Assert
      try {
        await service.createPayoutOrder(1, mockOrderItems);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(findFirstSpy).toHaveBeenCalledTimes(2);
      expect(loggerServiceSpy).toHaveBeenCalledWith(
        'CreatePayoutOrder',
        'Balance not enough: 100000',
        'Order ID: 1',
      );
    });

    it('should successfully create payout order and return response', async () => {
      // Arrange
      const findFirstSpy = jest
        .spyOn(mockPrismaClient.payment, 'findFirst')
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(null);

      mockedAxios.get.mockResolvedValue({ data: mockBalanceResponse });
      mockedAxios.post.mockResolvedValue({ data: mockPayoutResponse });

      const transactionSpy = jest.spyOn(mockPrismaClient, '$transaction');
      mockPrismaClient.$transaction.mockImplementation(
        async <T>(callback: (tx: typeof mockPrismaClient) => Promise<T>): Promise<T> => {
          const mockTx = {
            payment: {
              create: jest.fn().mockResolvedValue(mockRefundedPayment),
            },
            order: {
              update: jest.fn().mockResolvedValue({
                id: 1,
                paymentStatus: PaymentStatus.REFUNDED,
                status: OrderStatus.CANCELLED,
              }),
            },
            product: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          } as unknown as typeof mockPrismaClient;

          return callback(mockTx);
        },
      ); // Act
      const result = await service.createPayoutOrder(1, mockOrderItems);
      // Assert
      expect(result).toEqual(mockPayoutResponse);
      expect(findFirstSpy).toHaveBeenCalledTimes(2);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.payos.vn/v1/payouts-account/balance',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-client-id': 'client123',
            'x-api-key': 'api456',
          }) as unknown as Record<string, string>,
        }) as unknown as Partial<AxiosRequestConfig>,
      );

      expect(transactionSpy).toHaveBeenCalledWith(expect.any(Function), {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        timeout: expect.any(Number),
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.payos.vn/v1/payouts',
        expect.objectContaining({
          referenceId: 'TXN123456',
          amount: 100000,
          description: 'REFUNED ORDER1',
          toBin: 'VCB',
          toAccountNumber: '1234567890',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-client-id': 'client123',
            'x-api-key': 'api456',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            'x-signature': expect.any(String),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            'x-idempotency-key': expect.any(String),
          }) as unknown as Record<string, string>,
        }) as unknown as Partial<AxiosRequestConfig>,
      );
    });

    it('should throw PaymentCreationException when payout API fails', async () => {
      // Arrange
      const findFirstSpy = jest
        .spyOn(mockPrismaClient.payment, 'findFirst')
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(null);

      mockedAxios.get.mockResolvedValue({ data: mockBalanceResponse });

      const failedPayoutResponse = {
        data: {
          code: '01',
          desc: 'Payout creation failed',
          data: null,
        },
      };

      mockedAxios.post.mockResolvedValue(failedPayoutResponse);

      const transactionSpy = jest.spyOn(mockPrismaClient, '$transaction');
      mockPrismaClient.$transaction.mockImplementation(
        async <T>(callback: (tx: typeof mockPrismaClient) => Promise<T>): Promise<T> => {
          const mockTx = {
            payment: {
              create: jest.fn().mockResolvedValue(mockRefundedPayment),
            },
            order: {
              update: jest.fn().mockResolvedValue({
                id: 1,
                paymentStatus: PaymentStatus.REFUNDED,
                status: OrderStatus.CANCELLED,
              }),
            },
            product: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          } as unknown as typeof mockPrismaClient;

          return callback(mockTx);
        },
      );
      // Act & Assert
      try {
        await service.createPayoutOrder(1, mockOrderItems);
        fail('Expected PaymentCreationException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PaymentCreationException);
      }
      const loggerServiceSpy = jest.spyOn(loggerService, 'error');
      expect(findFirstSpy).toHaveBeenCalledTimes(2);
      expect(transactionSpy).toHaveBeenCalled();
      expect(loggerServiceSpy).toHaveBeenCalledWith(
        '[Create payout order failed]',
        'Detail:: Payout creation failed',
      );
    });

    it('should update product quantities correctly during transaction', async () => {
      // Arrange
      const multipleOrderItems: OrderItem[] = [
        {
          id: 1,
          orderId: 1,
          productVariantId: 1,
          quantity: 2,
          amount: new Decimal(30000),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          note: null,
        },
        {
          id: 2,
          orderId: 1,
          productVariantId: 2,
          quantity: 3,
          amount: new Decimal(20000),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          note: null,
        },
      ];

      const findFirstSpy = jest
        .spyOn(mockPrismaClient.payment, 'findFirst')
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(null);

      mockedAxios.get.mockResolvedValue({ data: mockBalanceResponse });
      mockedAxios.post.mockResolvedValue({ data: mockPayoutResponse });

      const capturedProductUpdates: unknown[] = [];
      const transactionSpy = jest.spyOn(mockPrismaClient, '$transaction');
      mockPrismaClient.$transaction.mockImplementation(
        async <T>(callback: (tx: typeof mockPrismaClient) => Promise<T>): Promise<T> => {
          const mockTx = {
            payment: {
              create: jest.fn().mockResolvedValue(mockRefundedPayment),
            },
            order: {
              update: jest.fn().mockResolvedValue({
                id: 1,
                paymentStatus: PaymentStatus.REFUNDED,
                status: OrderStatus.CANCELLED,
              }),
            },
            product: {
              updateMany: jest.fn().mockImplementation((updateData) => {
                capturedProductUpdates.push(updateData);
                return Promise.resolve({ count: 1 });
              }),
            },
          } as unknown as typeof mockPrismaClient;

          return callback(mockTx);
        },
      );

      // Act
      await service.createPayoutOrder(1, multipleOrderItems);

      // Assert
      expect(capturedProductUpdates).toHaveLength(2);

      expect(capturedProductUpdates[0]).toEqual({
        where: {
          variants: {
            some: {
              id: 1,
            },
          },
        },
        data: {
          quantity: {
            increment: 2,
          },
        },
      });

      expect(capturedProductUpdates[1]).toEqual({
        where: {
          variants: {
            some: {
              id: 2,
            },
          },
        },
        data: {
          quantity: {
            increment: 3,
          },
        },
      });

      expect(findFirstSpy).toHaveBeenCalledTimes(2);
      expect(transactionSpy).toHaveBeenCalled();
    });
  });
});
