import { FilterGetUsersRequest } from '@app/common/dto/user/requests/filter-get-orders.request';
import { UserSummaryResponse } from '@app/common/dto/user/responses/user-summary.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { UserStatus } from '@app/common/enums/user-status.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService } from 'libs/cloudinary/cloudinary.service';
import { AdminUserController } from '../src/user/admin-user.controller';
import { UserService } from '../src/user/user.service';
import { SortDirection } from '@app/common/enums/query.enum';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { AuthRoles } from '@app/common/decorators/auth-role.decorator';
import { I18nService } from 'nestjs-i18n';

describe('AdminUserController - getUsers', () => {
  let controller: AdminUserController;
  let userService: UserService;

  // Mock data
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
      controllers: [AdminUserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            getUsers: jest.fn(),
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadImage: jest.fn(),
            deleteImage: jest.fn(),
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
        {
          provide: I18nService,
          useValue: { translate: jest.fn() },
        },
      ],
    })
      .overrideGuard(AuthRoles)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AdminUserController>(AdminUserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return users list successfully with default filter', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };
      const response = buildBaseResponse(StatusKey.SUCCESS, mockPaginationResult);
      const getUsersSpy = jest.spyOn(userService, 'getUsers').mockResolvedValue(response);

      // Act
      const result = await controller.getUsers(filter);

      // Assert
      expect(getUsersSpy).toHaveBeenCalledWith(filter);
      expect(getUsersSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(response);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(mockPaginationResult);
    });

    it('should return users list with full filter parameters', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 2,
        pageSize: 20,
        name: 'John',
        email: 'john@example.com',
        statuses: [UserStatus.ACTIVE, UserStatus.INACTIVE],
        sortBy: 'createdAt',
        direction: SortDirection.ASC,
      };
      const response = buildBaseResponse(StatusKey.SUCCESS, mockPaginationResult);
      const getUsersSpy = jest.spyOn(userService, 'getUsers').mockResolvedValue(response);

      // Act
      const result = await controller.getUsers(filter);

      // Assert
      expect(getUsersSpy).toHaveBeenCalledWith(filter);
      expect(getUsersSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(response);
    });

    it('should return empty list when no users found', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 1,
        pageSize: 10,
        name: 'NonExistent',
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
      const getUsersSpy = jest.spyOn(userService, 'getUsers').mockResolvedValue(response);

      // Act
      const result = await controller.getUsers(filter);

      // Assert
      expect(getUsersSpy).toHaveBeenCalledWith(filter);
      expect(result).toEqual(response);
      expect(result.data!.items).toHaveLength(0);
      expect(result.data!.paginations.itemsOnPage).toBe(0);
    });

    it('should handle service error with TypedRpcException', async () => {
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
      const getUsersSpy = jest
        .spyOn(userService, 'getUsers')
        .mockRejectedValue(new TypedRpcException(rpcError));

      // Act & Assert
      try {
        await controller.getUsers(filter);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(
          HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        );
      }
      expect(getUsersSpy).toHaveBeenCalledWith(filter);
      expect(getUsersSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle database connection error', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 1,
        pageSize: 10,
        direction: SortDirection.ASC,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.databaseConnectionFailed',
      };
      const getUsersSpy = jest
        .spyOn(userService, 'getUsers')
        .mockRejectedValue(new TypedRpcException(rpcError));

      // Act & Assert
      try {
        await controller.getUsers(filter);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(
          HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        );
      }
      expect(getUsersSpy).toHaveBeenCalledWith(filter);
    });

    it('should handle validation error', async () => {
      // Arrange
      const invalidFilter = {
        page: -1, // Invalid page number
        pageSize: 0, // Invalid page size
      } as FilterGetUsersRequest;
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationError',
      };
      const getUsersSpy = jest
        .spyOn(userService, 'getUsers')
        .mockRejectedValue(new TypedRpcException(rpcError));

      // Act & Assert
      try {
        await controller.getUsers(invalidFilter);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.BAD_REQUEST);
      }
      expect(getUsersSpy).toHaveBeenCalledWith(invalidFilter);
    });

    it('should handle timeout error from microservice', async () => {
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
      const getUsersSpy = jest
        .spyOn(userService, 'getUsers')
        .mockRejectedValue(new TypedRpcException(rpcError));

      // Act & Assert
      try {
        await controller.getUsers(filter);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      expect(getUsersSpy).toHaveBeenCalledWith(filter);
    });

    it('should return paginated results correctly', async () => {
      // Arrange
      const filter: FilterGetUsersRequest = {
        page: 3,
        pageSize: 5,
        direction: SortDirection.ASC,
      };
      const paginatedResult: PaginationResult<UserSummaryResponse> = {
        items: [
          mockUserSummary,
          { ...mockUserSummary, id: 2, name: 'Jane Doe', userName: 'janedoe' },
          { ...mockUserSummary, id: 3, name: 'Bob Smith', userName: 'bobsmith' },
        ],
        paginations: {
          currentPage: 1,
          itemsOnPage: 3,
          totalItems: 3,
          pageSize: 10,
          totalPages: 1,
        },
      };
      const response = buildBaseResponse(StatusKey.SUCCESS, paginatedResult);
      const getUsersSpy = jest.spyOn(userService, 'getUsers').mockResolvedValue(response);

      // Act
      const result = await controller.getUsers(filter);

      // Assert
      expect(getUsersSpy).toHaveBeenCalledWith(filter);
      expect(result.data?.items).toHaveLength(3);
      expect(result.data?.paginations.currentPage).toBe(1);
      expect(result.data?.paginations.pageSize).toBe(10);
    });
  });
});
