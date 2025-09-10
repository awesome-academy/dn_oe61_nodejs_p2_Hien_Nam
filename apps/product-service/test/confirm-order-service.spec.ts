import { NOTIFICATION_SERVICE } from '@app/common';
import { ConfirmOrderRequest } from '@app/common/dto/product/requests/confirm-order.request';
import { OrderResponse } from '@app/common/dto/product/response/order-response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import * as prismaErrorUtils from '@app/common/utils/prisma-client-error';
import { PrismaService } from '@app/prisma';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { OrderStatus, PaymentStatus } from '../generated/prisma';
import { ProductService } from '../src/product-service.service';
import { ProductProducer } from '../src/product.producer';
import { assertRpcException } from '@app/common/helpers/test.helper';

jest.mock('@app/common/utils/prisma-client-error', () => ({
  handleServiceError: jest.fn(),
}));

describe('ProductService - confirmOrder', () => {
  let service: ProductService;
  let loggerService: CustomLogger;

  const mockPrismaService = {
    client: {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
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
    loggerService = module.get<CustomLogger>(CustomLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('confirmOrder', () => {
    const mockConfirmOrderRequest: ConfirmOrderRequest = {
      orderId: 123,
      userId: 456,
    };

    const mockOrderDetail: OrderResponse = {
      id: 123,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      deliveryAddress: 'Da Nang city',
      note: 'abc',
      paymentMethod: PaymentMethodEnum.CASH,
      totalPrice: 400000,
      paymentStatus: PaymentStatus.PAID,
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
      ],
    };

    it('should throw error when order not found', async () => {
      mockPrismaService.client.order.findUnique.mockResolvedValue(null);
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };
      try {
        await service.confirmOrder(mockConfirmOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(mockPrismaService.client.order.findUnique).toHaveBeenCalledWith({
        where: { id: mockConfirmOrderRequest.orderId },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        include: expect.any(Object),
      });
      expect(mockPrismaService.client.order.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw error when bank transfer order has pending payment', async () => {
      const pendingPaymentOrder = {
        ...mockOrderDetail,
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        paymentStatus: PaymentStatus.PENDING,
      };
      mockPrismaService.client.order.findUnique.mockResolvedValue(pendingPaymentOrder);
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.order.orderPendingPayment',
      };
      try {
        await service.confirmOrder(mockConfirmOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(mockPrismaService.client.order.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should return unchanged status when order already confirmed', async () => {
      const confirmedOrder = {
        ...mockOrderDetail,
        status: OrderStatus.CONFIRMED,
      };

      mockPrismaService.client.order.findUnique.mockResolvedValue(confirmedOrder);
      const toOrderResponseSpy = jest
        .spyOn(service, 'toOrderResponse')
        .mockReturnValue(confirmedOrder);

      const result = await service.confirmOrder(mockConfirmOrderRequest);

      expect(mockPrismaService.client.order.findUnique).toHaveBeenCalledTimes(1);
      expect(toOrderResponseSpy).toHaveBeenCalledWith(confirmedOrder);
      expect(result.statusKey).toBe(StatusKey.UNCHANGED);
      expect(result.data).toEqual(confirmedOrder);
    });

    it('should successfully confirm cash payment order', async () => {
      mockPrismaService.client.order.findUnique.mockResolvedValue(mockOrderDetail);
      mockPrismaService.client.order.update.mockResolvedValue({
        ...mockOrderDetail,
        status: OrderStatus.CONFIRMED,
      });

      const toOrderResponseSpy = jest.spyOn(service, 'toOrderResponse').mockReturnValue({
        ...mockOrderDetail,
        status: OrderStatus.CONFIRMED,
      });

      const loggerLogSpy = jest.spyOn(loggerService, 'log');

      const result = await service.confirmOrder(mockConfirmOrderRequest);

      expect(mockPrismaService.client.order.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.client.order.update).toHaveBeenCalledWith({
        where: { id: mockConfirmOrderRequest.orderId },
        data: { status: OrderStatus.CONFIRMED },
      });
      expect(mockPrismaService.client.order.update).toHaveBeenCalledTimes(1);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `[Order(${mockOrderDetail.id}) has confirmed by AdminId: ${mockConfirmOrderRequest.userId}]`,
      );
      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
      expect(toOrderResponseSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data!.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should successfully confirm bank transfer order with paid status', async () => {
      const bankTransferOrder = {
        ...mockOrderDetail,
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.PENDING,
      };

      mockPrismaService.client.order.findUnique.mockResolvedValue(bankTransferOrder);
      mockPrismaService.client.order.update.mockResolvedValue({
        ...bankTransferOrder,
        status: OrderStatus.CONFIRMED,
      });

      const toOrderResponseSpy = jest.spyOn(service, 'toOrderResponse').mockReturnValue({
        ...bankTransferOrder,
        status: OrderStatus.CONFIRMED,
      });

      const loggerLogSpy = jest.spyOn(loggerService, 'log');

      const result = await service.confirmOrder(mockConfirmOrderRequest);

      expect(mockPrismaService.client.order.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.client.order.update).toHaveBeenCalledWith({
        where: { id: mockConfirmOrderRequest.orderId },
        data: { status: OrderStatus.CONFIRMED },
      });
      expect(mockPrismaService.client.order.update).toHaveBeenCalledTimes(1);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `[Order(${bankTransferOrder.id}) has confirmed by AdminId: ${mockConfirmOrderRequest.userId}]`,
      );
      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
      expect(toOrderResponseSpy).toHaveBeenCalledTimes(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data!.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should handle database error when finding order', async () => {
      const databaseError = new Error('Database connection failed');
      const rpcError = {
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.erros.recordNotFound',
      };
      mockPrismaService.client.order.findUnique.mockRejectedValue(databaseError);
      const handleServiceErrorSpy = jest
        .spyOn(prismaErrorUtils, 'handleServiceError')
        .mockImplementation(() => {
          throw new TypedRpcException(rpcError);
        });
      try {
        await service.confirmOrder(mockConfirmOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(mockPrismaService.client.order.findUnique).toHaveBeenCalledTimes(1);
      expect(handleServiceErrorSpy).toHaveBeenCalledWith(
        databaseError,
        'ProductService',
        'confirmOrder',
        loggerService,
      );
    });

    it('should handle database error when updating order', async () => {
      const orderToUpdate = {
        ...mockOrderDetail,
        status: OrderStatus.PENDING,
      };
      mockPrismaService.client.order.findUnique.mockResolvedValue(orderToUpdate);
      const updateError = new Error('Update failed');
      const rpcError = {
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.erros.recordNotFound',
      };
      mockPrismaService.client.order.update.mockRejectedValue(updateError);
      const handleServiceErrorSpy = jest
        .spyOn(prismaErrorUtils, 'handleServiceError')
        .mockImplementation(() => {
          throw new TypedRpcException(rpcError);
        });
      try {
        await service.confirmOrder(mockConfirmOrderRequest);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(mockPrismaService.client.order.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.client.order.update).toHaveBeenCalledTimes(1);
      expect(handleServiceErrorSpy).toHaveBeenCalledWith(
        updateError,
        'ProductService',
        'confirmOrder',
        loggerService,
      );
    });
  });
});
