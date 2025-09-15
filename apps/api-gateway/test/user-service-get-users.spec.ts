import { CacheService } from '@app/common/cache/cache.service';
import { FilterGetUsersRequest } from '@app/common/dto/user/requests/filter-get-orders.request';
import { UserSummaryResponse } from '@app/common/dto/user/responses/user-summary.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { SortDirection } from '@app/common/enums/query.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { UserStatus } from '@app/common/enums/user-status.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { UserService } from '../src/user/user.service';
import { USER_SERVICE } from '@app/common';

describe('UserService - getUsers', () => {
  let service: UserService;
  let userClient: ClientProxy;
  let cacheService: CacheService;

  const mockUserSummary: UserSummaryResponse = {
    id: 1,
    name: 'John Doe',
    userName: 'johndoe',
    email: 'john@example.com',
    isActive: true,
    imageUrl: 'http://example.com/image.jpg',
    status: UserStatus.ACTIVE,
    role: 'USER',
  };

  const mockPaginationResult: PaginationResult<UserSummaryResponse> = {
    items: [mockUserSummary],
    paginations: {
      currentPage: 1,
      itemsOnPage: 10,
      totalItems: 1,
      pageSize: 10,
      totalPages: 10,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_SERVICE,
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            getOrSet: jest.fn(),
            generateKey: jest.fn(),
          },
        },
        {
          provide: CustomLogger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userClient = module.get<ClientProxy>(USER_SERVICE);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return cached users list when cache hit', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };
      const response = buildBaseResponse(StatusKey.SUCCESS, mockPaginationResult);
      const getOrSetSpy = jest.spyOn(cacheService, 'getOrSet').mockResolvedValue(response);
      const generateKeySpy = jest.spyOn(cacheService, 'generateKey').mockReturnValue('cache-key');

      // Act
      const result = await service.getUsers(filter);

      // Assert
      expect(generateKeySpy).toHaveBeenCalled();
      expect(getOrSetSpy).toHaveBeenCalled();
      expect(result).toEqual(response);
    });

    it('should fetch from microservice when cache miss', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 1,
        pageSize: 10,
        name: 'John',
        email: 'john@example.com',
        direction: SortDirection.ASC,
      };
      const response = buildBaseResponse(StatusKey.SUCCESS, mockPaginationResult);

      const sendSpy = jest.spyOn(userClient, 'send').mockReturnValue(of(response));
      const getOrSetSpy = jest
        .spyOn(cacheService, 'getOrSet')
        .mockImplementation(async (key, callback) => {
          return await callback();
        });
      const generateKeySpy = jest.spyOn(cacheService, 'generateKey').mockReturnValue('cache-key');

      // Act
      const result = await service.getUsers(filter);

      // Assert
      expect(generateKeySpy).toHaveBeenCalled();
      expect(getOrSetSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_USER, filter);
      expect(result).toEqual(response);
    });

    it('should handle empty result from microservice', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };
      const emptyResult: PaginationResult<UserSummaryResponse> = {
        items: [],
        paginations: {
          currentPage: 1,
          itemsOnPage: 0,
          totalItems: 0,
          pageSize: 10,
          totalPages: 1,
        },
      };
      const response = buildBaseResponse(StatusKey.SUCCESS, emptyResult);

      const sendSpy = jest.spyOn(userClient, 'send').mockReturnValue(of(response));
      const getOrSetSpy = jest
        .spyOn(cacheService, 'getOrSet')
        .mockImplementation(async (key, callback) => {
          return await callback();
        });
      const generateKeySpy = jest.spyOn(cacheService, 'generateKey').mockReturnValue('cache-key');

      // Act
      const result = await service.getUsers(filter);

      // Assert
      expect(generateKeySpy).toHaveBeenCalled();
      expect(getOrSetSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_USER, filter);
      expect(result.data?.items).toHaveLength(0);
    });

    it('should handle microservice timeout error', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.serviceUnavailable',
      };

      const sendSpy = jest
        .spyOn(userClient, 'send')
        .mockReturnValue(throwError(() => new TypedRpcException(rpcError)));
      const getOrSetSpy = jest
        .spyOn(cacheService, 'getOrSet')
        .mockImplementation(async (key, callback) => {
          return await callback();
        });
      const generateKeySpy = jest.spyOn(cacheService, 'generateKey').mockReturnValue('cache-key');

      // Act & Assert
      try {
        await service.getUsers(filter);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(generateKeySpy).toHaveBeenCalled();
      expect(getOrSetSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_USER, filter);
    });

    it('should handle microservice internal error', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };

      const sendSpy = jest
        .spyOn(userClient, 'send')
        .mockReturnValue(throwError(() => new TypedRpcException(rpcError)));
      const getOrSetSpy = jest
        .spyOn(cacheService, 'getOrSet')
        .mockImplementation(async (key, callback) => {
          return await callback();
        });
      const generateKeySpy = jest.spyOn(cacheService, 'generateKey').mockReturnValue('cache-key');

      // Act & Assert
      try {
        await service.getUsers(filter);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(generateKeySpy).toHaveBeenCalled();
      expect(getOrSetSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_USER, filter);
    });

    it('should handle filter with statuses correctly', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 1,
        pageSize: 10,
        statuses: [UserStatus.ACTIVE, UserStatus.INACTIVE],
        sortBy: 'createdAt',
        direction: SortDirection.ASC,
      };
      const response = buildBaseResponse(StatusKey.SUCCESS, mockPaginationResult);

      const sendSpy = jest.spyOn(userClient, 'send').mockReturnValue(of(response));
      const getOrSetSpy = jest
        .spyOn(cacheService, 'getOrSet')
        .mockImplementation(async (key, callback) => {
          return await callback();
        });
      const generateKeySpy = jest.spyOn(cacheService, 'generateKey').mockReturnValue('cache-key');

      // Act
      const result = await service.getUsers(filter);

      // Assert
      expect(generateKeySpy).toHaveBeenCalled();
      expect(getOrSetSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_USER, filter);
      expect(result).toEqual(response);
    });

    it('should handle database connection error', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.databaseConnectionFailed',
      };

      const sendSpy = jest
        .spyOn(userClient, 'send')
        .mockReturnValue(throwError(() => new TypedRpcException(rpcError)));
      const getOrSetSpy = jest
        .spyOn(cacheService, 'getOrSet')
        .mockImplementation(async (key, callback) => {
          return await callback();
        });
      const generateKeySpy = jest.spyOn(cacheService, 'generateKey').mockReturnValue('cache-key');

      // Act & Assert
      try {
        await service.getUsers(filter);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }

      expect(generateKeySpy).toHaveBeenCalled();
      expect(getOrSetSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalledWith(UserMsgPattern.GET_ALL_USER, filter);
    });
  });
});
