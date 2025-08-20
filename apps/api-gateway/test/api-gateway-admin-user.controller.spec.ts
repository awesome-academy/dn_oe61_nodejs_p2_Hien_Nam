import { Test, TestingModule } from '@nestjs/testing';
import { AdminUserController } from '../src/user/admin-user.controller';
import { UserService } from '../src/user/user.service';
import { CloudinaryService } from 'libs/cloudinary/cloudinary.service';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { UserCreationRequest } from '@app/common/dto/user/requests/user-creation.request';
import { UploadApiResponse } from 'cloudinary';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';

function createMockCloudinaryService(): jest.Mocked<CloudinaryService> {
  return {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  } as unknown as jest.Mocked<CloudinaryService>;
}

function createMockUserService(): jest.Mocked<UserService> {
  return {
    create: jest.fn(),
  } as unknown as jest.Mocked<UserService>;
}

function createMockLogger(): jest.Mocked<CustomLogger> {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  } as unknown as jest.Mocked<CustomLogger>;
}

describe('AdminUserController', () => {
  let controller: AdminUserController;
  let cloudinaryService: jest.Mocked<CloudinaryService>;
  let userService: jest.Mocked<UserService>;
  let logger: jest.Mocked<CustomLogger>;

  beforeEach(async () => {
    cloudinaryService = createMockCloudinaryService();
    userService = createMockUserService();
    logger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUserController],
      providers: [
        { provide: CloudinaryService, useValue: cloudinaryService },
        { provide: UserService, useValue: userService },
        { provide: CustomLogger, useValue: logger },
      ],
    }).compile();

    controller = module.get(AdminUserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  const uploadResponse = {
    asset_id: 'asset',
    public_id: 'public',
    secure_url: 'http://cloudinary/test.png',
    version: 1,
    version_id: 'vid',
    signature: 'sig',
    width: 100,
    height: 100,
    format: 'png',
    resource_type: 'image',
    created_at: new Date().toISOString(),
    tags: [],
    bytes: 123,
    type: 'upload',
    etag: 'etag',
    placeholder: false,
    url: 'http://cloudinary/test.png',
    original_filename: 'test',
  } as unknown as UploadApiResponse;
  it('should create user successfully', async () => {
    const fileMock = { originalname: 'test.png' } as Express.Multer.File;
    const dto: UserCreationRequest = {
      name: 'John Doe',
      role: 'USER',
    } as unknown as UserCreationRequest;
    const userResponse = {
      id: 1,
      name: 'John Doe',
      role: 'USER',
      userName: 'doe@123',
      email: 'test@mail.com',
      address: '123 Main St',
      dateOfBirth: new Date(),
      phone: '123456789',
      imageUrl: 'http://cloudinary/test.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const createdUserResponse = buildBaseResponse(StatusKey.SUCCESS, userResponse);

    const cloudinaryServiceSpy = jest
      .spyOn(cloudinaryService, 'uploadImage')
      .mockResolvedValue(uploadResponse);
    const userServiceSpy = jest.spyOn(userService, 'create').mockResolvedValue(createdUserResponse);
    const result = await controller.create(fileMock, dto);
    expect(cloudinaryServiceSpy).toHaveBeenCalledWith(fileMock);
    expect(userServiceSpy).toHaveBeenCalledWith({ ...dto, imageUrl: uploadResponse.secure_url });
    expect(result).toEqual(createdUserResponse);
  });

  it('should delete image and throw TypedRpcException when service fails', async () => {
    const fileMock = { originalname: 'test.png' } as Express.Multer.File;
    const dto: UserCreationRequest = {
      name: 'John Doe',
      role: 'USER',
    } as unknown as UserCreationRequest;
    const cloudinaryUploadSpy = jest
      .spyOn(cloudinaryService, 'uploadImage')
      .mockResolvedValue(uploadResponse);
    const userServiceSpy = jest.spyOn(userService, 'create').mockRejectedValue(
      new TypedRpcException({
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.user.phoneNumberExist',
      }),
    );
    const deleteSpy = jest.spyOn(cloudinaryService, 'deleteImage');
    const loggerSpy = jest.spyOn(logger, 'error');
    await expect(controller.create(fileMock, dto)).rejects.toEqual(
      new TypedRpcException({
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.user.phoneNumberExist',
      }),
    );
    expect(cloudinaryUploadSpy).toHaveBeenCalledWith(fileMock);
    expect(userServiceSpy).toHaveBeenCalledWith({
      ...dto,
      imageUrl: uploadResponse.secure_url,
    });
    expect(deleteSpy).toHaveBeenCalledWith(uploadResponse.public_id);
    expect(loggerSpy).toHaveBeenCalled();
  });
});
