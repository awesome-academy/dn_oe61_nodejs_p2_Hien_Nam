import { FilterGetOrdersRequest } from '@app/common/dto/product/requests/filter-get-orders.request';
import { OrderResponse } from '@app/common/dto/product/response/order-response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import { SortDirection } from '@app/common/enums/query.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from 'apps/product-service/generated/prisma';
import { OrderController } from '../src/order/order.controller';
import { OrderService } from '../src/order/order.service';
import { I18nService } from 'nestjs-i18n';
import { AuthRoles } from '@app/common/decorators/auth-role.decorator';

describe('OrderController - getOrders', () => {
  let controller: OrderController;
  let orderService: OrderService;

  const mockOrderResponse: OrderResponse = {
    id: 1,
    userId: 1,
    status: OrderStatus.PENDING,
    paymentMethod: PaymentMethodEnum.CASH,
    paymentStatus: PaymentStatus.PENDING,
    totalPrice: 100000,
    deliveryAddress: '123 Main St',
    note: 'Test order',
    createdAt: new Date(),
    items: [
      {
        id: 1,
        productVariantId: 1,
        quantity: 2,
        productName: 'Product 1',
        productSize: 'M',
        price: 50000,
        note: 'Item note',
      },
    ],
  };

  const mockPaginationResult = {
    items: [mockOrderResponse],
    paginations: {
      currentPage: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
      itemsOnPage: 1,
    },
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: {
            getOrders: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: { translate: jest.fn() },
        },
      ],
    })
      .overrideGuard(AuthRoles)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrders', () => {
    it('should return orders list successfully with default filter', async () => {
      // Arrange
      const filter: FilterGetOrdersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };

      const response = buildBaseResponse(StatusKey.SUCCESS, mockPaginationResult);
      const getOrdersSpy = jest.spyOn(orderService, 'getOrders').mockResolvedValue(response);

      // Act
      const result = await controller.getOrders(filter);

      // Assert
      expect(getOrdersSpy).toHaveBeenCalledWith(filter);
      expect(getOrdersSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(response);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data?.items).toBeDefined();
    });

    it('should return orders with full filter parameters', async () => {
      // Arrange
      const filter: FilterGetOrdersRequest = {
        page: 2,
        pageSize: 20,
        statuses: [OrderStatus.CONFIRMED],
        paymentStatuses: [PaymentStatus.PENDING],
        methods: [PaymentMethodEnum.CASH],
        sortBy: 'createdAt',
        direction: SortDirection.DESC,
      };
      const response = buildBaseResponse(StatusKey.SUCCESS, mockPaginationResult);
      const getOrdersSpy = jest.spyOn(orderService, 'getOrders').mockResolvedValue(response);

      // Act
      const result = await controller.getOrders(filter);

      // Assert
      expect(getOrdersSpy).toHaveBeenCalledWith(filter);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.paginations?.currentPage).toBe(1);
      expect(result.data?.paginations?.totalPages).toBe(1);
    });

    it('should return empty list when no orders found', async () => {
      // Arrange
      const filter: FilterGetOrdersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };
      const empty = {
        items: [],
        paginations: {
          currentPage: 1,
          itemsOnPage: 0,
          totalItems: 0,
          pageSize: 10,
          totalPages: 1,
        },
      };
      const mockEmpty = buildBaseResponse(StatusKey.SUCCESS, empty);
      const getOrdersSpy = jest.spyOn(orderService, 'getOrders').mockResolvedValue(mockEmpty);

      // Act
      const result = await controller.getOrders(filter);

      // Assert
      expect(getOrdersSpy).toHaveBeenCalledWith(filter);
      expect(result.data?.items).toHaveLength(0);
    });

    it('should handle service internal error', async () => {
      // Arrange
      const filter: FilterGetOrdersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      const getOrdersSpy = jest
        .spyOn(orderService, 'getOrders')
        .mockRejectedValue(new TypedRpcException(rpcError));

      // Act & Assert
      try {
        await controller.getOrders(filter);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(getOrdersSpy).toHaveBeenCalledWith(filter);
      expect(getOrdersSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle database connection error', async () => {
      // Arrange
      const filter: FilterGetOrdersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.serviceUnavailabble',
      };
      const getOrdersSpy = jest
        .spyOn(orderService, 'getOrders')
        .mockRejectedValue(new TypedRpcException(rpcError));

      // Act & Assert
      try {
        await controller.getOrders(filter);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(getOrdersSpy).toHaveBeenCalledWith(filter);
    });

    it('should handle validation error', async () => {
      // Arrange
      const invalidFilter = {
        page: -1,
        pageSize: 0,
      } as FilterGetOrdersRequest;
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationError',
      };
      const getOrdersSpy = jest
        .spyOn(orderService, 'getOrders')
        .mockRejectedValue(new TypedRpcException(rpcError));

      // Act & Assert
      try {
        await controller.getOrders(invalidFilter);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(getOrdersSpy).toHaveBeenCalledWith(invalidFilter);
    });

    it('should handle timeout error', async () => {
      // Arrange
      const filter: FilterGetOrdersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.serviceUnavailable',
      };
      const getOrdersSpy = jest
        .spyOn(orderService, 'getOrders')
        .mockRejectedValue(new TypedRpcException(rpcError));

      // Act & Assert
      try {
        await controller.getOrders(filter);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(getOrdersSpy).toHaveBeenCalledWith(filter);
    });

    it('should handle paginated results correctly', async () => {
      // Arrange
      const filter: FilterGetOrdersRequest = {
        page: 2,
        pageSize: 5,
        direction: SortDirection.ASC,
      };
      const paginatedResult = {
        items: [
          mockOrderResponse,
          { ...mockOrderResponse, id: 2 },
          { ...mockOrderResponse, id: 3 },
        ],
        paginations: {
          currentPage: 2,
          pageSize: 5,
          totalItems: 15,
          totalPages: 3,
          itemsOnPage: 3,
        },
      };
      const getOrdersSpy = jest
        .spyOn(orderService, 'getOrders')
        .mockResolvedValue(buildBaseResponse(StatusKey.SUCCESS, paginatedResult));
      // Act
      const result = await controller.getOrders(filter);
      // Assert
      expect(getOrdersSpy).toHaveBeenCalledWith(filter);
      expect(result.data?.items).toHaveLength(3);
      expect(result.data?.paginations?.currentPage).toBe(2);
      expect(result.data?.paginations?.totalPages).toBe(3);
    });

    it('should handle filter with multiple statuses', async () => {
      // Arrange
      const filter: FilterGetOrdersRequest = {
        page: 1,
        pageSize: 10,
        statuses: [OrderStatus.PENDING, OrderStatus.CANCELLED],
        paymentStatuses: [PaymentStatus.PENDING],
        direction: SortDirection.ASC,
      };
      const response = buildBaseResponse(StatusKey.SUCCESS, mockPaginationResult);
      const getOrdersSpy = jest.spyOn(orderService, 'getOrders').mockResolvedValue(response);

      // Act
      const result = await controller.getOrders(filter);

      // Assert
      expect(getOrdersSpy).toHaveBeenCalledWith(filter);
      expect(result).toEqual(response);
    });
  });
});
