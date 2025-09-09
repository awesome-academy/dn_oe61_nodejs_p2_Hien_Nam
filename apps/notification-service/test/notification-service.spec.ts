import { PayLoadJWTComplete } from '@app/common/dto/user/sign-token.dto';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../src/notification-service.service';
import { MailQueueService } from '../src/mail/mail-queue.service';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { RpcException } from '@nestjs/microservices';
import { PRODUCT_SERVICE } from '@app/common';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { Decimal } from '@prisma/client/runtime/library';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';

describe('NotificationService', () => {
  let service: NotificationService;
  let mailQueueService: MailQueueService;
  let configService: ConfigService;

  const mockMailQueueService = {
    enqueueMailJob: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    write: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockProductServiceClient = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: MailQueueService,
          useValue: mockMailQueueService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PRODUCT_SERVICE,
          useValue: mockProductServiceClient,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    mailQueueService = module.get<MailQueueService>(MailQueueService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmailComplete', () => {
    const mockPayload: PayLoadJWTComplete = {
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        userName: 'testuser',
        status: 'ACTIVE',
        role: 'USER',
        deletedAt: null,
      },
      token: 'some-jwt-token',
    };

    it('should throw TypedRpcException if data is not provided', async () => {
      await expect(
        service.sendEmailComplete(null as unknown as PayLoadJWTComplete),
      ).rejects.toThrow(TypedRpcException);
    });

    it('should call sendEmail and return a success message', async () => {
      const frontendUrl = 'http://localhost:3000';
      (configService.get as jest.Mock).mockReturnValue(frontendUrl);
      (mailQueueService.enqueueMailJob as jest.Mock).mockResolvedValue(undefined);

      const result = await service.sendEmailComplete(mockPayload);

      expect(mockConfigService.get).toHaveBeenCalledWith('app.frontendUrl');
      expect(mockMailQueueService.enqueueMailJob).toHaveBeenCalled();
      expect(result).toBe('common.auth.action.sendEmailComplete.complete');
    });

    it('should throw RpcException if mailQueueService fails', async () => {
      const frontendUrl = 'http://localhost:3000';
      (configService.get as jest.Mock).mockReturnValue(frontendUrl);
      (mailQueueService.enqueueMailJob as jest.Mock).mockRejectedValue(new Error('Queue Error'));

      await expect(service.sendEmailComplete(mockPayload)).rejects.toThrow(RpcException);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getShareProduct', () => {
    const createMockProduct = (): UserProductDetailResponse => ({
      id: 1,
      name: 'Test Product',
      skuId: 'SKU123',
      description: 'Test Description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(25.99),
      quantity: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: undefined,
      images: [],
      variants: [],
      categories: [],
      reviews: [],
    });

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'frontendUrl':
            return 'http://localhost:3000';
          case 'facebook.appID':
            return '123456789';
          case 'facebook.sharePostUrl':
            return 'https://www.facebook.com/dialog/share';
          case 'facebook.shareMessengerUrl':
            return 'https://www.facebook.com/dialog/send';
          default:
            return undefined;
        }
      });
    });

    it('should throw TypedRpcException if product is null', () => {
      expect(() => service.getShareProduct(null as unknown as UserProductDetailResponse)).toThrow(
        TypedRpcException,
      );
    });

    it('should throw TypedRpcException if product is undefined', () => {
      expect(() =>
        service.getShareProduct(undefined as unknown as UserProductDetailResponse),
      ).toThrow(TypedRpcException);
    });

    it('should return share URLs successfully', () => {
      const mockProduct = createMockProduct();
      const result = service.getShareProduct(mockProduct);

      expect(result).toHaveProperty('messengerShare');
      expect(result).toHaveProperty('facebookShare');
      expect(result).toHaveProperty('productUrl');
      expect(result.productUrl).toContain('/user/products/SKU123');
    });

    it('should return URLs even with empty config (no validation in current implementation)', () => {
      // Mock config to return empty strings
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'frontendUrl':
            return '';
          case 'facebook.appID':
            return '';
          case 'facebook.sharePostUrl':
            return '';
          case 'facebook.shareMessengerUrl':
            return '';
          default:
            return '';
        }
      });

      const mockProduct = createMockProduct();
      const result = service.getShareProduct(mockProduct);

      // Current implementation doesn't validate empty URLs, just returns them
      expect(result).toHaveProperty('messengerShare');
      expect(result).toHaveProperty('facebookShare');
      expect(result).toHaveProperty('productUrl');
    });

    it('should generate correct URLs with product information', () => {
      const mockProduct = createMockProduct();
      mockProduct.name = 'Special Product';
      mockProduct.basePrice = new Decimal(99.99);

      const result = service.getShareProduct(mockProduct);

      expect(result.facebookShare).toContain('quote=');
      expect(result.messengerShare).toContain('facebook.com/dialog/send');
      expect(result.facebookShare).toContain('facebook.com/dialog/share');
    });

    it('should handle products with special characters in name', () => {
      const mockProduct = createMockProduct();
      mockProduct.name = 'Product & Special "Chars"';

      const result = service.getShareProduct(mockProduct);

      expect(result).toHaveProperty('messengerShare');
      expect(result).toHaveProperty('facebookShare');
      expect(result).toHaveProperty('productUrl');
    });
  });
});
