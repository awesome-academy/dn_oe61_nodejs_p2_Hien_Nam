import { OrderCreatedPayload } from '@app/common/dto/product/payload/order-created.payload';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { of, throwError } from 'rxjs';
import { ChatworkService } from '../src/chatwork/chatwork.service';

describe('ChatworkService', () => {
  let service: ChatworkService;

  const mockLogger = {
    error: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatworkService,
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<ChatworkService>(ChatworkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    const mockOrderPayload: OrderCreatedPayload = {
      orderId: 12345,
      userId: 1,
      userName: 'John Doe',
      paymentMethod: 'Cash',
      totalAmount: 99.99,
      paymentStatus: 'PAID',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      lang: 'en',
    };

    const mockChatworkConfig = {
      baseApi: 'https://api.chatwork.com/v2',
      roomId: '123456789',
      apiToken: 'test-api-token',
    };

    const mockTranslatedMessages = {
      header: '[To:all] New Order Alert!',
      body: 'Order ID: 12345\nCustomer: John Doe\nPayment: Cash\nTotal: $99.99',
      footer:
        'Status: PAID\nCreated: 2024-01-01T10:00:00Z\nLink: https://your-system.com/orders/12345',
    };

    beforeEach(() => {
      mockConfigService.get
        .mockReturnValueOnce(mockChatworkConfig.baseApi)
        .mockReturnValueOnce(mockChatworkConfig.roomId)
        .mockReturnValueOnce(mockChatworkConfig.apiToken);

      mockI18nService.translate
        .mockReturnValueOnce(mockTranslatedMessages.header)
        .mockReturnValueOnce(mockTranslatedMessages.body)
        .mockReturnValueOnce(mockTranslatedMessages.footer);
    });

    it('should send message successfully with valid payload', async () => {
      const configSpy = jest.spyOn(mockConfigService, 'get');
      const i18nSpy = jest.spyOn(mockI18nService, 'translate');
      const httpSpy = jest
        .spyOn(mockHttpService, 'post')
        .mockReturnValue(of({ data: { message_id: '123' } }));

      await service.sendMessage(mockOrderPayload);

      expect(configSpy).toHaveBeenCalledWith('chatwork.baseApi');
      expect(configSpy).toHaveBeenCalledWith('chatwork.roomId');
      expect(configSpy).toHaveBeenCalledWith('chatwork.apiToken');

      expect(i18nSpy).toHaveBeenCalledWith('common.order.notification.chatwork.header', {
        lang: 'en',
        args: { title: 'New Order' },
      });
      expect(i18nSpy).toHaveBeenCalledWith('common.order.notification.chatwork.body', {
        lang: 'en',
        args: {
          orderId: 12345,
          userName: 'John Doe',
          paymentMethod: 'Cash',
          total: 99.99,
        },
      });
      expect(i18nSpy).toHaveBeenCalledWith('common.order.notification.chatwork.footer', {
        lang: 'en',
        args: {
          paymentStatus: 'PAID',
          createdAt: mockOrderPayload.createdAt,
          orderLink: 'https://your-system.com/orders/12345',
        },
      });

      expect(httpSpy).toHaveBeenCalledWith(
        'https://api.chatwork.com/v2/rooms/123456789/messages',
        expect.stringContaining('body='),
        {
          headers: {
            'X-ChatWorkToken': 'test-api-token',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
    });

    it('should handle Vietnamese language correctly', async () => {
      const vietnamesePayload: OrderCreatedPayload = {
        ...mockOrderPayload,
        lang: 'vi',
      };

      const vietnameseMessages = {
        header: '[To:all] Thông báo đơn hàng mới!',
        body: 'Mã đơn: 12345\nKhách hàng: John Doe\nThanh toán: Tiền mặt\nTổng: 99.99đ',
        footer: 'Trạng thái: ĐÃ THANH TOÁN\nTạo lúc: 2024-01-01T10:00:00Z',
      };

      mockI18nService.translate
        .mockReturnValueOnce(vietnameseMessages.header)
        .mockReturnValueOnce(vietnameseMessages.body)
        .mockReturnValueOnce(vietnameseMessages.footer);

      const i18nSpy = jest.spyOn(mockI18nService, 'translate');
      const httpSpy = jest
        .spyOn(mockHttpService, 'post')
        .mockReturnValue(of({ data: { message_id: '123' } }));

      await service.sendMessage(vietnamesePayload);

      expect(i18nSpy).toHaveBeenCalledWith('common.order.notification.chatwork.header', {
        lang: 'vi',
        args: { title: 'New Order' },
      });
      expect(i18nSpy).toHaveBeenCalledWith('common.order.notification.chatwork.body', {
        lang: 'vi',
        args: {
          orderId: 12345,
          userName: 'John Doe',
          paymentMethod: 'Cash',
          total: 99.99,
        },
      });
      expect(i18nSpy).toHaveBeenCalledWith('common.order.notification.chatwork.footer', {
        lang: 'vi',
        args: {
          paymentStatus: 'PAID',
          createdAt: vietnamesePayload.createdAt,
          orderLink: 'https://your-system.com/orders/12345',
        },
      });

      expect(httpSpy).toHaveBeenCalled();
    });

    it('should handle different payment methods and statuses', async () => {
      const paypalPayload: OrderCreatedPayload = {
        ...mockOrderPayload,
        paymentMethod: 'PayPal',
        paymentStatus: 'PENDING',
        totalAmount: 199.99,
      };

      const i18nSpy = jest.spyOn(mockI18nService, 'translate');
      const httpSpy = jest
        .spyOn(mockHttpService, 'post')
        .mockReturnValue(of({ data: { message_id: '123' } }));

      await service.sendMessage(paypalPayload);

      expect(i18nSpy).toHaveBeenCalledWith('common.order.notification.chatwork.body', {
        lang: 'en',
        args: {
          orderId: 12345,
          userName: 'John Doe',
          paymentMethod: 'PayPal',
          total: 199.99,
        },
      });
      expect(i18nSpy).toHaveBeenCalledWith('common.order.notification.chatwork.footer', {
        lang: 'en',
        args: {
          paymentStatus: 'PENDING',
          createdAt: paypalPayload.createdAt,
          orderLink: 'https://your-system.com/orders/12345',
        },
      });

      expect(httpSpy).toHaveBeenCalled();
    });

    it('should log error but not throw when HTTP request fails', async () => {
      const httpError = new Error('Network error');
      const httpSpy = jest
        .spyOn(mockHttpService, 'post')
        .mockReturnValue(throwError(() => httpError));
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      // Should not throw - method catches and logs the error
      await expect(service.sendMessage(mockOrderPayload)).resolves.not.toThrow();

      expect(httpSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[Send message chatwork errors]',
        `Details:: ${httpError.stack}`,
      );
    });

    it('should handle Chatwork API errors gracefully', async () => {
      const apiError = new Error('Chatwork API rate limit exceeded');
      const httpSpy = jest
        .spyOn(mockHttpService, 'post')
        .mockReturnValue(throwError(() => apiError));
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendMessage(mockOrderPayload);

      expect(httpSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[Send message chatwork errors]',
        `Details:: ${apiError.stack}`,
      );
    });

    it('should handle authentication errors gracefully', async () => {
      const authError = new Error('Invalid API token');
      const httpSpy = jest
        .spyOn(mockHttpService, 'post')
        .mockReturnValue(throwError(() => authError));
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendMessage(mockOrderPayload);

      expect(httpSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[Send message chatwork errors]',
        `Details:: ${authError.stack}`,
      );
    });

    it('should handle timeout errors gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      const httpSpy = jest
        .spyOn(mockHttpService, 'post')
        .mockReturnValue(throwError(() => timeoutError));
      const loggerSpy = jest.spyOn(mockLogger, 'error');

      await service.sendMessage(mockOrderPayload);

      expect(httpSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        '[Send message chatwork errors]',
        `Details:: ${timeoutError.stack}`,
      );
    });
  });
});
