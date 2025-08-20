import { AddProductCartRequest } from '@app/common/dto/product/requests/add-product-cart.request';
import { AddProductPayload } from '@app/common/dto/product/requests/add-product-payload';
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
          },
        },
      ],
    }).compile();

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
    const payload: AddProductPayload = {
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
});
