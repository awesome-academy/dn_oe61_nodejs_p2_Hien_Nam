import { PRODUCT_SERVICE } from '@app/common';
import { GetStatisticByMonthRequest } from '@app/common/dto/product/requests/get-statistic-by-month.request';
import { StatisticOrderByMonthResponse } from '@app/common/dto/product/response/statistic-order-by-month.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import * as microServiceHelper from '@app/common/helpers/microservices';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { StatisticService } from '../../src/statistic/statistic.service';
describe('StatisticService', () => {
  let service: StatisticService;
  let loggerService: CustomLogger;

  const loggerServiceMock = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const productClientMock = {
      send: jest.fn().mockReturnValue('Fake_observable'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticService,
        { provide: PRODUCT_SERVICE, useValue: productClientMock },
        { provide: CustomLogger, useValue: loggerServiceMock },
      ],
    }).compile();

    service = module.get<StatisticService>(StatisticService);
    loggerService = module.get<CustomLogger>(CustomLogger);
    jest.clearAllMocks();
  });

  describe('statisticOrderMonthly', () => {
    const dto: GetStatisticByMonthRequest = {
      month: 9,
      year: 2025,
    };
    const mockResponse: StatisticOrderByMonthResponse = {
      month: '2025 - 09',
      totalOrders: 110,
      completedOrders: 0,
      cancelledOrders: 25,
      refunedOrders: 2,
      grossRevenue: 440000,
      netRevenue: 4000,
      averageOrderValue: 36.36363636363637,
      topProducts: [
        {
          productId: 1,
          productName: 'pizza s',
          nameSize: 'S',
          quantity: 220,
        },
      ],
      topCategories: [],
      topCustomers: [
        {
          customerId: 2,
          revenue: 440000,
        },
      ],
      paymentMethods: [
        {
          paymentMethodName: 'BANK_TRANSFER',
          quantity: 99,
        },
        {
          paymentMethodName: 'CASH',
          quantity: 10,
        },
        {
          paymentMethodName: 'CREDIT_CARD',
          quantity: 1,
        },
      ],
    };

    let callMicroserviceSpy: jest.SpyInstance;

    beforeEach(() => {
      callMicroserviceSpy = jest.spyOn(microServiceHelper, 'callMicroservice');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return statistic order by month response on success', async () => {
      callMicroserviceSpy.mockResolvedValue(mockResponse);
      const result = await service.statisticOrderMonthly(dto);
      expect(callMicroserviceSpy).toHaveBeenCalledWith(
        'Fake_observable',
        PRODUCT_SERVICE,
        loggerService,
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should log error and propagate when microservice throws internal server error', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      callMicroserviceSpy.mockRejectedValue(new TypedRpcException(rpcError));
      await expect(service.statisticOrderMonthly(dto)).rejects.toThrow(TypedRpcException);
      try {
        await service.statisticOrderMonthly(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(
          HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        );
      }
    });

    it('should log error and propagate when microservice throws conflict error', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.errors.conflictError',
      };
      callMicroserviceSpy.mockRejectedValue(new TypedRpcException(rpcError));
      await expect(service.statisticOrderMonthly(dto)).rejects.toThrow(TypedRpcException);
      try {
        await service.statisticOrderMonthly(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.CONFLICT);
      }
    });
    it('should log error and propagate when microservice throws service unavailable', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.serviceUnavailable',
      };
      callMicroserviceSpy.mockRejectedValue(new TypedRpcException(rpcError));
      await expect(service.statisticOrderMonthly(dto)).rejects.toThrow(TypedRpcException);
      try {
        await service.statisticOrderMonthly(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(
          HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        );
      }
    });

    it('should return undefined if response is empty', async () => {
      callMicroserviceSpy.mockResolvedValue(undefined);
      const result = await service.statisticOrderMonthly(dto);
      expect(result).toBeUndefined();
    });
  });
});
