// Mock all decorators and external modules before imports
jest.mock('class-validator', () => {
  const mockDecorator = () => () => {};
  return {
    validateOrReject: jest.fn(),
    IsNotEmpty: mockDecorator,
    IsString: mockDecorator,
    IsNumber: mockDecorator,
    MinLength: mockDecorator,
    MaxLength: mockDecorator,
    IsOptional: mockDecorator,
    IsEmail: mockDecorator,
    IsDateString: mockDecorator,
    IsUrl: mockDecorator,
    Matches: mockDecorator,
    IsPhoneNumber: mockDecorator,
  };
});

jest.mock('class-transformer', () => ({
  plainToInstance: jest.fn(),
  Type: () => () => {},
  Transform: () => () => {},
}));

jest.mock('@app/common/helpers/microservices', () => ({
  callMicroservice: jest.fn(),
}));

jest.mock('@app/common/utils/data.util', () => ({
  buildBaseResponse: jest.fn(),
}));

// Mock nestjs-i18n
jest.mock('nestjs-i18n', () => ({
  I18nService: jest.fn().mockImplementation(() => ({
    translate: jest.fn(),
  })),
  i18nValidationMessage: () => 'mocked validation message',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { I18nService } from 'nestjs-i18n';
import { plainToInstance } from 'class-transformer';
import { Readable } from 'stream';
import { validateOrReject } from 'class-validator';

import { UserProfileService } from '../../src/user/user-profile/user-profile.service';
import { UpdatePasswordRequest } from '@app/common/dto/user/requests/update-password.request';
import { UpdateUserProfileRequest } from '@app/common/dto/user/requests/update-user-profile.request';
import { GetUserProfileRequest } from '@app/common/dto/user/requests/get-user-profile.request';
import { UpdatePasswordResponse } from '@app/common/dto/user/responses/update-password.response';
import { UpdateUserProfileResponse } from '@app/common/dto/user/responses/update-user-profile.response';
import { UserProfileResponse } from '@app/common/dto/user/responses/user-profile.response';
import { USER_SERVICE } from '@app/common/constant/service.constant';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { CloudinaryService } from '@app/common/cloudinary/cloudinary.service';
import { callMicroservice } from '@app/common/helpers/microservices';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let mockUserClient: jest.Mocked<ClientProxy>;
  let mockLoggerService: jest.Mocked<CustomLogger>;
  let mockCloudinaryService: jest.Mocked<CloudinaryService>;
  let mockI18nService: { translate: jest.Mock };

  // Mock functions
  const mockPlainToInstance = plainToInstance as jest.MockedFunction<typeof plainToInstance>;
  const mockCallMicroservice = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
  const mockBuildBaseResponse = buildBaseResponse as jest.MockedFunction<typeof buildBaseResponse>;
  const mockValidateOrReject = validateOrReject as jest.MockedFunction<typeof validateOrReject>;

  beforeEach(async () => {
    // Create mocked services with proper typing
    mockUserClient = {
      send: jest.fn().mockReturnValue({ pipe: jest.fn() }),
      emit: jest.fn(),
      close: jest.fn(),
      connect: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<CustomLogger>;

    const uploadImagesMock = jest.fn();
    mockCloudinaryService = {
      uploadImagesToCloudinary: uploadImagesMock,
      upload: jest.fn(),
      delete: jest.fn(),
      deleteByUrls: jest.fn(),
    } as unknown as jest.Mocked<CloudinaryService>;

    mockI18nService = {
      translate: jest.fn(),
    };

    // Setup validateOrReject mock
    mockValidateOrReject.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        {
          provide: USER_SERVICE,
          useValue: mockUserClient,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);

    // Reset all mocks before each test
    jest.clearAllMocks();
    mockValidateOrReject.mockResolvedValue(undefined);
  });

  describe('getUserProfile', () => {
    const mockGetUserProfileRequest: GetUserProfileRequest = {
      userId: 1,
    };

    const mockUserProfileResponse: UserProfileResponse = {
      id: 1,
      name: 'John Doe',
      userName: 'johndoe',
      email: 'test@example.com',
      imageUrl: 'https://example.com/avatar.jpg',
      isActive: true,
      status: 'active',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      role: {
        id: 1,
        name: 'user',
      },
      profile: {
        id: 1,
        address: '123 Test Street',
        phoneNumber: '+84123456789',
        dateOfBirth: new Date('1990-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      },
      authProviders: [
        {
          id: 1,
          provider: 'local',
          providerId: null,
          hasPassword: true,
          createdAt: new Date('2024-01-01'),
        },
      ],
    };

    const mockBaseResponse: BaseResponse<UserProfileResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockUserProfileResponse,
    };

    beforeEach(() => {
      mockPlainToInstance.mockReturnValue(mockGetUserProfileRequest);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);
    });

    it('should successfully get user profile', async () => {
      mockCallMicroservice.mockResolvedValue(mockUserProfileResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      const result = await service.getUserProfile(mockGetUserProfileRequest);

      expect(mockPlainToInstance).toHaveBeenCalledWith(
        GetUserProfileRequest,
        mockGetUserProfileRequest,
      );
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockGetUserProfileRequest);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.anything(),
        USER_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(
        StatusKey.SUCCESS,
        mockUserProfileResponse,
      );
      expect(result).toEqual(mockBaseResponse);
    });

    it('should throw BadRequestException when microservice returns null', async () => {
      mockCallMicroservice.mockResolvedValue(null);
      mockI18nService.translate.mockReturnValue('Get user profile failed');

      await expect(service.getUserProfile(mockGetUserProfileRequest)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.user.action.getUserProfile.failed',
      );
    });

    it('should throw BadRequestException when microservice returns undefined', async () => {
      mockCallMicroservice.mockResolvedValue(undefined);
      mockI18nService.translate.mockReturnValue('Get user profile failed');

      await expect(service.getUserProfile(mockGetUserProfileRequest)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.user.action.getUserProfile.failed',
      );
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed');
      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.getUserProfile(mockGetUserProfileRequest)).rejects.toThrow(
        validationError,
      );
      expect(mockCallMicroservice).not.toHaveBeenCalled();
    });

    it('should handle microservice errors', async () => {
      const microserviceError = new Error('Microservice error');
      mockCallMicroservice.mockRejectedValue(microserviceError);

      await expect(service.getUserProfile(mockGetUserProfileRequest)).rejects.toThrow(
        microserviceError,
      );
    });

    it('should handle different user ID types', async () => {
      const requestWithStringId = { userId: 123 };
      mockCallMicroservice.mockResolvedValue(mockUserProfileResponse);

      const result = await service.getUserProfile(requestWithStringId);

      expect(mockCallMicroservice).toHaveBeenCalled();
      expect(result).toEqual(mockBaseResponse);
    });

    it('should validate request parameters correctly', async () => {
      mockCallMicroservice.mockResolvedValue(mockUserProfileResponse);

      await service.getUserProfile(mockGetUserProfileRequest);

      expect(mockValidateOrReject).toHaveBeenCalledWith(mockGetUserProfileRequest);
      expect(mockPlainToInstance).toHaveBeenCalledWith(
        GetUserProfileRequest,
        mockGetUserProfileRequest,
      );
    });
  });

  describe('updateUserProfile', () => {
    const mockUpdateUserProfileRequest: UpdateUserProfileRequest = {
      userId: 1,
      userName: 'janesmith',
      phoneNumber: '+84987654321',
      address: '456 Updated Street',
      dateOfBirth: '1990-01-01',
    };

    const mockUpdateUserProfileResponse: UpdateUserProfileResponse = {
      id: 1,
      name: 'Jane Smith',
      userName: 'janesmith',
      email: 'test@example.com',
      imageUrl: 'https://example.com/avatar.jpg',
      updatedAt: new Date('2024-01-03'),
      profile: {
        id: 1,
        address: '456 Updated Street',
        phoneNumber: '+84987654321',
        dateOfBirth: new Date('1990-01-01'),
        updatedAt: new Date('2024-01-03'),
      },
    };

    const mockBaseResponse: BaseResponse<UpdateUserProfileResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockUpdateUserProfileResponse,
    };

    const mockFile: Express.Multer.File = {
      fieldname: 'avatar',
      originalname: 'test-avatar.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      destination: '/tmp',
      filename: 'test-avatar.jpg',
      path: '/tmp/test-avatar.jpg',
      buffer: Buffer.from('test'),
      stream: new Readable(),
    };

    beforeEach(() => {
      mockPlainToInstance.mockReturnValue(mockUpdateUserProfileRequest);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);
    });

    it('should successfully update user profile without file', async () => {
      mockCallMicroservice.mockResolvedValue(mockUpdateUserProfileResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      const result = await service.updateUserProfile(1, mockUpdateUserProfileRequest);

      expect(mockPlainToInstance).toHaveBeenCalledWith(
        UpdateUserProfileRequest,
        mockUpdateUserProfileRequest,
      );
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockUpdateUserProfileRequest);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.anything(),
        USER_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(
        StatusKey.SUCCESS,
        mockUpdateUserProfileResponse,
      );
      expect(result).toEqual(mockBaseResponse);
    });

    it('should successfully update user profile with file', async () => {
      const uploadSpy = jest.spyOn(mockCloudinaryService, 'uploadImagesToCloudinary');
      uploadSpy.mockResolvedValue(['https://cloudinary.com/avatar.jpg']);
      mockCallMicroservice.mockResolvedValue(mockUpdateUserProfileResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      const result = await service.updateUserProfile(1, mockUpdateUserProfileRequest, mockFile);

      expect(uploadSpy).toHaveBeenCalledWith([mockFile]);
      expect(mockUpdateUserProfileRequest).toEqual(
        expect.objectContaining({ imageUrl: 'https://cloudinary.com/avatar.jpg' }),
      );
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.anything(),
        USER_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(result).toEqual(mockBaseResponse);
    });

    it('should throw BadRequestException when microservice returns null', async () => {
      mockCallMicroservice.mockResolvedValue(null);
      mockI18nService.translate.mockReturnValue('Update user profile failed');

      await expect(service.updateUserProfile(1, mockUpdateUserProfileRequest)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.user.action.updateUserProfile.failed',
      );
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed');
      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.updateUserProfile(1, mockUpdateUserProfileRequest)).rejects.toThrow(
        validationError,
      );
      expect(mockCallMicroservice).not.toHaveBeenCalled();
    });

    it('should handle cloudinary upload errors', async () => {
      const cloudinaryError = new Error('Cloudinary upload failed');
      mockCloudinaryService.uploadImagesToCloudinary.mockRejectedValue(cloudinaryError);

      await expect(
        service.updateUserProfile(1, mockUpdateUserProfileRequest, mockFile),
      ).rejects.toThrow(cloudinaryError);
      expect(mockCallMicroservice).not.toHaveBeenCalled();
    });

    it('should handle microservice errors', async () => {
      const microserviceError = new Error('Microservice error');
      mockCallMicroservice.mockRejectedValue(microserviceError);

      await expect(service.updateUserProfile(1, mockUpdateUserProfileRequest)).rejects.toThrow(
        microserviceError,
      );
    });

    it('should set userId correctly from parameter', async () => {
      const userId = 999;
      mockCallMicroservice.mockResolvedValue(mockUpdateUserProfileResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      await service.updateUserProfile(userId, mockUpdateUserProfileRequest);

      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.anything(),
        USER_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
    });

    it('should handle empty file upload', async () => {
      const emptyFile = { ...mockFile, size: 0 };
      const uploadSpy = jest.spyOn(mockCloudinaryService, 'uploadImagesToCloudinary');
      uploadSpy.mockResolvedValue(['https://cloudinary.com/empty.jpg']);
      mockCallMicroservice.mockResolvedValue(mockUpdateUserProfileResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      const result = await service.updateUserProfile(1, mockUpdateUserProfileRequest, emptyFile);

      expect(uploadSpy).toHaveBeenCalledWith([emptyFile]);
      expect(result).toEqual(mockBaseResponse);
    });

    it('should handle multiple validation errors', async () => {
      const validationError = new Error('Validation failed');
      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.updateUserProfile(1, mockUpdateUserProfileRequest)).rejects.toThrow(
        validationError,
      );
      expect(mockCallMicroservice).not.toHaveBeenCalled();
    });

    it('should handle different user ID types in update', async () => {
      const stringUserId = '123';
      mockCallMicroservice.mockResolvedValue(mockUpdateUserProfileResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      await service.updateUserProfile(
        stringUserId as unknown as number,
        mockUpdateUserProfileRequest,
      );

      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.anything(),
        USER_SERVICE,
        mockLoggerService,
        expect.objectContaining({
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        }),
      );
    });

    it('should cleanup uploaded image when microservice fails after file upload', async () => {
      const uploadedImageUrl = 'https://cloudinary.com/uploaded-avatar.jpg';
      const uploadSpy = jest.spyOn(mockCloudinaryService, 'uploadImagesToCloudinary');
      const deleteByUrlsSpy = jest.spyOn(mockCloudinaryService, 'deleteByUrls');

      uploadSpy.mockResolvedValue([uploadedImageUrl]);
      mockCallMicroservice.mockResolvedValue(null); // Microservice fails
      mockI18nService.translate.mockReturnValue('Update user profile failed');

      await expect(
        service.updateUserProfile(1, mockUpdateUserProfileRequest, mockFile),
      ).rejects.toThrow(BadRequestException);

      expect(uploadSpy).toHaveBeenCalledWith([mockFile]);
      expect(deleteByUrlsSpy).toHaveBeenCalledWith(uploadedImageUrl);
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.user.action.updateUserProfile.failed',
      );
    });

    it('should cleanup uploaded image when microservice returns undefined after file upload', async () => {
      const uploadedImageUrl = 'https://cloudinary.com/uploaded-avatar.jpg';
      const uploadSpy = jest.spyOn(mockCloudinaryService, 'uploadImagesToCloudinary');
      const deleteByUrlsSpy = jest.spyOn(mockCloudinaryService, 'deleteByUrls');

      uploadSpy.mockResolvedValue([uploadedImageUrl]);
      mockCallMicroservice.mockResolvedValue(undefined); // Microservice returns undefined
      mockI18nService.translate.mockReturnValue('Update user profile failed');

      await expect(
        service.updateUserProfile(1, mockUpdateUserProfileRequest, mockFile),
      ).rejects.toThrow(BadRequestException);

      expect(uploadSpy).toHaveBeenCalledWith([mockFile]);
      expect(deleteByUrlsSpy).toHaveBeenCalledWith(uploadedImageUrl);
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.user.action.updateUserProfile.failed',
      );
    });

    it('should call deleteByUrls with undefined imageUrl when no file was uploaded and microservice fails', async () => {
      const deleteByUrlsSpy = jest.spyOn(mockCloudinaryService, 'deleteByUrls');

      // Create a fresh request object without imageUrl to avoid mutation from previous tests
      const freshRequest: UpdateUserProfileRequest = {
        userId: 1,
        userName: 'janesmith',
        phoneNumber: '+84987654321',
        address: '456 Updated Street',
        dateOfBirth: '1990-01-01',
      };

      mockCallMicroservice.mockResolvedValue(null); // Microservice fails
      mockI18nService.translate.mockReturnValue('Update user profile failed');

      await expect(
        service.updateUserProfile(1, freshRequest), // No file
      ).rejects.toThrow(BadRequestException);

      expect(deleteByUrlsSpy).toHaveBeenCalledWith(''); // Called with empty string due to nullish coalescing operator
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.user.action.updateUserProfile.failed',
      );
    });

    it('should throw deleteByUrls error when cleanup fails', async () => {
      const uploadedImageUrl = 'https://cloudinary.com/uploaded-avatar.jpg';
      const uploadSpy = jest.spyOn(mockCloudinaryService, 'uploadImagesToCloudinary');
      const deleteByUrlsSpy = jest.spyOn(mockCloudinaryService, 'deleteByUrls');

      uploadSpy.mockResolvedValue([uploadedImageUrl]);
      mockCallMicroservice.mockResolvedValue(null);
      deleteByUrlsSpy.mockRejectedValue(new Error('Cloudinary delete failed'));
      mockI18nService.translate.mockReturnValue('Update user profile failed');

      // Should throw the deleteByUrls error since it's not caught in the service
      await expect(
        service.updateUserProfile(1, mockUpdateUserProfileRequest, mockFile),
      ).rejects.toThrow('Cloudinary delete failed');

      expect(uploadSpy).toHaveBeenCalledWith([mockFile]);
      expect(deleteByUrlsSpy).toHaveBeenCalledWith(uploadedImageUrl);
    });
  });

  describe('updatePassword', () => {
    const mockUpdatePasswordRequest: UpdatePasswordRequest = {
      userId: 1,
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
      confirmPassword: 'newPassword456',
    };

    const mockUpdatePasswordResponse: UpdatePasswordResponse = {
      id: 1,
      userName: 'testuser',
      email: 'test@example.com',
      updatedAt: new Date('2024-01-03'),
      message: 'Password updated successfully',
    };

    const mockBaseResponse: BaseResponse<UpdatePasswordResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockUpdatePasswordResponse,
    };

    beforeEach(() => {
      mockPlainToInstance.mockReturnValue(mockUpdatePasswordRequest);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);
    });

    it('should successfully update password', async () => {
      mockCallMicroservice.mockResolvedValue(mockUpdatePasswordResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      const result = await service.updatePassword(mockUpdatePasswordRequest);

      expect(mockPlainToInstance).toHaveBeenCalledWith(
        UpdatePasswordRequest,
        mockUpdatePasswordRequest,
      );
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockUpdatePasswordRequest);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.anything(),
        USER_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(
        StatusKey.SUCCESS,
        mockUpdatePasswordResponse,
      );
      expect(result).toEqual(mockBaseResponse);
    });

    it('should throw BadRequestException when microservice returns null', async () => {
      mockCallMicroservice.mockResolvedValue(null);
      mockI18nService.translate.mockReturnValue('Update password failed');

      await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.user.action.updatePassword.failed',
      );
    });

    it('should throw BadRequestException when microservice returns undefined', async () => {
      mockCallMicroservice.mockResolvedValue(undefined);
      mockI18nService.translate.mockReturnValue('Update password failed');

      await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.user.action.updatePassword.failed',
      );
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed');
      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(
        validationError,
      );
      expect(mockCallMicroservice).not.toHaveBeenCalled();
    });

    it('should handle microservice errors', async () => {
      const microserviceError = new Error('Microservice error');
      mockCallMicroservice.mockRejectedValue(microserviceError);

      await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(
        microserviceError,
      );
    });

    it('should validate password requirements', async () => {
      const weakPasswordRequest = {
        ...mockUpdatePasswordRequest,
        newPassword: '123',
      };
      const validationError = new Error('Password too weak');
      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.updatePassword(weakPasswordRequest)).rejects.toThrow(validationError);
      expect(mockCallMicroservice).not.toHaveBeenCalled();
    });

    it('should handle different password formats', async () => {
      const specialPasswordRequest = {
        ...mockUpdatePasswordRequest,
        newPassword: 'P@ssw0rd!@#$%^&*()',
        confirmPassword: 'P@ssw0rd!@#$%^&*()',
      };
      mockCallMicroservice.mockResolvedValue(mockUpdatePasswordResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      const result = await service.updatePassword(specialPasswordRequest);

      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.anything(),
        USER_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(result).toEqual(mockBaseResponse);
    });

    it('should handle service timeout scenarios', async () => {
      const timeoutError = new Error('Request timeout');
      mockCallMicroservice.mockRejectedValue(timeoutError);

      await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(timeoutError);
    });

    it('should handle concurrent password update requests', async () => {
      mockCallMicroservice.mockResolvedValue(mockUpdatePasswordResponse);

      const promises = [
        service.updatePassword(mockUpdatePasswordRequest),
        service.updatePassword({ ...mockUpdatePasswordRequest, userId: 2 }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(2);
      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle service instantiation', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(UserProfileService);
    });

    it('should handle null request objects gracefully', async () => {
      const nullRequest = null as unknown as GetUserProfileRequest;
      mockPlainToInstance.mockReturnValue(nullRequest);
      const validationError = new Error('Validation failed for null request');
      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.getUserProfile(nullRequest)).rejects.toThrow(validationError);
    });

    it('should handle service timeout errors', async () => {
      const timeoutError = new Error('Service timeout');
      mockCallMicroservice.mockRejectedValue(timeoutError);

      await expect(service.getUserProfile({ userId: 1 })).rejects.toThrow(timeoutError);
    });

    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network unavailable');
      mockCallMicroservice.mockRejectedValue(networkError);

      await expect(service.getUserProfile({ userId: 1 })).rejects.toThrow(networkError);
    });

    it('should handle large file uploads gracefully', async () => {
      const largeFile = {
        fieldname: 'avatar',
        originalname: 'large-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 50 * 1024 * 1024, // 50MB
        destination: '/tmp',
        filename: 'large-image.jpg',
        path: '/tmp/large-image.jpg',
        buffer: Buffer.alloc(50 * 1024 * 1024),
        stream: new Readable(),
      };

      const cloudinaryError = new Error('File too large');
      mockCloudinaryService.uploadImagesToCloudinary.mockRejectedValue(cloudinaryError);

      await expect(service.updateUserProfile(1, { userId: 1 }, largeFile)).rejects.toThrow(
        cloudinaryError,
      );
    });
  });
});
