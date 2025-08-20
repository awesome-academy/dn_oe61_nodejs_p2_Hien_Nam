import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { OrderPayload } from '@app/common/dto/product/requests/order-payload.request';
import { OrderRequest } from '@app/common/dto/product/requests/order-request';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { AccessTokenPayload } from '@app/common/interfaces/token-payload';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from '../src/order/order.controller';
import { OrderService } from '../src/order/order.service';
import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import {
  OrderResponse,
  PaymentInfoResponse,
} from '@app/common/dto/product/response/order-response';
import { PaymentStatus } from 'apps/product-service/generated/prisma';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: OrderService;
  let moduleRef: TestingModule;

  const mockOrderService = {
    createOrder: jest.fn(),
  };

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    controller = moduleRef.get<OrderController>(OrderController);
    orderService = moduleRef.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const mockUser: AccessTokenPayload = {
      id: 1,
      email: 'test@example.com',
      role: 'USER',
    };

    const mockOrderPayload: OrderPayload = {
      deliveryAddress: '123 Test Street, Test City',
      paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
      items: [
        {
          productVariantId: 1,
          quantity: 2,
          note: 'abc',
        },
        {
          productVariantId: 2,
          quantity: 1,
        },
      ],
    };

    const mockLang: SupportedLocalesType = 'en';

    const mockPaymentInfo: PaymentInfoResponse = {
      qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
      expiredAt: '15 minutes remaining',
    };

    const mockOrderResponse: OrderResponse = {
      id: 1,
      userId: 1,
      deliveryAddress: '123 Test Street, Test City',
      paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
      paymentStatus: PaymentStatus.PENDING,
      status: 'PENDING',
      totalPrice: 67.48,
      items: [
        {
          id: 1,
          productVariantId: 1,
          quantity: 2,
          price: 25.99,
          note: 'abc',
          productName: 'Pizza hawa',
          productSize: 'S',
        },
        {
          id: 2,
          productVariantId: 2,
          quantity: 1,
          price: 15.5,
          note: 'abc',
          productName: 'Pizza ga',
          productSize: 'S',
        },
      ],
      paymentInfo: mockPaymentInfo,
      note: 'abc',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    };

    const mockSuccessResponse: BaseResponse<OrderResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockOrderResponse,
    };

    const expectedDto: OrderRequest = {
      userId: mockUser.id,
      ...mockOrderPayload,
      lang: mockLang,
    };

    it('should create order successfully with valid parameters', async () => {
      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createOrder(mockUser, mockOrderPayload, mockLang);

      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedDto);
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(mockOrderResponse);
      expect(result.data!.id).toBe(1);
      expect(result.data!.userId).toBe(mockUser.id);
      expect(result.data!.paymentMethod).toBe(PaymentMethodEnum.BANK_TRANSFER);
      expect(result.data!.items).toHaveLength(2);
    });

    it('should create order successfully with CASH payment method', async () => {
      const cashOrderPayload: OrderPayload = {
        ...mockOrderPayload,
        paymentMethod: PaymentMethodEnum.CASH,
      };

      const cashOrderResponse: OrderResponse = {
        ...mockOrderResponse,
        paymentMethod: PaymentMethodEnum.CASH,
        paymentStatus: PaymentStatus.UNPAID,
        paymentInfo: undefined,
      };

      const cashSuccessResponse: BaseResponse<OrderResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: cashOrderResponse,
      };

      const expectedCashDto: OrderRequest = {
        userId: mockUser.id,
        ...cashOrderPayload,
        lang: mockLang,
      };

      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockResolvedValue(cashSuccessResponse);

      const result = await controller.createOrder(mockUser, cashOrderPayload, mockLang);

      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedCashDto);
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(cashSuccessResponse);
      expect(result.data!.paymentMethod).toBe(PaymentMethodEnum.CASH);
      expect(result.data!.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect(result.data!.paymentInfo).toBeUndefined();
    });

    it('should create order successfully with Vietnamese language', async () => {
      const viLang: SupportedLocalesType = 'vi';
      const expectedViDto: OrderRequest = {
        userId: mockUser.id,
        ...mockOrderPayload,
        lang: viLang,
      };

      const viOrderResponse: OrderResponse = {
        ...mockOrderResponse,
        paymentInfo: {
          qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
          expiredAt: 'Còn lại 15 phút',
        },
      };

      const viSuccessResponse: BaseResponse<OrderResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: viOrderResponse,
      };

      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockResolvedValue(viSuccessResponse);

      const result = await controller.createOrder(mockUser, mockOrderPayload, viLang);

      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedViDto);
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(viSuccessResponse);
      expect(result.data!.paymentInfo!.expiredAt).toBe('Còn lại 15 phút');
    });

    it('should handle different user IDs correctly', async () => {
      const differentUser: AccessTokenPayload = {
        id: 999,
        email: 'different@example.com',
        role: 'USER',
      };

      const expectedDifferentDto: OrderRequest = {
        userId: differentUser.id,
        ...mockOrderPayload,
        lang: mockLang,
      };

      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createOrder(differentUser, mockOrderPayload, mockLang);

      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedDifferentDto);
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle admin user role correctly', async () => {
      const adminUser: AccessTokenPayload = {
        id: 1,
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      const expectedAdminDto: OrderRequest = {
        userId: adminUser.id,
        ...mockOrderPayload,
        lang: mockLang,
      };

      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createOrder(adminUser, mockOrderPayload, mockLang);

      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedAdminDto);
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle single item order', async () => {
      const singleItemPayload: OrderPayload = {
        deliveryAddress: '456 Single Street, Single City',
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        items: [
          {
            productVariantId: 1,
            quantity: 1,
          },
        ],
      };

      const expectedSingleDto: OrderRequest = {
        userId: mockUser.id,
        ...singleItemPayload,
        lang: mockLang,
      };

      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createOrder(mockUser, singleItemPayload, mockLang);

      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedSingleDto);
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle multiple items order', async () => {
      const multipleItemsPayload: OrderPayload = {
        deliveryAddress: '789 Multiple Street, Multiple City',
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        items: [
          { productVariantId: 1, quantity: 2 },
          { productVariantId: 2, quantity: 1 },
          { productVariantId: 3, quantity: 3 },
          { productVariantId: 4, quantity: 1 },
        ],
      };

      const expectedMultipleDto: OrderRequest = {
        userId: mockUser.id,
        ...multipleItemsPayload,
        lang: mockLang,
      };

      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createOrder(mockUser, multipleItemsPayload, mockLang);

      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedMultipleDto);
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle undefined language header gracefully', async () => {
      const undefinedLang = undefined as unknown as SupportedLocalesType;
      const expectedUndefinedDto: OrderRequest = {
        userId: mockUser.id,
        ...mockOrderPayload,
        lang: undefinedLang,
      };

      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createOrder(mockUser, mockOrderPayload, undefinedLang);

      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedUndefinedDto);
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should propagate UnauthorizedException from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };
      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.createOrder(mockUser, mockOrderPayload, mockLang);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedDto);
    });

    it('should propagate ValidationException from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.VALIDATION_ERROR,
        message: 'common.errors.validationError',
      };
      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.createOrder(mockUser, mockOrderPayload, mockLang);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedDto);
    });

    it('should propagate BadRequestException from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.product.productOutOfStock',
      };
      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.createOrder(mockUser, mockOrderPayload, mockLang);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedDto);
    });

    it('should propagate InternalServerError from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.createOrder(mockUser, mockOrderPayload, mockLang);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedDto);
    });

    it('should handle high quantity items', async () => {
      const highQuantityPayload: OrderPayload = {
        deliveryAddress: '999 High Quantity Street',
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        items: [
          {
            productVariantId: 1,
            quantity: 100,
          },
          {
            productVariantId: 2,
            quantity: 50,
          },
        ],
      };

      const expectedHighQuantityDto: OrderRequest = {
        userId: mockUser.id,
        ...highQuantityPayload,
        lang: mockLang,
      };

      const orderServiceCreateOrderSpy = jest
        .spyOn(orderService, 'createOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createOrder(mockUser, highQuantityPayload, mockLang);
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledWith(expectedHighQuantityDto);
      expect(orderServiceCreateOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });
  });
});
