import { AddProductCartRequest } from '@app/common/dto/product/requests/add-product-cart.request';
import { AddProductCartPayload } from '@app/common/dto/product/requests/add-product-payload';
import { DeleteProductCartPayload } from '@app/common/dto/product/requests/delete-product-cart-payload';
import { DeleteProductCartRequest } from '@app/common/dto/product/requests/delete-product-cart.request';
import { CartSummaryResponse } from '@app/common/dto/product/response/cart-summary.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { AccessTokenPayload } from '@app/common/interfaces/token-payload';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from '../src/cart/cart.controller';
import { CartService } from '../src/cart/cart.service';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { GetCartRequest } from '@app/common/dto/product/requests/get-cart.request';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { I18nService } from 'nestjs-i18n';
import { Reflector } from '@nestjs/core';
const mockI18nService = {
  translate: jest.fn().mockReturnValue('Mock translation'),
};

const mockReflector = {
  get: jest.fn(),
  getAll: jest.fn(),
  getAllAndMerge: jest.fn(),
  getAllAndOverride: jest.fn(),
};
describe('CartController', () => {
  let controller: CartController;
  let service: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        CartService,
        {
          provide: CartService,
          useValue: {
            addProductCart: jest.fn(),
            deleteProductCart: jest.fn(),
            getCart: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();
    controller = module.get<CartController>(CartController);
    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addProductCart', () => {
    const user = {
      id: 123,
    } as unknown as AccessTokenPayload;
    const payload: AddProductCartPayload = {
      productVariantId: 10,
      quantity: 2,
    };
    const dto: AddProductCartRequest = { userId: 123, productVariantId: 10, quantity: 2 };
    const mockCartSummary: CartSummaryResponse = {
      cartId: 1,
      userId: 5,
      cartItems: [
        {
          id: 1,
          quantity: 810,
          productVariant: {
            id: 1,
            price: 20000,
          },
        },
      ],
      totalQuantity: 810,
      totalAmount: 16200000,
    };
    const successResp: BaseResponse<CartSummaryResponse> = buildBaseResponse(
      StatusKey.SUCCESS,
      mockCartSummary,
    );

    it('should add product to cart successfully', async () => {
      const addProductCartSpy = jest
        .spyOn(service, 'addProductCart')
        .mockResolvedValue(successResp);
      const result = await controller.addProductCart(user, payload);
      expect(addProductCartSpy).toHaveBeenCalledWith(dto);
      expect(result).toEqual(successResp);
    });

    it('should propagate unauthorized error when user id is missing', async () => {
      const noIdUser = {} as AccessTokenPayload;
      const dtoMissing: AddProductCartRequest = {
        userId: undefined as unknown as number,
        productVariantId: 10,
        quantity: 2,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      };

      const addProductCartSpy = jest
        .spyOn(service, 'addProductCart')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.addProductCart(noIdUser, payload);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(addProductCartSpy).toHaveBeenCalledWith(dtoMissing);
    });

    it('should propagate error quantity not enough from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.product.quantityNotEnough',
      };
      const addProductCartSpy = jest
        .spyOn(service, 'addProductCart')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.addProductCart(user, payload);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(addProductCartSpy).toHaveBeenCalledWith(dto);
    });

    it('should propagate error product not found from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.product.notFound',
      };
      const addProductCartSpy = jest
        .spyOn(service, 'addProductCart')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.addProductCart(user, payload);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(addProductCartSpy).toHaveBeenCalledWith(dto);
    });
  });

  describe('deleteProductCart', () => {
    const user = {
      id: 123,
    } as unknown as AccessTokenPayload;
    const payload: DeleteProductCartPayload = {
      productVariantIds: [10],
    };
    const dto: DeleteProductCartRequest = { userId: 123, productVariantIds: [10] };
    const mockCartSummary: CartSummaryResponse = {
      cartId: 1,
      userId: 5,
      cartItems: [
        {
          id: 1,
          quantity: 810,
          productVariant: {
            id: 1,
            price: 20000,
          },
        },
      ],
      totalQuantity: 810,
      totalAmount: 16200000,
    };
    const successResp: BaseResponse<CartSummaryResponse> = buildBaseResponse(
      StatusKey.SUCCESS,
      mockCartSummary,
    );

    it('should delete product in cart successfully', async () => {
      const deleteProductCartSpy = jest
        .spyOn(service, 'deleteProductCart')
        .mockResolvedValue(successResp);
      const result = await controller.deleteProductCart(user, payload);
      expect(deleteProductCartSpy).toHaveBeenCalledWith(dto);
      expect(result).toEqual(successResp);
    });

    it('should propagate unauthorized error when user id is missing', async () => {
      const noIdUser = {} as AccessTokenPayload;
      const dtoMissing: DeleteProductCartRequest = {
        userId: undefined as unknown as number,
        productVariantIds: [10],
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.error.unauthorized',
      };

      const deleteProductCartSpy = jest
        .spyOn(service, 'deleteProductCart')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.deleteProductCart(noIdUser, payload);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
      }
      expect(deleteProductCartSpy).toHaveBeenCalledWith(dtoMissing);
    });
    it('should propagate error cart not found from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.cart.notFound',
      };
      const deleteProductCartSpy = jest
        .spyOn(service, 'deleteProductCart')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.deleteProductCart(user, payload);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.NOT_FOUND);
      }
      expect(deleteProductCartSpy).toHaveBeenCalledWith(dto);
    });
    it('should propagate error some product not found from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.product.someProductNotExist',
      };
      const deleteProductCartSpy = jest
        .spyOn(service, 'deleteProductCart')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.deleteProductCart(user, payload);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.NOT_FOUND);
      }
      expect(deleteProductCartSpy).toHaveBeenCalledWith(dto);
    });
  });

  describe('getCart', () => {
    const user = {
      id: 123,
    } as unknown as AccessTokenPayload;
    const dto: GetCartRequest = { userId: 123 };
    const mockCartSummary: CartSummaryResponse = {
      cartId: 1,
      userId: 123,
      cartItems: [
        {
          id: 1,
          quantity: 5,
          productVariant: {
            id: 10,
            price: 25000,
          },
        },
        {
          id: 2,
          quantity: 3,
          productVariant: {
            id: 20,
            price: 15000,
          },
        },
      ],
      totalQuantity: 8,
      totalAmount: 170000,
    };
    const successResp: BaseResponse<CartSummaryResponse> = buildBaseResponse(
      StatusKey.SUCCESS,
      mockCartSummary,
    );

    it('should get cart successfully', async () => {
      const getCartSpy = jest.spyOn(service, 'getCart').mockResolvedValue(successResp);
      const result = await controller.getCart(user);
      expect(getCartSpy).toHaveBeenCalledWith(dto);
      expect(result).toEqual(successResp);
    });

    it('should return empty cart when no items exist', async () => {
      const emptyCartSummary: CartSummaryResponse = {
        userId: 123,
        cartItems: [],
        totalQuantity: 0,
        totalAmount: 0,
      };
      const emptyCartResp: BaseResponse<CartSummaryResponse> = buildBaseResponse(
        StatusKey.SUCCESS,
        emptyCartSummary,
      );
      const getCartSpy = jest.spyOn(service, 'getCart').mockResolvedValue(emptyCartResp);
      const result = await controller.getCart(user);
      expect(getCartSpy).toHaveBeenCalledWith(dto);
      expect(result).toEqual(emptyCartResp);
      expect(result.data?.cartItems).toHaveLength(0);
      expect(result.data?.totalQuantity).toBe(0);
      expect(result.data?.totalAmount).toBe(0);
    });

    it('should propagate unauthorized error when user id is missing', async () => {
      const noIdUser = {} as AccessTokenPayload;
      const dtoMissing: GetCartRequest = {
        userId: undefined as unknown as number,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.errors.unauthorized',
      };

      const getCartSpy = jest
        .spyOn(service, 'getCart')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.getCart(noIdUser);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.UNAUTHORIZED);
      }
      expect(getCartSpy).toHaveBeenCalledWith(dtoMissing);
    });

    it('should propagate database error from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.errors.rowNotFound',
      };
      const getCartSpy = jest
        .spyOn(service, 'getCart')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.getCart(user);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.CONFLICT);
      }
      expect(getCartSpy).toHaveBeenCalledWith(dto);
    });

    it('should propagate validation error from service', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationError',
      };
      const getCartSpy = jest
        .spyOn(service, 'getCart')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.getCart(user);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.BAD_REQUEST);
      }
      expect(getCartSpy).toHaveBeenCalledWith(dto);
    });
  });
});
