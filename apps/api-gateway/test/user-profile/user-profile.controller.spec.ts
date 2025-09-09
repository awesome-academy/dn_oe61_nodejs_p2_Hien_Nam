import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { Readable } from 'stream';
import { UserProfileController } from '../../src/user/user-profile/user-profile.controller';
import { UserProfileService } from '../../src/user/user-profile/user-profile.service';
import { TUserPayload } from '@app/common/types/user-payload.type';
import { GetUserProfileRequest } from '@app/common/dto/user/requests/get-user-profile.request';
import { UpdateUserProfileRequest } from '@app/common/dto/user/requests/update-user-profile.request';
import { UpdatePasswordRequest } from '@app/common/dto/user/requests/update-password.request';
import { UserProfileResponse } from '@app/common/dto/user/responses/user-profile.response';
import { UpdateUserProfileResponse } from '@app/common/dto/user/responses/update-user-profile.response';
import { UpdatePasswordResponse } from '@app/common/dto/user/responses/update-password.response';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { Role } from '@app/common/enums/roles/users.enum';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';

describe('UserProfileController', () => {
  let controller: UserProfileController;

  const mockUserProfileService = {
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    updatePassword: jest.fn(),
  };

  const mockUserPayload: TUserPayload = {
    id: 1,
    name: 'Test User',
    userName: 'testuser',
    email: 'test@example.com',
    role: Role.USER,
  };

  const mockUserProfileResponse: UserProfileResponse = {
    id: 1,
    name: 'Test User',
    userName: 'testuser',
    email: 'test@example.com',
    imageUrl: 'https://example.com/image.jpg',
    isActive: true,
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    role: {
      id: 1,
      name: 'USER',
    },
    profile: {
      id: 1,
      address: '123 Test Street',
      phoneNumber: '+84123456789',
      dateOfBirth: new Date('1990-01-01T00:00:00Z'),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    },
    authProviders: [
      {
        id: 1,
        provider: 'local',
        providerId: null,
        hasPassword: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    ],
  };

  const mockUpdateUserProfileResponse: UpdateUserProfileResponse = {
    id: 1,
    name: 'Updated User',
    userName: 'updateduser',
    email: 'updated@example.com',
    imageUrl: 'https://example.com/updated-image.jpg',
    updatedAt: new Date('2024-01-03T00:00:00Z'),
    profile: {
      id: 1,
      address: '456 Updated Street',
      phoneNumber: '+84987654321',
      dateOfBirth: new Date('1990-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-03T00:00:00Z'),
    },
  };

  const mockUpdatePasswordResponse: UpdatePasswordResponse = {
    id: 1,
    userName: 'testuser',
    email: 'test@example.com',
    updatedAt: new Date('2024-01-03T00:00:00Z'),
    message: 'Password updated successfully',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfileController],
      providers: [
        {
          provide: UserProfileService,
          useValue: mockUserProfileService,
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAll: jest.fn(),
            getAllAndOverride: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserProfileController>(UserProfileController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should successfully get user profile', async () => {
      const expectedResponse: BaseResponse<UserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUserProfileResponse,
      };

      mockUserProfileService.getUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.getUserProfile(mockUserPayload);

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockUserProfileService.getUserProfile).toHaveBeenCalledWith({
        userId: mockUserPayload.id,
      } as GetUserProfileRequest);
    });

    it('should handle service error when getting user profile', async () => {
      const error = new BadRequestException('Failed to get user profile');
      mockUserProfileService.getUserProfile.mockRejectedValue(error);

      await expect(controller.getUserProfile(mockUserPayload)).rejects.toThrow(BadRequestException);
      expect(mockUserProfileService.getUserProfile).toHaveBeenCalledTimes(1);
    });

    it('should handle user with undefined id', async () => {
      const userWithUndefinedId: TUserPayload = {
        ...mockUserPayload,
        id: undefined,
      };

      const expectedResponse: BaseResponse<UserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUserProfileResponse,
      };

      mockUserProfileService.getUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.getUserProfile(userWithUndefinedId);

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.getUserProfile).toHaveBeenCalledWith({
        userId: undefined,
      } as unknown as GetUserProfileRequest);
    });

    it('should handle different user payload structures', async () => {
      const minimalUserPayload: TUserPayload = {
        id: 999,
        name: 'Minimal User',
        userName: 'minimal',
        email: undefined,
        role: Role.USER,
      };

      const expectedResponse: BaseResponse<UserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: { ...mockUserProfileResponse, id: 999 },
      };

      mockUserProfileService.getUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.getUserProfile(minimalUserPayload);

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.getUserProfile).toHaveBeenCalledWith({
        userId: 999,
      } as GetUserProfileRequest);
    });

    it('should verify return type structure', async () => {
      const expectedResponse: BaseResponse<UserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUserProfileResponse,
      };

      mockUserProfileService.getUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.getUserProfile(mockUserPayload);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('userName');
      expect(result.data).toHaveProperty('email');
    });
  });

  describe('updateUserProfile', () => {
    const mockUpdateUserProfileRequest: UpdateUserProfileRequest = {
      name: 'Updated User',
      userName: 'updateduser',
      email: 'updated@example.com',
      address: '456 Updated Street',
      phoneNumber: '+84987654321',
      dateOfBirth: '1990-01-01',
    };

    const mockFile: Express.Multer.File = {
      fieldname: 'image',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('test image data'),
      destination: '',
      filename: '',
      path: '',
      stream: {} as Readable,
    };

    it('should successfully update user profile without file', async () => {
      const expectedResponse: BaseResponse<UpdateUserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdateUserProfileResponse,
      };

      mockUserProfileService.updateUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.updateUserProfile(
        mockUserPayload,
        mockUpdateUserProfileRequest,
      );

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledTimes(1);
      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        mockUserPayload.id,
        mockUpdateUserProfileRequest,
        undefined,
      );
    });

    it('should successfully update user profile with file', async () => {
      const expectedResponse: BaseResponse<UpdateUserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdateUserProfileResponse,
      };

      mockUserProfileService.updateUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.updateUserProfile(
        mockUserPayload,
        mockUpdateUserProfileRequest,
        mockFile,
      );

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledTimes(1);
      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        mockUserPayload.id,
        mockUpdateUserProfileRequest,
        mockFile,
      );
    });

    it('should handle service error when updating user profile', async () => {
      const error = new BadRequestException('Failed to update user profile');
      mockUserProfileService.updateUserProfile.mockRejectedValue(error);

      await expect(
        controller.updateUserProfile(mockUserPayload, mockUpdateUserProfileRequest),
      ).rejects.toThrow(BadRequestException);
      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledTimes(1);
    });

    it('should handle empty update request', async () => {
      const emptyRequest: UpdateUserProfileRequest = {};
      const expectedResponse: BaseResponse<UpdateUserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdateUserProfileResponse,
      };

      mockUserProfileService.updateUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.updateUserProfile(mockUserPayload, emptyRequest);

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        mockUserPayload.id,
        emptyRequest,
        undefined,
      );
    });

    it('should handle partial update request', async () => {
      const partialRequest: UpdateUserProfileRequest = {
        name: 'New Name Only',
      };
      const expectedResponse: BaseResponse<UpdateUserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: { ...mockUpdateUserProfileResponse, name: 'New Name Only' },
      };

      mockUserProfileService.updateUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.updateUserProfile(mockUserPayload, partialRequest);

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        mockUserPayload.id,
        partialRequest,
        undefined,
      );
    });

    it('should handle user with undefined id', async () => {
      const userWithUndefinedId: TUserPayload = {
        ...mockUserPayload,
        id: undefined,
      };

      const expectedResponse: BaseResponse<UpdateUserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdateUserProfileResponse,
      };

      mockUserProfileService.updateUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.updateUserProfile(
        userWithUndefinedId,
        mockUpdateUserProfileRequest,
      );

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        undefined,
        mockUpdateUserProfileRequest,
        undefined,
      );
    });

    it('should handle different file types', async () => {
      const pngFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'test-image.png',
        mimetype: 'image/png',
      };

      const expectedResponse: BaseResponse<UpdateUserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdateUserProfileResponse,
      };

      mockUserProfileService.updateUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.updateUserProfile(
        mockUserPayload,
        mockUpdateUserProfileRequest,
        pngFile,
      );

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        mockUserPayload.id,
        mockUpdateUserProfileRequest,
        pngFile,
      );
    });

    it('should verify return type structure', async () => {
      const expectedResponse: BaseResponse<UpdateUserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdateUserProfileResponse,
      };

      mockUserProfileService.updateUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.updateUserProfile(
        mockUserPayload,
        mockUpdateUserProfileRequest,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('updatedAt');
    });
  });

  describe('updatePassword', () => {
    const mockUpdatePasswordBody = {
      currentPassword: 'currentPassword123',
      newPassword: 'newPassword123',
      confirmPassword: 'newPassword123',
    };

    it('should successfully update password', async () => {
      const expectedResponse: BaseResponse<UpdatePasswordResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdatePasswordResponse,
      };

      mockUserProfileService.updatePassword.mockResolvedValue(expectedResponse);

      const result = await controller.updatePassword(mockUserPayload, mockUpdatePasswordBody);

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.updatePassword).toHaveBeenCalledTimes(1);
      expect(mockUserProfileService.updatePassword).toHaveBeenCalledWith({
        userId: mockUserPayload.id,
        ...mockUpdatePasswordBody,
      } as UpdatePasswordRequest);
    });

    it('should handle service error when updating password', async () => {
      const error = new BadRequestException('Failed to update password');
      mockUserProfileService.updatePassword.mockRejectedValue(error);

      await expect(
        controller.updatePassword(mockUserPayload, mockUpdatePasswordBody),
      ).rejects.toThrow(BadRequestException);
      expect(mockUserProfileService.updatePassword).toHaveBeenCalledTimes(1);
    });

    it('should handle user with undefined id', async () => {
      const userWithUndefinedId: TUserPayload = {
        ...mockUserPayload,
        id: undefined,
      };

      const expectedResponse: BaseResponse<UpdatePasswordResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdatePasswordResponse,
      };

      mockUserProfileService.updatePassword.mockResolvedValue(expectedResponse);

      const result = await controller.updatePassword(userWithUndefinedId, mockUpdatePasswordBody);

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.updatePassword).toHaveBeenCalledWith({
        userId: undefined,
        ...mockUpdatePasswordBody,
      } as unknown as UpdatePasswordRequest);
    });

    it('should properly construct UpdatePasswordRequest DTO', async () => {
      const expectedResponse: BaseResponse<UpdatePasswordResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdatePasswordResponse,
      };

      mockUserProfileService.updatePassword.mockResolvedValue(expectedResponse);

      await controller.updatePassword(mockUserPayload, mockUpdatePasswordBody);

      const expectedDto: UpdatePasswordRequest = {
        userId: mockUserPayload.id!,
        currentPassword: mockUpdatePasswordBody.currentPassword,
        newPassword: mockUpdatePasswordBody.newPassword,
        confirmPassword: mockUpdatePasswordBody.confirmPassword,
      };

      expect(mockUserProfileService.updatePassword).toHaveBeenCalledWith(expectedDto);
    });

    it('should handle different password combinations', async () => {
      const differentPasswordBody = {
        currentPassword: 'oldPass456',
        newPassword: 'newSecurePass789',
        confirmPassword: 'newSecurePass789',
      };

      const expectedResponse: BaseResponse<UpdatePasswordResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdatePasswordResponse,
      };

      mockUserProfileService.updatePassword.mockResolvedValue(expectedResponse);

      const result = await controller.updatePassword(mockUserPayload, differentPasswordBody);

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.updatePassword).toHaveBeenCalledWith({
        userId: mockUserPayload.id,
        ...differentPasswordBody,
      } as UpdatePasswordRequest);
    });

    it('should handle password with special characters', async () => {
      const specialPasswordBody = {
        currentPassword: 'current@Pass#123',
        newPassword: 'new$Pass&456!',
        confirmPassword: 'new$Pass&456!',
      };

      const expectedResponse: BaseResponse<UpdatePasswordResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdatePasswordResponse,
      };

      mockUserProfileService.updatePassword.mockResolvedValue(expectedResponse);

      const result = await controller.updatePassword(mockUserPayload, specialPasswordBody);

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.updatePassword).toHaveBeenCalledWith({
        userId: mockUserPayload.id,
        ...specialPasswordBody,
      } as UpdatePasswordRequest);
    });

    it('should verify return type structure', async () => {
      const expectedResponse: BaseResponse<UpdatePasswordResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdatePasswordResponse,
      };

      mockUserProfileService.updatePassword.mockResolvedValue(expectedResponse);

      const result = await controller.updatePassword(mockUserPayload, mockUpdatePasswordBody);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('userName');
      expect(result.data).toHaveProperty('message');
    });

    it('should handle concurrent password update requests', async () => {
      const expectedResponse: BaseResponse<UpdatePasswordResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdatePasswordResponse,
      };

      mockUserProfileService.updatePassword.mockResolvedValue(expectedResponse);

      const promises = [
        controller.updatePassword(mockUserPayload, mockUpdatePasswordBody),
        controller.updatePassword(mockUserPayload, mockUpdatePasswordBody),
        controller.updatePassword(mockUserPayload, mockUpdatePasswordBody),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toEqual(expectedResponse);
      });
      expect(mockUserProfileService.updatePassword).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null user payload gracefully', async () => {
      const nullUser = null as unknown as TUserPayload;
      const expectedResponse: BaseResponse<UserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUserProfileResponse,
      };

      mockUserProfileService.getUserProfile.mockResolvedValue(expectedResponse);

      await expect(controller.getUserProfile(nullUser)).rejects.toThrow();
    });

    it('should handle service returning null response', async () => {
      mockUserProfileService.getUserProfile.mockResolvedValue(null);

      const result = await controller.getUserProfile(mockUserPayload);

      expect(result).toBeNull();
      expect(mockUserProfileService.getUserProfile).toHaveBeenCalledTimes(1);
    });

    it('should handle service timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockUserProfileService.updateUserProfile.mockRejectedValue(timeoutError);

      await expect(controller.updateUserProfile(mockUserPayload, {})).rejects.toThrow(
        'Request timeout',
      );
    });

    it('should handle large file uploads', async () => {
      const largeFile: Express.Multer.File = {
        fieldname: 'image',
        originalname: 'large-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 10 * 1024 * 1024, // 10MB
        buffer: Buffer.alloc(10 * 1024 * 1024),
        destination: '',
        filename: '',
        path: '',
        stream: {} as Readable,
      };

      const expectedResponse: BaseResponse<UpdateUserProfileResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockUpdateUserProfileResponse,
      };

      mockUserProfileService.updateUserProfile.mockResolvedValue(expectedResponse);

      const result = await controller.updateUserProfile(mockUserPayload, {}, largeFile);

      expect(result).toEqual(expectedResponse);
      expect(mockUserProfileService.updateUserProfile).toHaveBeenCalledWith(
        mockUserPayload.id,
        {},
        largeFile,
      );
    });
  });
});
