import { PRODUCT_SERVICE } from '@app/common';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Test } from '@nestjs/testing';
import { StatisticController } from 'apps/api-gateway/src/statistic/statistic.controller';
import { StatisticService } from 'apps/api-gateway/src/statistic/statistic.service';

describe('Statistic controller', () => {
  let statisticController: StatisticController;
  let statisticService: StatisticService;
  const mockProductClient = {
    send: jest.fn(),
  };
  const mockCustomLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StatisticController],
      providers: [
        StatisticService,
        {
          provide: PRODUCT_SERVICE,
          useValue: mockProductClient,
        },
        {
          provide: CustomLogger,
          useValue: mockCustomLogger,
        },
      ],
    }).compile();
    statisticService = moduleRef.get<StatisticService>(StatisticService);
    statisticController = moduleRef.get<StatisticController>(StatisticController);
  });
  describe('Statistic order by monthly', () => {
    const mockStatisticResponse = {
      month: '2025 - 02',
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      refunedOrders: 0,
      grossRevenue: 0,
      netRevenue: 0,
      averageOrderValue: 0,
      topProducts: [],
      topCategories: [],
      topCustomers: [],
      paymentMethods: [],
    };
    // const responseStatisticMock = buildBaseResponse(StatusKey.SUCCESS, mockStatisticResponse);
    const validQuery = { month: 1, year: 2024 };
    it('should return monthly statistics when valid month and year provide', async () => {
      const statisticServiceSpy = jest
        .spyOn(statisticService, 'statisticOrderMonthly')
        .mockResolvedValue(mockStatisticResponse);
      const result = await statisticController.statisticOrderMonthly(validQuery);
      expect(statisticServiceSpy).toHaveBeenCalledWith(validQuery);
      expect(result).toEqual(mockStatisticResponse);
      expect(result.totalOrders).toEqual(0);
    });
    it('should throw Validation Errors when month is null/underfield/string provide', async () => {
      const invalidMonthQuery = [
        {
          month: null as unknown as number,
          year: 2024,
        },
        {
          month: undefined as unknown as number,
          year: 2024,
        },
        {
          month: '123' as unknown as number,
          year: 2024,
        },
      ];
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationErrors',
      };
      for (const invalidQuery of invalidMonthQuery) {
        const statisticServiceSpy = jest
          .spyOn(statisticService, 'statisticOrderMonthly')
          .mockRejectedValue(new TypedRpcException(rpcError));
        try {
          await statisticController.statisticOrderMonthly(invalidQuery);
        } catch (error) {
          assertRpcException(error, rpcError.code, rpcError);
        }
        expect(statisticServiceSpy).toHaveBeenCalledWith(invalidQuery);
      }
    });
    it('should throw Validation Errors when year is null/underfield/string provide', async () => {
      const invalidYearQuery = [
        {
          month: 1,
          year: null as unknown as number,
        },
        {
          month: 2,
          year: undefined as unknown as number,
        },
        {
          month: 3,
          year: '2024' as unknown as number,
        },
      ];
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationErrorrs',
      };
      for (const invalidQuery of invalidYearQuery) {
        const statisticServiceSpy = jest
          .spyOn(statisticService, 'statisticOrderMonthly')
          .mockRejectedValue(new TypedRpcException(rpcError));
        try {
          await statisticController.statisticOrderMonthly(invalidQuery);
        } catch (error) {
          assertRpcException(error, rpcError.code, rpcError);
        }
        expect(statisticServiceSpy).toHaveBeenCalledWith(invalidQuery);
      }
    });
    it('should throw Validation Errors when month is out of range', async () => {
      const invalidMonthRangeQuery = [
        { month: 0, year: 2024 },
        { month: 13, year: 2024 },
        { month: -1, year: 2024 },
      ];
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationError',
      };
      for (const invalidQuery of invalidMonthRangeQuery) {
        const statisticServiceSpy = jest
          .spyOn(statisticService, 'statisticOrderMonthly')
          .mockRejectedValue(new TypedRpcException(rpcError));
        try {
          await statisticController.statisticOrderMonthly(invalidQuery);
        } catch (error) {
          assertRpcException(error, rpcError.code, rpcError);
        }
        expect(statisticServiceSpy).toHaveBeenCalledWith(invalidQuery);
      }
    });

    it('should throw Validation Errors when year is out of valid range', async () => {
      const invalidYearRangeQuery = [
        { month: 1, year: 777 },
        { month: 2, year: 888 },
        { month: 3, year: 900 },
      ];
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationError',
      };
      for (const invalidQuery of invalidYearRangeQuery) {
        const statisticServiceSpy = jest
          .spyOn(statisticService, 'statisticOrderMonthly')
          .mockRejectedValue(new TypedRpcException(rpcError));
        try {
          await statisticController.statisticOrderMonthly(invalidQuery);
        } catch (error) {
          assertRpcException(error, rpcError.code, rpcError);
        }
        expect(statisticServiceSpy).toHaveBeenCalledWith(invalidQuery);
      }
    });
    it('should propagate error when service throw internal server error', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      const statisticServiceSpy = jest
        .spyOn(statisticService, 'statisticOrderMonthly')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await statisticController.statisticOrderMonthly(validQuery);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(statisticServiceSpy).toHaveBeenCalledWith(validQuery);
    });
    it('should propagate error when service throw conflict error', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.errors.conflictError',
      };
      const statisticServiceSpy = jest
        .spyOn(statisticService, 'statisticOrderMonthly')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await statisticController.statisticOrderMonthly(validQuery);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(statisticServiceSpy).toHaveBeenCalledWith(validQuery);
    });
    it('should propagate error when service throw service unavailable', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.serviceUnavailable',
      };
      const statisticServiceSpy = jest
        .spyOn(statisticService, 'statisticOrderMonthly')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await statisticController.statisticOrderMonthly(validQuery);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(statisticServiceSpy).toHaveBeenCalledWith(validQuery);
    });
  });
});
