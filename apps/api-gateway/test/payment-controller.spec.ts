import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { RetryPaymentRequest } from '@app/common/dto/product/requests/retry-payment.requqest';
import { PaymentInfoResponse } from '@app/common/dto/product/response/order-response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { AccessTokenPayload } from '@app/common/interfaces/token-payload';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../src/payment/payment.service';
import { PaymentController } from '../src/payment/paymet.controller';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: PaymentService;
  let moduleRef: TestingModule;

  const mockPaymentService = {
    retryPayment: jest.fn(),
  };

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    controller = moduleRef.get<PaymentController>(PaymentController);
    paymentService = moduleRef.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retryPayment', () => {
    const mockUser: AccessTokenPayload = {
      id: 1,
      email: 'test@example.com',
      role: 'USER',
    };

    const mockOrderId = 123;
    const mockLang: SupportedLocalesType = 'en';

    const mockPaymentInfoResponse: PaymentInfoResponse = {
      qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
      expiredAt: '15 minutes remaining',
    };

    const mockSuccessResponse: BaseResponse<PaymentInfoResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockPaymentInfoResponse,
    };

    const expectedDto: RetryPaymentRequest = {
      userId: mockUser.id,
      orderId: mockOrderId,
      lang: mockLang,
    };

    it('should retry payment successfully with valid parameters', async () => {
      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.retryPayment(mockUser, mockOrderId, mockLang);

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(mockPaymentInfoResponse);
      expect(result.data!.qrCodeUrl).toBe('https://checkout.payos.vn/web/abc123');
      expect(result.data!.expiredAt).toBe('15 minutes remaining');
    });

    it('should retry payment successfully with Vietnamese language', async () => {
      const viLang: SupportedLocalesType = 'vi';
      const expectedViDto: RetryPaymentRequest = {
        userId: mockUser.id,
        orderId: mockOrderId,
        lang: viLang,
      };

      const viPaymentInfoResponse: PaymentInfoResponse = {
        qrCodeUrl: 'https://checkout.payos.vn/web/abc123',
        expiredAt: 'Còn lại 15 phút',
      };

      const viSuccessResponse: BaseResponse<PaymentInfoResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: viPaymentInfoResponse,
      };

      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockResolvedValue(viSuccessResponse);

      const result = await controller.retryPayment(mockUser, mockOrderId, viLang);

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedViDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(viSuccessResponse);
      expect(result.data!.expiredAt).toBe('Còn lại 15 phút');
    });

    it('should handle different user IDs correctly', async () => {
      const differentUser: AccessTokenPayload = {
        id: 999,
        email: 'different@example.com',
        role: 'USER',
      };

      const expectedDifferentDto: RetryPaymentRequest = {
        userId: differentUser.id,
        orderId: mockOrderId,
        lang: mockLang,
      };

      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.retryPayment(differentUser, mockOrderId, mockLang);

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedDifferentDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle different order IDs correctly', async () => {
      const differentOrderId = 456;
      const expectedDifferentDto: RetryPaymentRequest = {
        userId: mockUser.id,
        orderId: differentOrderId,
        lang: mockLang,
      };

      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.retryPayment(mockUser, differentOrderId, mockLang);

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedDifferentDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle admin user role correctly', async () => {
      const adminUser: AccessTokenPayload = {
        id: 1,
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      const expectedAdminDto: RetryPaymentRequest = {
        userId: adminUser.id,
        orderId: mockOrderId,
        lang: mockLang,
      };

      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.retryPayment(adminUser, mockOrderId, mockLang);

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedAdminDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle large order ID numbers', async () => {
      const largeOrderId = 999999999;
      const expectedLargeDto: RetryPaymentRequest = {
        userId: mockUser.id,
        orderId: largeOrderId,
        lang: mockLang,
      };
      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockResolvedValue(mockSuccessResponse);
      const result = await controller.retryPayment(mockUser, largeOrderId, mockLang);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedLargeDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle zero order ID', async () => {
      const zeroOrderId = 0;
      const expectedZeroDto: RetryPaymentRequest = {
        userId: mockUser.id,
        orderId: zeroOrderId,
        lang: mockLang,
      };

      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.retryPayment(mockUser, zeroOrderId, mockLang);

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedZeroDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle undefined language header gracefully', async () => {
      const undefinedLang = undefined as unknown as SupportedLocalesType;
      const expectedUndefinedDto: RetryPaymentRequest = {
        userId: mockUser.id,
        orderId: mockOrderId,
        lang: undefinedLang,
      };

      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.retryPayment(mockUser, mockOrderId, undefinedLang);

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedUndefinedDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should propagate UnauthorizedException from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };
      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockRejectedValue(new TypedRpcException(rpcError));

      await expect(controller.retryPayment(mockUser, mockOrderId, mockLang)).rejects.toThrow(
        TypedRpcException,
      );

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFoundException from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      };
      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockRejectedValue(new TypedRpcException(rpcError));

      await expect(controller.retryPayment(mockUser, mockOrderId, mockLang)).rejects.toThrow(
        TypedRpcException,
      );

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
    });

    it('should propagate internal server error from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockRejectedValue(new TypedRpcException(rpcError));

      await expect(controller.retryPayment(mockUser, mockOrderId, mockLang)).rejects.toThrow(
        TypedRpcException,
      );
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle service returning null response', async () => {
      const nullResponse = null as unknown as BaseResponse<PaymentInfoResponse>;
      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockResolvedValue(nullResponse);

      const result = await controller.retryPayment(mockUser, mockOrderId, mockLang);

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle service returning undefined response', async () => {
      const undefinedResponse = undefined as unknown as BaseResponse<PaymentInfoResponse>;
      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockResolvedValue(undefinedResponse);

      const result = await controller.retryPayment(mockUser, mockOrderId, mockLang);

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should handle user with minimal token payload', async () => {
      const minimalUser: AccessTokenPayload = {
        id: 1,
        email: 'minimal@example.com',
        role: 'USER',
      };

      const expectedMinimalDto: RetryPaymentRequest = {
        userId: minimalUser.id,
        orderId: mockOrderId,
        lang: mockLang,
      };

      const paymentServiceRetryPaymentSpy = jest
        .spyOn(paymentService, 'retryPayment')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.retryPayment(minimalUser, mockOrderId, mockLang);

      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledWith(expectedMinimalDto);
      expect(paymentServiceRetryPaymentSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });
  });
});
