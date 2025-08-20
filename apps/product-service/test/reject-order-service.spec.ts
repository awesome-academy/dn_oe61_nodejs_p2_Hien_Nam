import { RejectOrderRequest } from '@app/common/dto/product/requests/reject-order.request';
import { OrderResponse } from '@app/common/dto/product/response/order-response';
import { PayOSPayoutPaymentResponseDto } from '@app/common/dto/product/response/payos-payout-creation.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { REJECT_ORDER_STATUS } from '@app/common/enums/order.enum';
import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import * as prismaErrorUtils from '@app/common/utils/prisma-client-error';
import { PrismaService } from '@app/prisma';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { OrderStatus, PaymentStatus, PrismaClient } from '../generated/prisma';
import { ProductService } from '../src/product-service.service';
import { ProductProducer } from '../src/product.producer';
import { NOTIFICATION_SERVICE } from '@app/common';
import { PaginationService } from '@app/common/shared/pagination.shared';

jest.mock('@app/common/utils/prisma-client-error', () => ({
  handleServiceError: jest.fn(),
}));
describe('ProductService - rejectOrder', () => {
  let service: ProductService;
  let prismaService: PrismaService<PrismaClient>;
  let loggerService: CustomLogger;

  const mockPrismaService = {
    client: {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      product: {
        updateMany: jest.fn(),
      },
      payment: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
  };
  const mockProductProducer = {
    addJobRetryPayment: jest.fn(),
  };
  const mockNotificationClient = {
    emit: jest.fn(),
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
    prismaService = module.get<PrismaService<PrismaClient>>(PrismaService);
    loggerService = module.get<CustomLogger>(CustomLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('rejectOrder', () => {
    const mockRejectOrderRequest: RejectOrderRequest = {
      orderId: 123,
      userId: 456,
    };
    // const mockOrder = {
    //   id: 123,
    //   status: OrderStatus.PENDING,
    //   createdAt: new Date(),
    //   deliveryAddress: 'Da Nang city',
    //   note: 'abc',
    //   paymentMethod: PaymentMethodEnum.CASH,
    //   totalPrice: 400000,
    //   paymentStatus: PaymentStatus.PENDING,
    //   userId: 1,
    // };
    const mockOrderDetail: OrderResponse = {
      id: 123,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      deliveryAddress: 'Da Nang city',
      note: 'abc',
      paymentMethod: PaymentMethodEnum.CASH,
      totalPrice: 400000,
      paymentStatus: PaymentStatus.PENDING,
      userId: 1,
      items: [
        {
          id: 1,
          productVariantId: 10,
          quantity: 2,
          productName: 'ABC1',
          productSize: 'S',
          price: 100000,
          note: 'abc',
        },
        {
          id: 2,
          productVariantId: 10,
          quantity: 2,
          productName: 'ABC2',
          productSize: 'S',
          price: 100000,
          note: 'abc',
        },
      ],
    };

    it('should throw error when order not found', async () => {
      const orderFindUniqueSpy = jest
        .spyOn(prismaService.client.order, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.rejectOrder(mockRejectOrderRequest)).rejects.toThrow(
        new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.order.notFound',
        }),
      );
      expect(orderFindUniqueSpy).toHaveBeenCalledWith({
        where: { id: mockRejectOrderRequest.orderId },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        include: expect.any(Object),
      });
      expect(orderFindUniqueSpy).toHaveBeenCalledTimes(1);
    });

    it('should return unchanged status when order already cancelled', async () => {
      const cancelledOrder = {
        ...mockOrderDetail,
        status: OrderStatus.CANCELLED,
      };
      mockPrismaService.client.order.findUnique.mockResolvedValue(cancelledOrder);
      const result = await service.rejectOrder(mockRejectOrderRequest);
      expect(result.statusKey).toBe(StatusKey.UNCHANGED);
      expect(result.data!.status).toBe(REJECT_ORDER_STATUS.UNCHANGED);
      expect(result.data!.description).toBe('Order has been rejected');
      expect(result.data!.orderId).toBe(cancelledOrder.id);
    });

    it('should successfully reject cash payment order', async () => {
      mockPrismaService.client.order.findUnique.mockResolvedValue(mockOrderDetail);
      const transactionSpy = jest
        .spyOn(prismaService.client, '$transaction')
        .mockImplementation(
          async <T>(callback: (tx: typeof prismaService.client) => Promise<T>): Promise<T> => {
            const mockTx = {
              product: {
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
              },
              payment: {
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
              },
              order: {
                update: jest.fn().mockResolvedValue(mockOrderDetail),
              },
            } as unknown as typeof prismaService.client;
            return callback(mockTx);
          },
        );
      const loggerLogSpy = jest.spyOn(loggerService, 'log');
      const result = await service.rejectOrder(mockRejectOrderRequest);
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `[Reject order(${mockOrderDetail.id}) successfully]`,
        `Order rejected by Admin:${mockRejectOrderRequest.userId}`,
      );
      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data!.status).toBe(REJECT_ORDER_STATUS.SUCCESS);
      expect(result.data!.orderId).toBe(mockOrderDetail.id);
      expect(result.data!.paymentMethod).toBe(PaymentMethodEnum.CASH);
      expect(result.data!.rejectedAt).toBeInstanceOf(Date);
    });

    it('should successfully reject bank transfer order', async () => {
      const bankTransferOrder = {
        ...mockOrderDetail,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
      };
      mockPrismaService.client.order.findUnique.mockResolvedValue(bankTransferOrder);
      const data: PayOSPayoutPaymentResponseDto = {
        desc: '113',
        data: {
          id: '1313',
          referenceId: 'REF123',
          amount: 100000,
          description: 'Descirption',
          reference: 'abc',
          errorCode: '123',
          errorMessage: 'Error',
          toBin: 'BANK001',
          toAccountNumber: '1234567890',
          toAccountName: 'Account Name',
          transactionDatetime: new Date(),
          transactions: [
            {
              toBin: 'BANK001',
              toAccountNumber: '1234567890',
              amount: 100000,
              id: 'abc',
              referenceId: 'REF123',
              description: 'Description',
              toAccountName: 'Account Name',
              transactionDatetime: new Date(),
              reference: 'abc',
            },
          ],
        },
      };
      const createPayoutOrderSpy = jest.spyOn(service, 'createPayoutOrder').mockResolvedValue(data);
      const result = await service.rejectOrder(mockRejectOrderRequest);
      expect(createPayoutOrderSpy).toHaveBeenCalledWith(
        bankTransferOrder.id,
        bankTransferOrder.items,
      );
      expect(createPayoutOrderSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data!.status).toBe(REJECT_ORDER_STATUS.SUCCESS);
      expect(result.data!.orderId).toBe(bankTransferOrder.id);
      expect(result.data!.paymentMethod).toBe(PaymentMethodEnum.BANK_TRANSFER);
      expect(result.data!.payoutInfo).toEqual({
        bankCode: 'BANK001',
        toAccountNumber: '1234567890',
        transactionCode: 'REF123',
        amountRefunded: 100000,
        userId: mockRejectOrderRequest.userId,
        userRejectId: mockRejectOrderRequest.userId,
      });
    });

    it('should throw error for unsupported payment method', async () => {
      const unsupportedOrder = {
        ...mockOrderDetail,
        paymentMethod: 'UNSUPPORTED_METHOD' as PaymentMethodEnum,
      };

      mockPrismaService.client.order.findUnique.mockResolvedValue(unsupportedOrder);

      await expect(service.rejectOrder(mockRejectOrderRequest)).rejects.toThrow(
        new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.order.unSupportedPaymentMethod',
        }),
      );
    });

    it('should handle transaction error for cash payment', async () => {
      mockPrismaService.client.order.findUnique.mockResolvedValue(mockOrderDetail);
      const transactionError = new Error('Transaction failed');
      const transactionSpy = jest
        .spyOn(prismaService.client, '$transaction')
        .mockRejectedValue(transactionError);
      const handleServiceErrorSpy = jest
        .spyOn(prismaErrorUtils, 'handleServiceError')
        .mockImplementation(() => {
          throw transactionError;
        });

      await expect(service.rejectOrder(mockRejectOrderRequest)).rejects.toThrow(transactionError);
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(handleServiceErrorSpy).toHaveBeenCalledWith(
        transactionError,
        'ProductService',
        'rejectOrder',
        loggerService,
      );
    });

    it('should handle payout creation error for bank transfer', async () => {
      const bankTransferOrder = {
        ...mockOrderDetail,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
      };

      mockPrismaService.client.order.findUnique.mockResolvedValue(bankTransferOrder);
      const payoutError = new Error('Payout creation failed');
      const createPayoutOrderSpy = jest
        .spyOn(service, 'createPayoutOrder')
        .mockRejectedValue(payoutError);

      const handleServiceErrorSpy = jest
        .spyOn(prismaErrorUtils, 'handleServiceError')
        .mockImplementation(() => {
          throw payoutError;
        });
      await expect(service.rejectOrder(mockRejectOrderRequest)).rejects.toThrow(payoutError);
      expect(createPayoutOrderSpy).toHaveBeenCalledTimes(1);
      expect(handleServiceErrorSpy).toHaveBeenCalledWith(
        payoutError,
        'ProductService',
        'rejectOrder',
        loggerService,
      );
    });
  });
});
