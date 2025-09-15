import { NOTIFICATION_SERVICE } from '@app/common';
import { CacheService } from '@app/common/cache/cache.service';
import { GetStatisticByMonthRequest } from '@app/common/dto/product/requests/get-statistic-by-month.request';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import * as validationHelper from '@app/common/helpers/validation.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import * as prismaErrorUtils from '@app/common/utils/prisma-client-error';
import { PrismaService } from '@app/prisma';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { ProductService } from '../src/product-service.service';
import { ProductProducer } from '../src/product.producer';
import { assertRpcException } from '@app/common/helpers/test.helper';

describe('ProductService - statisticOrderByMonth', () => {
  let service: ProductService;

  const mockPrismaService = {
    client: {
      order: {
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      orderItem: { groupBy: jest.fn() },
      product: { groupBy: jest.fn() },
      category: { groupBy: jest.fn() },
      customer: { groupBy: jest.fn() },
      payment: { groupBy: jest.fn() },
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockValidateDto = jest.fn();

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
  const mockPaginationService = {
    queryWithPagination: jest.fn(),
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
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CustomLogger, useValue: mockLoggerService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: ProductProducer, useValue: mockProductProducer },
        { provide: NOTIFICATION_SERVICE, useValue: mockNotificationClient },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    jest.clearAllMocks();

    // Mock handleServiceError
    jest.spyOn(prismaErrorUtils, 'handleServiceError').mockImplementation((err) => {
      throw err;
    });

    // Mock validateDto
    jest.spyOn(validationHelper, 'validateDto').mockImplementation(mockValidateDto);

    Object.values(mockPrismaService.client).forEach((fnObj: Record<string, jest.Mock>) => {
      Object.keys(fnObj).forEach((fnKey) => {
        if (typeof fnObj[fnKey]?.mockReset === 'function') {
          fnObj[fnKey].mockReset();
        }
      });
    });
  });

  describe('getStatisticOrderByMonth', () => {
    const input: GetStatisticByMonthRequest = { month: 1, year: 2024 };
    it('should return correct statistics structure when orders exist in the given month', async () => {
      mockConfigService.get.mockImplementation((key, def): number => {
        if (key === 'takeTopCustomer') return 3;
        if (key === 'takeTopProduct') return 5;
        if (key === 'takeTopCategory') return 2;
        return def;
      });

      mockPrismaService.client.order.count = jest
        .fn()
        .mockImplementation((params?: { where?: { status?: string } }) => {
          const where = params?.where || {};
          if (where.status === 'COMPLETED') return Promise.resolve(5);
          if (where.status === 'CANCELLED') return Promise.resolve(2);
          if (where.status === 'REFUNDED') return Promise.resolve(1);
          return Promise.resolve(10);
        });

      mockPrismaService.client.order.aggregate = jest.fn().mockResolvedValue({
        _sum: { amount: 1000 },
      });

      mockPrismaService.client.order.findMany = jest.fn().mockResolvedValue([
        { id: 1, total: 200 },
        { id: 2, total: 200 },
        { id: 3, total: 200 },
        { id: 4, total: 200 },
        { id: 5, total: 200 },
      ]);

      mockPrismaService.client.order.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.orderItem.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.product.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.category.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.customer.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.payment.groupBy = jest.fn().mockResolvedValue([]);
      const result = await service.getStatisticOrderByMonth(input);
      expect(result).toMatchObject({
        month: '2024 - 01',
        totalOrders: 10,
        completedOrders: 5,
        cancelledOrders: 2,
        refunedOrders: 2,
        grossRevenue: 1000,
        netRevenue: 1000,
        averageOrderValue: 100,
        topProducts: [],
        topCategories: [],
        topCustomers: [],
        paymentMethods: [],
      });

      expect(mockPrismaService.client.order.count).toHaveBeenCalledTimes(4);
      expect(mockPrismaService.client.order.aggregate).toHaveBeenCalled();
    });

    it('should return zeros and empty lists if there are no orders in the given month', async () => {
      mockConfigService.get.mockReturnValue(5);
      mockPrismaService.client.order.count = jest.fn().mockResolvedValue(0);
      mockPrismaService.client.order.aggregate = jest
        .fn()
        .mockResolvedValue({ _sum: { amount: 0 } });
      mockPrismaService.client.order.findMany = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.order.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.orderItem.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.product.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.category.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.customer.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.payment.groupBy = jest.fn().mockResolvedValue([]);

      const result = await service.getStatisticOrderByMonth(input);

      expect(result.totalOrders).toBe(0);
      expect(result.completedOrders).toBe(0);
      expect(result.cancelledOrders).toBe(0);
      expect(result.refunedOrders).toBe(0);
      expect(result.grossRevenue).toBe(0);
      expect(result.netRevenue).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.topProducts).toEqual([]);
      expect(result.topCategories).toEqual([]);
      expect(result.topCustomers).toEqual([]);
      expect(result.paymentMethods).toEqual([]);
    });

    it('should calculate averageOrderValue as 0 if totalOrders is 0', async () => {
      mockConfigService.get.mockReturnValue(5);
      mockPrismaService.client.order.count = jest.fn().mockResolvedValue(0);
      mockPrismaService.client.order.aggregate = jest
        .fn()
        .mockResolvedValue({ _sum: { amount: 0 } });
      mockPrismaService.client.order.findMany = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.order.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.orderItem.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.product.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.category.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.customer.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.payment.groupBy = jest.fn().mockResolvedValue([]);

      const result = await service.getStatisticOrderByMonth(input);

      expect(result.averageOrderValue).toBe(0);
    });

    it('should throw and log error if prisma throws', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.errors.recordNotFound',
      };
      mockPrismaService.client.order.count = jest
        .fn()
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await service.getStatisticOrderByMonth(input);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(prismaErrorUtils.handleServiceError).toHaveBeenCalledWith(
        expect.anything(),
        'ProductService',
        'getStatisticOrderByMonth',
        mockLoggerService,
      );
    });

    it('should use config values for top counts', async () => {
      mockConfigService.get.mockImplementation((key, def): number => {
        if (key === 'takeTopCustomer') return 7;
        if (key === 'takeTopProduct') return 11;
        if (key === 'takeTopCategory') return 13;
        return def;
      });
      mockPrismaService.client.order.count = jest.fn().mockResolvedValue(0);
      mockPrismaService.client.order.aggregate = jest
        .fn()
        .mockResolvedValue({ _sum: { total: 0 } });
      mockPrismaService.client.order.findMany = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.order.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.orderItem.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.product.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.category.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.customer.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.payment.groupBy = jest.fn().mockResolvedValue([]);

      await service.getStatisticOrderByMonth(input);

      expect(mockConfigService.get).toHaveBeenCalledWith('takeTopCustomer', expect.anything());
      expect(mockConfigService.get).toHaveBeenCalledWith('takeTopProduct', expect.anything());
      expect(mockConfigService.get).toHaveBeenCalledWith('takeTopCategory', expect.anything());
    });

    it('should handle input with different month/year', async () => {
      const inputData = { month: 12, year: 2023 };
      mockConfigService.get.mockReturnValue(5);
      mockPrismaService.client.order.count = jest.fn().mockResolvedValue(15);
      mockPrismaService.client.order.aggregate = jest
        .fn()
        .mockResolvedValue({ _sum: { amount: 3000 } });
      mockPrismaService.client.order.findMany = jest.fn().mockResolvedValue([
        { id: 1, total: 750 },
        { id: 2, total: 750 },
        { id: 3, total: 750 },
        { id: 4, total: 750 },
      ]);
      mockPrismaService.client.order.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.orderItem.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.product.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.category.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.customer.groupBy = jest.fn().mockResolvedValue([]);
      mockPrismaService.client.payment.groupBy = jest.fn().mockResolvedValue([]);

      const result = await service.getStatisticOrderByMonth(inputData);

      expect(result.month).toBe('2023 - 12');
      expect(result.grossRevenue).toBe(3000);
      expect(result.totalOrders).toBe(15);
    });

    it('should throw TypedRpcException if input is missing or invalid', async () => {
      // Mock validateDto to throw TypedRpcException for invalid input
      mockValidateDto.mockRejectedValue(
        new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.error.validationError',
        }),
      );

      // Missing input
      await expect(
        service.getStatisticOrderByMonth(undefined as unknown as GetStatisticByMonthRequest),
      ).rejects.toThrow(TypedRpcException);

      // Invalid input: missing month
      await expect(
        service.getStatisticOrderByMonth({ year: 2024 } as unknown as GetStatisticByMonthRequest),
      ).rejects.toThrow(TypedRpcException);

      // Invalid input: invalid month
      await expect(service.getStatisticOrderByMonth({ month: 0, year: 2024 })).rejects.toThrow(
        TypedRpcException,
      );
    });
  });
});
