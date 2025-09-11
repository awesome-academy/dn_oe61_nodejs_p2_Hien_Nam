import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { UserCleanupService } from '../../src/cron/user-cleanup.service';
import { USER_SERVICE } from '@app/common/constant/service.constant';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { CustomLogger } from '@app/common/logger/custom-logger.service';

describe('UserCleanupService', () => {
  let service: UserCleanupService;
  let userClient: jest.Mocked<ClientProxy>;
  let loggerService: jest.Mocked<CustomLogger>;

  const mockCleanupResult = {
    deletedCount: 3,
    message: 'Đã xóa 3 user hết hạn khỏi bảng.',
  };

  const mockEmptyResult = {
    deletedCount: 0,
    message: 'No users to delete.',
  };

  const mockUserClient = {
    send: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCleanupService,
        {
          provide: USER_SERVICE,
          useValue: mockUserClient,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UserCleanupService>(UserCleanupService);
    userClient = module.get(USER_SERVICE);
    loggerService = module.get(CustomLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupInactiveUsers', () => {
    it('should successfully cleanup inactive users', async () => {
      // Arrange
      userClient.send.mockReturnValue(of(mockCleanupResult));

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const logSpy = jest.spyOn(loggerService, 'log');
      const sendSpy = jest.spyOn(userClient, 'send');

      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenNthCalledWith(
        1,
        '🔄 Cron job cleanup-inactive-users bắt đầu chạy từ API Gateway...',
      );
      expect(logSpy).toHaveBeenNthCalledWith(
        2,
        `✅ Cleanup hoàn thành: ${mockCleanupResult.message}`,
      );

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith(UserMsgPattern.CLEANUP_INACTIVE_USERS, {});
    });

    it('should handle case when no users need to be deleted', async () => {
      // Arrange
      userClient.send.mockReturnValue(of(mockEmptyResult));

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const logSpy = jest.spyOn(loggerService, 'log');
      const sendSpy = jest.spyOn(userClient, 'send');
      const errorSpy = jest.spyOn(loggerService, 'error');

      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenNthCalledWith(
        1,
        '🔄 Cron job cleanup-inactive-users bắt đầu chạy từ API Gateway...',
      );
      expect(logSpy).toHaveBeenNthCalledWith(
        2,
        `✅ Cleanup hoàn thành: ${mockEmptyResult.message}`,
      );

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith(UserMsgPattern.CLEANUP_INACTIVE_USERS, {});

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle microservice communication error', async () => {
      // Arrange
      const errorMessage = 'Connection timeout';
      userClient.send.mockReturnValue(throwError(() => new Error(errorMessage)));

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const logSpy = jest.spyOn(loggerService, 'log');
      const errorSpy = jest.spyOn(loggerService, 'error');
      const sendSpy = jest.spyOn(userClient, 'send');

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        '🔄 Cron job cleanup-inactive-users bắt đầu chạy từ API Gateway...',
      );

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Lỗi khi chạy cleanup inactive users:',
        `Error: ${errorMessage}`,
      );

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith(UserMsgPattern.CLEANUP_INACTIVE_USERS, {});
    });

    it('should handle RPC error from microservice', async () => {
      // Arrange
      const rpcError = {
        code: 500,
        message: 'common.errors.internalServerError',
      };
      userClient.send.mockReturnValue(throwError(() => rpcError));

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const logSpy = jest.spyOn(loggerService, 'log');
      const errorSpy = jest.spyOn(loggerService, 'error');
      const sendSpy = jest.spyOn(userClient, 'send');

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        '🔄 Cron job cleanup-inactive-users bắt đầu chạy từ API Gateway...',
      );

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Lỗi khi chạy cleanup inactive users:',
        '[object Object]',
      );

      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle unexpected error type', async () => {
      // Arrange
      const unexpectedError = 'Unexpected string error';
      userClient.send.mockReturnValue(throwError(() => unexpectedError));

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const logSpy = jest.spyOn(loggerService, 'log');
      const errorSpy = jest.spyOn(loggerService, 'error');

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        '🔄 Cron job cleanup-inactive-users bắt đầu chạy từ API Gateway...',
      );

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Lỗi khi chạy cleanup inactive users:',
        unexpectedError,
      );
    });

    it('should handle null response from microservice', async () => {
      // Arrange
      userClient.send.mockReturnValue(of(null));

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const logSpy = jest.spyOn(loggerService, 'log');
      const errorSpy = jest.spyOn(loggerService, 'error');

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        '🔄 Cron job cleanup-inactive-users bắt đầu chạy từ API Gateway...',
      );
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Lỗi khi chạy cleanup inactive users:',
        "TypeError: Cannot read properties of null (reading 'message')",
      );
    });

    it('should handle undefined response from microservice', async () => {
      // Arrange
      userClient.send.mockReturnValue(of(undefined));

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const logSpy = jest.spyOn(loggerService, 'log');
      const errorSpy = jest.spyOn(loggerService, 'error');

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        '🔄 Cron job cleanup-inactive-users bắt đầu chạy từ API Gateway...',
      );
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Lỗi khi chạy cleanup inactive users:',
        "TypeError: Cannot read properties of undefined (reading 'message')",
      );
    });

    it('should handle response missing deletedCount property', async () => {
      // Arrange
      const incompleteResult = { message: 'Đã xóa 3 user hết hạn khỏi bảng.' };
      userClient.send.mockReturnValue(of(incompleteResult));

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const logSpy = jest.spyOn(loggerService, 'log');
      const errorSpy = jest.spyOn(loggerService, 'error');

      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenNthCalledWith(
        2,
        '✅ Cleanup hoàn thành: Đã xóa 3 user hết hạn khỏi bảng.',
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should call userClient.send with correct parameters', async () => {
      // Arrange
      userClient.send.mockReturnValue(of(mockCleanupResult));

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const sendSpy = jest.spyOn(userClient, 'send');

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith(UserMsgPattern.CLEANUP_INACTIVE_USERS, {});
    });

    it('should handle empty result (no users deleted)', async () => {
      // Arrange
      const emptyResult = {
        deletedCount: 0,
        message: 'No users to delete.',
      };
      userClient.send.mockReturnValue(of(emptyResult));

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const logSpy = jest.spyOn(loggerService, 'log');
      const errorSpy = jest.spyOn(loggerService, 'error');

      expect(logSpy).toHaveBeenNthCalledWith(2, `✅ Cleanup hoàn thành: ${emptyResult.message}`);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle large number of deleted users', async () => {
      // Arrange
      const largeResult = {
        deletedCount: 1000,
        message: 'Đã xóa 1000 user hết hạn khỏi bảng.',
      };
      userClient.send.mockReturnValue(of(largeResult));

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const logSpy = jest.spyOn(loggerService, 'log');
      const errorSpy = jest.spyOn(loggerService, 'error');

      expect(logSpy).toHaveBeenNthCalledWith(2, `✅ Cleanup hoàn thành: ${largeResult.message}`);
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have userClient injected', () => {
      expect(userClient).toBeDefined();
    });

    it('should have loggerService injected', () => {
      expect(loggerService).toBeDefined();
    });
  });
});
