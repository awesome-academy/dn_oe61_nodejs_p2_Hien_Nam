import { NOTIFICATION_SERVICE } from '@app/common';
import { PaymentPaidResponse } from '@app/common/dto/product/response/payment-paid.response';
import { PayOSWebhookDTO } from '@app/common/dto/product/response/payos-webhook.dto';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { NotificationEvent } from '@app/common/enums/queue/order-event.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import * as handlePrismaClient from '@app/common/utils/prisma-client-error';
import { PrismaService } from '@app/prisma';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { Order, Payment, PaymentMethod, PaymentStatus, PaymentType } from '../generated/prisma';
import { Decimal } from '../generated/prisma/runtime/library';
import { ProductService } from '../src/product-service.service';
import { ProductProducer } from '../src/product.producer';

describe('ProductService - handleWebhookCallbackPayment', () => {
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
    deliveryAddress: 'Da Nang city',
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

  const mockPayOSWebhookPayload: PayOSWebhookDTO = {
    code: '00',
    desc: 'success',
    success: true,
    data: {
      orderCode: 1,
      amount: 100000,
      description: 'Payment for order 1',
      accountNumber: '1234567890',
      reference: 'TXN123456',
      transactionDateTime: '2024-01-01T10:00:00Z',
      currency: 'VND',
      paymentLinkId: 'link123',
      counterAccountBankId: 'VCB',
      counterAccountName: 'John Doe',
      counterAccountNumber: '9876543210',
      virtualAccountName: 'Virtual Account',
      virtualAccountNumber: '1111111111',
    },
    signature: 'valid_signature',
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
    // (handleServiceError as jest.Mock).mockImplementation((error) => {
    //   throw error;
    // });
  });

  describe('handleWebhookCallbackPayment', () => {
    it('should throw TypedRpcException when signature is invalid', async () => {
      // Arrange
      const invalidPayload = { ...mockPayOSWebhookPayload, signature: 'invalid_signature' };
      const mockIsValidData = jest.spyOn(service, 'isValidData').mockReturnValue(false);

      // Act & Assert
      try {
        await service.handleWebhookCallbackPayment(invalidPayload);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
      }

      expect(mockIsValidData).toHaveBeenCalledWith(expect.any(Object), 'invalid_signature');
    });

    it('should return success response for successful payment webhook', async () => {
      // Arrange
      const mockIsValidData = jest.spyOn(service, 'isValidData').mockReturnValue(true);
      const mockHandlePaymentPaid = jest.spyOn(service, 'handlePaymentPaid').mockResolvedValue({
        orderDetail: mockOrder,
        paymentDetail: mockPayment,
      });
      mockProductProducer.clearScheduleHandleExpiredPayment.mockResolvedValue(undefined);
      mockNotificationClient.emit.mockReturnValue(undefined);

      const expectedResponse: BaseResponse<PaymentPaidResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          status: PaymentStatus.PAID,
          info: {
            amount: 100000,
            referenceCode: 'TXN123456',
            paidAt: mockPayment.createdAt,
          },
        },
      };

      // Act
      const result = await service.handleWebhookCallbackPayment(mockPayOSWebhookPayload);

      // Assert
      expect(result).toMatchObject(expectedResponse);
      expect(mockIsValidData).toHaveBeenCalledWith(expect.any(Object), 'valid_signature');
      expect(mockHandlePaymentPaid).toHaveBeenCalledWith({
        orderId: 1,
        amount: 100000,
        method: PaymentMethod.BANK_TRANSFER,
        accountNumber: '1234567890',
        reference: 'TXN123456',
        counterAccountBankId: 'VCB',
        counterAccounName: 'John Doe',
        counterAccountNumber: '9876543210',
      });
      expect(mockProductProducer.clearScheduleHandleExpiredPayment).toHaveBeenCalledWith(1);
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        NotificationEvent.ORDER_CREATED,
        expect.any(Object),
      );
    });

    it('should return failed response for unsuccessful payment webhook', async () => {
      // Arrange
      const failedPayload = { ...mockPayOSWebhookPayload, success: false, code: '01' };
      jest.spyOn(service, 'isValidData').mockReturnValue(true);

      const expectedResponse: BaseResponse<PaymentPaidResponse> = {
        statusKey: StatusKey.FAILED,
        data: {
          status: PaymentStatus.FAILED,
        },
      };

      // Act
      const result = await service.handleWebhookCallbackPayment(failedPayload);

      // Assert
      expect(result).toMatchObject(expectedResponse);
    });

    it('should return failed response when code is not 00', async () => {
      // Arrange
      const failedPayload = { ...mockPayOSWebhookPayload, code: '99' };
      jest.spyOn(service, 'isValidData').mockReturnValue(true);

      const expectedResponse: BaseResponse<PaymentPaidResponse> = {
        statusKey: StatusKey.FAILED,
        data: {
          status: PaymentStatus.FAILED,
        },
      };

      // Act
      const result = await service.handleWebhookCallbackPayment(failedPayload);

      // Assert
      expect(result).toMatchObject(expectedResponse);
    });
  });

  describe('handlePaymentPaid', () => {
    const mockPaymentPaidPayload = {
      orderId: 1,
      amount: 100000,
      method: PaymentMethod.BANK_TRANSFER,
      accountNumber: '9876543210',
      reference: 'TXN123456',
      counterAccountBankId: 'VCB',
      counterAccounName: 'John Doe',
      counterAccountNumber: '9876543210',
    };

    it('should throw TypedRpcException when order not found', async () => {
      // Arrange
      mockPrismaClient.order.findUnique.mockResolvedValue(null);
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };
      // Act & Assert
      try {
        await service.handlePaymentPaid(mockPaymentPaidPayload);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(mockPrismaClient.order.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should successfully process payment and return order and payment details', async () => {
      // Arrange
      mockPrismaClient.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaClient.$transaction.mockImplementation(
        async <T>(callback: (tx: typeof mockPrismaClient) => Promise<T>): Promise<T> => {
          const mockTx = {
            order: {
              update: jest.fn().mockResolvedValue(mockOrder),
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

      expect(mockPrismaClient.order.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(mockPrismaClient.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle database transaction errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockPrismaClient.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaClient.$transaction.mockRejectedValue(dbError);
      const handleServiceErrorSpy = jest.spyOn(handlePrismaClient, 'handleServiceError');
      // Act & Assert
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      try {
        await service.handlePaymentPaid(mockPaymentPaidPayload);
        fail('Expected error to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(handleServiceErrorSpy).toHaveBeenCalledWith(
        dbError,
        ProductService.name,
        'handleWebhookCallbackPayment',
        loggerService,
      );
    });
  });
});
