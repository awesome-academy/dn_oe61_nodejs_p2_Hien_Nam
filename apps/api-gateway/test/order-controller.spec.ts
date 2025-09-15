import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { ConfirmOrderRequest } from '@app/common/dto/product/requests/confirm-order.request';
import { OrderPayload } from '@app/common/dto/product/requests/order-payload.request';
import { OrderRequest } from '@app/common/dto/product/requests/order-request';
import { RejectOrderRequest } from '@app/common/dto/product/requests/reject-order.request';

import {
  OrderResponse,
  PaymentInfoResponse,
} from '@app/common/dto/product/response/order-response';
import { RejectOrderResponse } from '@app/common/dto/product/response/reject-order.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { REJECT_ORDER_STATUS } from '@app/common/enums/order.enum';
import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { AccessTokenPayload } from '@app/common/interfaces/token-payload';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from '../src/order/order.controller';
import { OrderService } from '../src/order/order.service';
import { AuthRoles } from '@app/common/decorators/auth-role.decorator';
import { I18nService } from 'nestjs-i18n';
import { PaymentStatus } from 'apps/product-service/generated/prisma';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: OrderService;
  let moduleRef: TestingModule;

  const mockOrderService = {
    createOrder: jest.fn(),
    rejectOrder: jest.fn(),
    confirmOrder: jest.fn(),
  };

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
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

  describe('rejectOrder', () => {
    const mockUser: AccessTokenPayload = {
      id: 1,
      email: 'admin@example.com',
      role: 'ADMIN',
    };

    const orderId = 123;

    const mockRejectOrderResponse: RejectOrderResponse = {
      status: REJECT_ORDER_STATUS.SUCCESS,
      orderId: orderId,
      paymentMethod: PaymentMethodEnum.CASH,
      rejectedAt: new Date('2024-01-01T00:00:00Z'),
    };

    const mockSuccessResponse: BaseResponse<RejectOrderResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockRejectOrderResponse,
    };

    const expectedDto: RejectOrderRequest = {
      userId: mockUser.id,
      orderId: orderId,
    };

    it('should reject order successfully with valid parameters', async () => {
      const orderServiceRejectOrderSpy = jest
        .spyOn(orderService, 'rejectOrder')
        .mockResolvedValue(mockSuccessResponse);
      const result = await controller.rejectOrder(mockUser, orderId);
      expect(orderServiceRejectOrderSpy).toHaveBeenCalledWith(expectedDto);
      expect(orderServiceRejectOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(mockRejectOrderResponse);
      expect(result.data!.orderId).toBe(orderId);
      expect(result.data!.status).toBe(REJECT_ORDER_STATUS.SUCCESS);
    });

    it('should reject order with BANK_TRANSFER payment method and payout info', async () => {
      const bankTransferRejectResponse: RejectOrderResponse = {
        status: REJECT_ORDER_STATUS.SUCCESS,
        orderId: orderId,
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        rejectedAt: new Date('2024-01-01T00:00:00Z'),
        payoutInfo: {
          bankCode: '970422',
          toAccountNumber: '0000226940750',
          transactionCode: 'FT25251501202251',
          amountRefunded: 4000,
          userId: mockUser.id,
          userRejectId: mockUser.id,
        },
      };

      const bankTransferSuccessResponse: BaseResponse<RejectOrderResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: bankTransferRejectResponse,
      };

      const orderServiceRejectOrderSpy = jest
        .spyOn(orderService, 'rejectOrder')
        .mockResolvedValue(bankTransferSuccessResponse);

      const result = await controller.rejectOrder(mockUser, orderId);

      expect(orderServiceRejectOrderSpy).toHaveBeenCalledWith(expectedDto);
      expect(orderServiceRejectOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(bankTransferSuccessResponse);
      expect(result.data!.paymentMethod).toBe(PaymentMethodEnum.BANK_TRANSFER);
      expect(result.data!.payoutInfo).toBeDefined();
      expect(result.data!.payoutInfo!.amountRefunded).toBe(4000);
      expect(result.data!.payoutInfo!.bankCode).toBe('970422');
    });

    it('should handle different admin user IDs correctly', async () => {
      const differentAdmin: AccessTokenPayload = {
        id: 999,
        email: 'different-admin@example.com',
        role: 'ADMIN',
      };

      const expectedDifferentDto: RejectOrderRequest = {
        userId: differentAdmin.id,
        orderId: orderId,
      };

      const orderServiceRejectOrderSpy = jest
        .spyOn(orderService, 'rejectOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.rejectOrder(differentAdmin, orderId);

      expect(orderServiceRejectOrderSpy).toHaveBeenCalledWith(expectedDifferentDto);
      expect(orderServiceRejectOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle different order IDs correctly', async () => {
      const differentOrderId = 456;
      const expectedDifferentOrderDto: RejectOrderRequest = {
        userId: mockUser.id,
        orderId: differentOrderId,
      };

      const orderServiceRejectOrderSpy = jest
        .spyOn(orderService, 'rejectOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.rejectOrder(mockUser, differentOrderId);

      expect(orderServiceRejectOrderSpy).toHaveBeenCalledWith(expectedDifferentOrderDto);
      expect(orderServiceRejectOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle UNCHANGED status when order already rejected', async () => {
      const unchangedResponse: RejectOrderResponse = {
        status: REJECT_ORDER_STATUS.UNCHANGED,
        description: 'Order has been rejected',
        orderId: orderId,
      };

      const unchangedSuccessResponse: BaseResponse<RejectOrderResponse> = {
        statusKey: StatusKey.UNCHANGED,
        data: unchangedResponse,
      };

      const orderServiceRejectOrderSpy = jest
        .spyOn(orderService, 'rejectOrder')
        .mockResolvedValue(unchangedSuccessResponse);

      const result = await controller.rejectOrder(mockUser, orderId);

      expect(orderServiceRejectOrderSpy).toHaveBeenCalledWith(expectedDto);
      expect(orderServiceRejectOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(unchangedSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.UNCHANGED);
      expect(result.data!.status).toBe(REJECT_ORDER_STATUS.UNCHANGED);
      expect(result.data!.description).toBe('Order has been rejected');
    });

    it('should propagate UnauthorizedException from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };
      const orderServiceRejectOrderSpy = jest
        .spyOn(orderService, 'rejectOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.rejectOrder(mockUser, orderId);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceRejectOrderSpy).toHaveBeenCalledWith(expectedDto);
    });

    it('should propagate NotFound exception when order not found', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };
      const orderServiceRejectOrderSpy = jest
        .spyOn(orderService, 'rejectOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.rejectOrder(mockUser, orderId);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceRejectOrderSpy).toHaveBeenCalledWith(expectedDto);
    });

    it('should propagate BadRequest exception for invalid order state', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.payment.refunded',
      };
      const orderServiceRejectOrderSpy = jest
        .spyOn(orderService, 'rejectOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.rejectOrder(mockUser, orderId);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceRejectOrderSpy).toHaveBeenCalledWith(expectedDto);
    });

    it('should propagate InternalServerError from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      const orderServiceRejectOrderSpy = jest
        .spyOn(orderService, 'rejectOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.rejectOrder(mockUser, orderId);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceRejectOrderSpy).toHaveBeenCalledWith(expectedDto);
    });
  });

  describe('confirmOrder', () => {
    const mockUser: AccessTokenPayload = {
      id: 1,
      email: 'admin@example.com',
      role: 'ADMIN',
    };

    const orderId = 123;

    const mockConfirmOrderResponse: OrderResponse = {
      id: orderId,
      userId: mockUser.id,
      totalPrice: 5000,
      deliveryAddress: 'Da Nang city',
      paymentMethod: PaymentMethodEnum.CASH,
      paymentStatus: PaymentStatus.PAID,
      status: 'PENDING',
      note: 'No note',
      items: [
        {
          id: 1,
          productVariantId: 1,
          quantity: 2,
          price: 2500,
          productName: 'ABC',
          productSize: 'S',
          note: 'No note',
        },
      ],
      createdAt: new Date('2024-01-01T00:00:00Z'),
    };

    const mockSuccessResponse: BaseResponse<OrderResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockConfirmOrderResponse,
    };

    const expectedDto: ConfirmOrderRequest = {
      userId: mockUser.id,
      orderId: orderId,
    };

    it('should confirm order successfully with valid parameters', async () => {
      const orderServiceConfirmOrderSpy = jest
        .spyOn(orderService, 'confirmOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.confirmOrder(mockUser, orderId);

      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledWith(expectedDto);
      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(mockConfirmOrderResponse);
      expect(result.data!.id).toBe(orderId);
      expect(result.data!.userId).toBe(mockUser.id);
      expect(result.data!.paymentStatus).toBe(PaymentStatus.PAID);
    });

    it('should confirm order with BANK_TRANSFER payment method', async () => {
      const bankTransferOrderResponse: OrderResponse = {
        ...mockConfirmOrderResponse,
        paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
        paymentInfo: {
          qrCodeUrl: 'https://example.com/qr-code',
          expiredAt: '10 minutes left',
        },
      };

      const bankTransferSuccessResponse: BaseResponse<OrderResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: bankTransferOrderResponse,
      };

      const orderServiceConfirmOrderSpy = jest
        .spyOn(orderService, 'confirmOrder')
        .mockResolvedValue(bankTransferSuccessResponse);

      const result = await controller.confirmOrder(mockUser, orderId);

      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledWith(expectedDto);
      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(bankTransferSuccessResponse);
      expect(result.data!.paymentMethod).toBe(PaymentMethodEnum.BANK_TRANSFER);
      expect(result.data!.paymentInfo).toBeDefined();
      expect(result.data!.paymentInfo!.qrCodeUrl).toBe('https://example.com/qr-code');
    });

    it('should handle different admin user IDs correctly', async () => {
      const differentAdmin: AccessTokenPayload = {
        id: 999,
        email: 'different-admin@example.com',
        role: 'ADMIN',
      };

      const expectedDifferentDto: ConfirmOrderRequest = {
        userId: differentAdmin.id,
        orderId: orderId,
      };

      const orderServiceConfirmOrderSpy = jest
        .spyOn(orderService, 'confirmOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.confirmOrder(differentAdmin, orderId);

      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledWith(expectedDifferentDto);
      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle different order IDs correctly', async () => {
      const differentOrderId = 456;
      const expectedDifferentOrderDto: ConfirmOrderRequest = {
        userId: mockUser.id,
        orderId: differentOrderId,
      };

      const orderServiceConfirmOrderSpy = jest
        .spyOn(orderService, 'confirmOrder')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.confirmOrder(mockUser, differentOrderId);

      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledWith(expectedDifferentOrderDto);
      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle order with multiple items', async () => {
      const multiItemOrderResponse: OrderResponse = {
        ...mockConfirmOrderResponse,
        totalPrice: 10000,
        items: [
          {
            id: 1,
            productVariantId: 1,
            quantity: 2,
            price: 2500,
            productName: 'Test product 1',
            productSize: 'Test product 1 description',
            note: 'No note',
          },
          {
            id: 2,
            productVariantId: 2,
            quantity: 2,
            price: 2500,
            productName: 'Test product 2',
            productSize: 'Test product 2 description',
            note: 'No note',
          },
        ],
      };
      const multiItemSuccessResponse: BaseResponse<OrderResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: multiItemOrderResponse,
      };

      const orderServiceConfirmOrderSpy = jest
        .spyOn(orderService, 'confirmOrder')
        .mockResolvedValue(multiItemSuccessResponse);

      const result = await controller.confirmOrder(mockUser, orderId);

      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledWith(expectedDto);
      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(multiItemSuccessResponse);
      expect(result.data!.items).toHaveLength(2);
      expect(result.data!.totalPrice).toBe(10000);
    });

    it('should propagate UnauthorizedException from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };
      const orderServiceConfirmOrderSpy = jest
        .spyOn(orderService, 'confirmOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.confirmOrder(mockUser, orderId);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledWith(expectedDto);
    });

    it('should propagate NotFound exception when order not found', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };
      const orderServiceConfirmOrderSpy = jest
        .spyOn(orderService, 'confirmOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.confirmOrder(mockUser, orderId);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledWith(expectedDto);
    });

    it('should propagate BadRequest exception for invalid order state', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.order.alreadyConfirmed',
      };
      const orderServiceConfirmOrderSpy = jest
        .spyOn(orderService, 'confirmOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.confirmOrder(mockUser, orderId);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledWith(expectedDto);
    });

    it('should propagate Forbidden exception when user lacks permission', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.FORBIDDEN,
        message: 'common.guard.forbidden',
      };
      const orderServiceConfirmOrderSpy = jest
        .spyOn(orderService, 'confirmOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.confirmOrder(mockUser, orderId);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledWith(expectedDto);
    });

    it('should propagate InternalServerError from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      const orderServiceConfirmOrderSpy = jest
        .spyOn(orderService, 'confirmOrder')
        .mockRejectedValue(new TypedRpcException(rpcError));

      try {
        await controller.confirmOrder(mockUser, orderId);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(orderServiceConfirmOrderSpy).toHaveBeenCalledWith(expectedDto);
    });
  });
});
