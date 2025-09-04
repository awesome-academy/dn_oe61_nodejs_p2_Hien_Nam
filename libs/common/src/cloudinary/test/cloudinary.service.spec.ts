import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { CloudinaryService } from '../cloudinary.service';
import { CloudUploadQueueService } from '../cloud-upload-queue/cloud-upload-queue.service';
import { maxSizeBytes } from '../../constant/cloudinary';
import { Readable } from 'stream';

interface MockUploadStream {
  end: jest.Mock;
}

interface MockCloudinary {
  uploader: {
    upload_stream: jest.Mock;
    destroy: jest.Mock;
  };
}

interface MockFile extends Express.Multer.File {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
}

const createMockFile = (overrides: Partial<MockFile> = {}): MockFile => {
  return {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('test image data'),
    destination: '',
    filename: 'test.jpg',
    path: '',
    stream: new Readable(),
    ...overrides,
  };
};

const createMockUploadApiResponse = (
  overrides: Partial<UploadApiResponse> = {},
): UploadApiResponse => {
  return {
    public_id: 'test_public_id',
    version: 1,
    signature: 'test_signature',
    width: 100,
    height: 100,
    format: 'jpg',
    resource_type: 'image',
    created_at: '2024-01-01T00:00:00Z',
    tags: [],
    bytes: 1024,
    type: 'upload',
    etag: 'test_etag',
    placeholder: false,
    url: 'https://res.cloudinary.com/test/image/upload/test_public_id.jpg',
    secure_url: 'https://res.cloudinary.com/test/image/upload/test_public_id.jpg',
    folder: 'test',
    access_mode: 'public',
    original_filename: 'test',
    api_key: 'test_key',
    pages: 1,
    ...overrides,
  } as UploadApiResponse;
};

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let mockCloudinary: MockCloudinary;
  let mockI18nService: jest.Mocked<I18nService>;
  let mockCloudUploadQueueService: jest.Mocked<CloudUploadQueueService>;

  beforeEach(async () => {
    mockCloudinary = {
      uploader: {
        upload_stream: jest.fn(),
        destroy: jest.fn(),
      },
    };

    mockI18nService = {
      translate: jest.fn(),
    } as unknown as jest.Mocked<I18nService>;

    mockCloudUploadQueueService = {
      enqueueUpload: jest.fn(),
    } as unknown as jest.Mocked<CloudUploadQueueService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: 'CLOUDINARY',
          useValue: mockCloudinary,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: CloudUploadQueueService,
          useValue: mockCloudUploadQueueService,
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('upload', () => {
    it('should successfully upload a valid file', async () => {
      const mockFile = createMockFile();
      const mockResponse = createMockUploadApiResponse();
      const mockUploadStream: MockUploadStream = {
        end: jest.fn(),
      };

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options: unknown, callback: (error: unknown, result: unknown) => void) => {
          setTimeout(() => callback(undefined, mockResponse), 0);
          return mockUploadStream;
        },
      );

      const result = await service.upload(mockFile, 'test-folder');

      expect(result).toEqual(mockResponse);
      expect(mockCloudinary.uploader.upload_stream).toHaveBeenCalledTimes(1);
      const [uploadOptions, uploadCallback] = mockCloudinary.uploader.upload_stream.mock
        .calls[0] as [Record<string, unknown>, (...args: unknown[]) => void];

      expect(uploadOptions).toEqual({
        folder: 'test-folder',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        public_id: expect.stringMatching(/^test_\d+_[a-z0-9]+$/),
        overwrite: true,
      });
      expect(typeof uploadCallback).toBe('function');
      expect(mockUploadStream.end).toHaveBeenCalledWith(mockFile.buffer);
    });

    it('should throw BadRequestException when file is null', async () => {
      const nullFile = null as unknown as Express.Multer.File;

      await expect(service.upload(nullFile, 'test-folder')).rejects.toThrow(
        new BadRequestException(
          'File must be uploaded in memory storage and buffer must be a Buffer.',
        ),
      );
    });

    it('should throw BadRequestException when file has no buffer', async () => {
      const fileWithoutBuffer = createMockFile({ buffer: undefined as unknown as Buffer });

      await expect(service.upload(fileWithoutBuffer, 'test-folder')).rejects.toThrow(
        new BadRequestException(
          'File must be uploaded in memory storage and buffer must be a Buffer.',
        ),
      );
    });

    it('should throw BadRequestException when buffer is not a Buffer', async () => {
      const fileWithInvalidBuffer = createMockFile({ buffer: 'not a buffer' as unknown as Buffer });

      await expect(service.upload(fileWithInvalidBuffer, 'test-folder')).rejects.toThrow(
        new BadRequestException(
          'File must be uploaded in memory storage and buffer must be a Buffer.',
        ),
      );
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const mockFile = createMockFile({ mimetype: 'image/gif' });
      mockI18nService.translate.mockReturnValue('Unsupported file type: image/gif');

      await expect(service.upload(mockFile, 'test-folder')).rejects.toThrow(BadRequestException);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.file.validation.unsupportedType',
        expect.objectContaining({
          lang: undefined,
          args: { fileType: 'image/gif' },
        }),
      );
    });

    it('should allow supported file types', async () => {
      const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const mockResponse = createMockUploadApiResponse();
      const mockUploadStream: MockUploadStream = {
        end: jest.fn(),
      };

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options: unknown, callback: (error: unknown, result: unknown) => void) => {
          setTimeout(() => callback(undefined, mockResponse), 0);
          return mockUploadStream;
        },
      );

      for (const mimetype of supportedTypes) {
        const mockFile = createMockFile({ mimetype });
        await expect(service.upload(mockFile, 'test-folder')).resolves.toEqual(mockResponse);
      }
    });

    it('should throw BadRequestException when file size exceeds limit', async () => {
      const largeFile = createMockFile({ size: maxSizeBytes + 1 });
      const fileSizeMB = ((maxSizeBytes + 1) / 1024 / 1024).toFixed(2);
      mockI18nService.translate.mockReturnValue(`File size ${fileSizeMB}MB exceeds limit`);

      await expect(service.upload(largeFile, 'test-folder')).rejects.toThrow(BadRequestException);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.file.validation.sizeExceeded',
        expect.objectContaining({
          lang: undefined,
          args: { fileSize: fileSizeMB },
        }),
      );
    });

    it('should handle cloudinary upload error', async () => {
      const mockFile = createMockFile();
      const mockError: UploadApiErrorResponse = {
        message: 'Upload failed',
        name: 'CloudinaryError',
        http_code: 400,
      };
      const mockUploadStream: MockUploadStream = {
        end: jest.fn(),
      };

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options: unknown, callback: (error: unknown, result: unknown) => void) => {
          setTimeout(() => callback(mockError, undefined), 0);
          return mockUploadStream;
        },
      );

      await expect(service.upload(mockFile, 'test-folder')).rejects.toThrow(
        new BadRequestException('Upload failed'),
      );
    });

    it('should handle existing file error', async () => {
      const mockFile = createMockFile();
      const mockResponse = createMockUploadApiResponse({
        existing: true,
        public_id: 'existing_file',
      });
      const mockUploadStream: MockUploadStream = {
        end: jest.fn(),
      };

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options: unknown, callback: (error: unknown, result: unknown) => void) => {
          setTimeout(() => callback(undefined, mockResponse), 0);
          return mockUploadStream;
        },
      );

      mockI18nService.translate.mockReturnValue('File existing_file already exists');

      await expect(service.upload(mockFile, 'test-folder')).rejects.toThrow(BadRequestException);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.errors.cloudinary.fileExists',
        expect.objectContaining({
          lang: undefined,
          args: { fileName: 'existing_file' },
        }),
      );
    });

    it('should handle undefined result', async () => {
      const mockFile = createMockFile();
      const mockUploadStream: MockUploadStream = {
        end: jest.fn(),
      };

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options: unknown, callback: (error: unknown, result: unknown) => void) => {
          setTimeout(() => callback(undefined, undefined), 0);
          return mockUploadStream;
        },
      );

      await expect(service.upload(mockFile, 'test-folder')).rejects.toThrow(
        new BadRequestException('Upload failed'),
      );
    });

    it('should generate unique public_id with timestamp and random string', async () => {
      const mockFile = createMockFile({ originalname: 'test-image.jpg' });
      const mockResponse = createMockUploadApiResponse();
      const mockUploadStream: MockUploadStream = {
        end: jest.fn(),
      };

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (options: unknown, callback: (error: unknown, result: unknown) => void) => {
          setTimeout(() => callback(undefined, mockResponse), 0);
          return mockUploadStream;
        },
      );

      await service.upload(mockFile, 'test-folder');

      expect(mockCloudinary.uploader.upload_stream).toHaveBeenCalledTimes(1);
      const [uploadOptions, uploadCallback] = mockCloudinary.uploader.upload_stream.mock
        .calls[0] as [Record<string, unknown>, (...args: unknown[]) => void];

      expect(uploadOptions).toEqual(
        expect.objectContaining({
          overwrite: true,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          public_id: expect.stringMatching(/^test-image_\d+_[a-z0-9]+$/),
        }),
      );
      expect(typeof uploadCallback).toBe('function');
    });

    it('should use I18nContext.current() lang when available', async () => {
      const mockFile = createMockFile({ mimetype: 'image/gif' });

      const mockCurrentContext = jest.spyOn(I18nContext, 'current');
      mockCurrentContext.mockReturnValue({ lang: 'en' } as never);
      mockI18nService.translate.mockReturnValue('Unsupported file type');

      await expect(service.upload(mockFile, 'test-folder')).rejects.toThrow(BadRequestException);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.file.validation.unsupportedType',
        expect.objectContaining({
          lang: 'en',
          args: { fileType: 'image/gif' },
        }),
      );
    });
  });

  describe('delete', () => {
    it('should successfully delete a file by public_id', async () => {
      const publicId = 'test_public_id';
      const mockResponse = createMockUploadApiResponse();

      mockCloudinary.uploader.destroy.mockResolvedValue(mockResponse);

      const result = await service.delete(publicId);

      expect(result).toEqual(mockResponse);
      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith(publicId);
    });

    it('should handle delete errors', async () => {
      const publicId = 'test_public_id';
      const error = new Error('Delete failed');

      mockCloudinary.uploader.destroy.mockRejectedValue(error);

      await expect(service.delete(publicId)).rejects.toThrow(error);
    });
  });

  describe('deleteByUrls', () => {
    it('should successfully delete a single image by URL', async function (this: void) {
      const imageUrl =
        'https://res.cloudinary.com/test/image/upload/v1234567890/products/test_image.jpg';
      const mockResponse = createMockUploadApiResponse();

      mockCloudinary.uploader.destroy.mockResolvedValue(mockResponse);

      const result = await service.deleteByUrls(imageUrl);

      expect(result).toEqual(mockResponse);
      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith('products/test_image');
    });

    it('should successfully delete multiple images by URLs', async () => {
      const imageUrls = [
        'https://res.cloudinary.com/test/image/upload/v1234567890/products/image1.jpg',
        'https://res.cloudinary.com/test/image/upload/v1234567890/products/image2.png',
        'https://res.cloudinary.com/test/image/upload/v1234567890/products/image3.webp',
      ];
      const mockResponse = createMockUploadApiResponse();

      mockCloudinary.uploader.destroy.mockResolvedValue(mockResponse);

      const result = await service.deleteByUrls(imageUrls);

      expect(result).toEqual([mockResponse, mockResponse, mockResponse]);
      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledTimes(3);
      expect(mockCloudinary.uploader.destroy).toHaveBeenNthCalledWith(1, 'products/image1');
      expect(mockCloudinary.uploader.destroy).toHaveBeenNthCalledWith(2, 'products/image2');
      expect(mockCloudinary.uploader.destroy).toHaveBeenNthCalledWith(3, 'products/image3');
    });

    it('should handle URLs with whitespace by trimming them', async function (this: void) {
      const imageUrl =
        '  https://res.cloudinary.com/test/image/upload/v1234567890/products/test_image.jpg  ';
      const mockResponse = createMockUploadApiResponse();

      mockCloudinary.uploader.destroy.mockResolvedValue(mockResponse);

      const result = await service.deleteByUrls(imageUrl);

      expect(result).toEqual(mockResponse);
      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith('products/test_image');
    });

    it('should handle URLs without version numbers', async () => {
      const imageUrl = 'https://res.cloudinary.com/test/image/upload/products/test_image.jpg';
      const mockResponse = createMockUploadApiResponse();

      mockCloudinary.uploader.destroy.mockResolvedValue(mockResponse);

      const result = await service.deleteByUrls(imageUrl);

      expect(result).toEqual(mockResponse);
      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith('products/test_image');
    });

    it('should handle URLs with transformations', async function (this: void) {
      const imageUrl =
        'https://res.cloudinary.com/test/image/upload/c_fill,w_300,h_300/v1234567890/products/test_image.jpg';
      const mockResponse = createMockUploadApiResponse();

      mockCloudinary.uploader.destroy.mockResolvedValue(mockResponse);

      const result = await service.deleteByUrls(imageUrl);

      expect(result).toEqual(mockResponse);
      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith('products/test_image');
    });

    it('should handle nested folder structure in public ID', async function (this: void) {
      const imageUrl =
        'https://res.cloudinary.com/test/image/upload/v1234567890/products/category/subcategory/test_image.jpg';
      const mockResponse = createMockUploadApiResponse();

      mockCloudinary.uploader.destroy.mockResolvedValue(mockResponse);

      const result = await service.deleteByUrls(imageUrl);

      expect(result).toEqual(mockResponse);
      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith(
        'products/category/subcategory/test_image',
      );
    });

    it('should throw BadRequestException for invalid URL format', async function (this: void) {
      const invalidUrl = 'https://example.com/invalid/url.jpg';
      mockI18nService.translate.mockReturnValue('URL is invalid');

      // Mock I18nContext.current to return undefined
      const mockCurrentContext = jest.spyOn(I18nContext, 'current');
      mockCurrentContext.mockReturnValue(undefined as never);

      await expect(service.deleteByUrls(invalidUrl)).rejects.toThrow(BadRequestException);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.file.error.invalidUrl',
        expect.objectContaining({
          lang: undefined,
          args: { url: invalidUrl },
        }),
      );
    });

    it('should throw BadRequestException for URL without upload segment', async function (this: void) {
      const invalidUrl =
        'https://res.cloudinary.com/test/image/transform/v1234567890/products/test_image.jpg';
      mockI18nService.translate.mockReturnValue('URL is invalid');

      // Mock I18nContext.current to return undefined
      const mockCurrentContext = jest.spyOn(I18nContext, 'current');
      mockCurrentContext.mockReturnValue(undefined as never);

      await expect(service.deleteByUrls(invalidUrl)).rejects.toThrow(BadRequestException);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.file.error.invalidUrl',
        expect.objectContaining({
          lang: undefined,
          args: { url: invalidUrl },
        }),
      );
    });

    it('should throw BadRequestException for malformed URL', async function (this: void) {
      const malformedUrl = 'not-a-valid-url';
      mockI18nService.translate.mockReturnValue('URL is invalid');

      // Mock I18nContext.current to return undefined
      const mockCurrentContext = jest.spyOn(I18nContext, 'current');
      mockCurrentContext.mockReturnValue(undefined as never);

      await expect(service.deleteByUrls(malformedUrl)).rejects.toThrow(BadRequestException);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.file.error.invalidUrl',
        expect.objectContaining({
          lang: undefined,
          args: { url: malformedUrl },
        }),
      );
    });

    it('should handle array with one invalid URL among valid ones', async function (this: void) {
      const imageUrls = [
        'https://res.cloudinary.com/test/image/upload/v1234567890/products/image1.jpg',
        'https://example.com/invalid/url.jpg',
        'https://res.cloudinary.com/test/image/upload/v1234567890/products/image3.jpg',
      ];
      mockI18nService.translate.mockReturnValue('URL is invalid');

      // Mock I18nContext.current to return undefined
      const mockCurrentContext = jest.spyOn(I18nContext, 'current');
      mockCurrentContext.mockReturnValue(undefined as never);

      await expect(service.deleteByUrls(imageUrls)).rejects.toThrow(BadRequestException);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.file.error.invalidUrl',
        expect.objectContaining({
          lang: undefined,
          args: { url: 'https://example.com/invalid/url.jpg' },
        }),
      );
    });

    it('should handle cloudinary destroy errors for single URL', async function (this: void) {
      const imageUrl =
        'https://res.cloudinary.com/test/image/upload/v1234567890/products/test_image.jpg';
      const error = new Error('Cloudinary destroy failed');

      mockCloudinary.uploader.destroy.mockRejectedValue(error);

      await expect(service.deleteByUrls(imageUrl)).rejects.toThrow(error);
    });

    it('should handle cloudinary destroy errors for multiple URLs', async () => {
      const imageUrls = [
        'https://res.cloudinary.com/test/image/upload/v1234567890/products/image1.jpg',
        'https://res.cloudinary.com/test/image/upload/v1234567890/products/image2.jpg',
      ];
      const error = new Error('Cloudinary destroy failed');

      mockCloudinary.uploader.destroy.mockRejectedValue(error);

      await expect(service.deleteByUrls(imageUrls)).rejects.toThrow(error);
    });

    it('should use I18nContext.current() lang when available for error messages', async function (this: void) {
      const invalidUrl = 'https://example.com/invalid/url.jpg';

      const mockCurrentContext = jest.spyOn(I18nContext, 'current');
      mockCurrentContext.mockReturnValue({ lang: 'vi' } as never);
      mockI18nService.translate.mockReturnValue('URL không hợp lệ');

      await expect(service.deleteByUrls(invalidUrl)).rejects.toThrow(BadRequestException);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.file.error.invalidUrl',
        expect.objectContaining({
          lang: 'vi',
          args: { url: invalidUrl },
        }),
      );
    });

    it('should handle empty array', async () => {
      const emptyArray: string[] = [];

      const result = await service.deleteByUrls(emptyArray);

      expect(result).toEqual([]);
      expect(mockCloudinary.uploader.destroy).not.toHaveBeenCalled();
    });

    it('should handle concurrent deletion of large number of URLs', async () => {
      const imageUrls = Array.from(
        { length: 10 },
        (_, i) => `https://res.cloudinary.com/test/image/upload/v1234567890/products/image${i}.jpg`,
      );
      const mockResponse = createMockUploadApiResponse();

      mockCloudinary.uploader.destroy.mockResolvedValue(mockResponse);

      const result = await service.deleteByUrls(imageUrls);

      expect(result).toEqual(Array(10).fill(mockResponse));
      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledTimes(10);

      // Verify all calls were made with correct public IDs
      for (let i = 0; i < 10; i++) {
        expect(mockCloudinary.uploader.destroy).toHaveBeenNthCalledWith(
          i + 1,
          `products/image${i}`,
        );
      }
    });
  });

  describe('extractPublicIdFromUrl (private method testing)', () => {
    // Testing private method through public interface
    it('should extract public ID from various URL formats through deleteByUrls', async () => {
      const testCases = [
        {
          url: 'https://res.cloudinary.com/test/image/upload/v1234567890/products/test_image.jpg',
          expectedPublicId: 'products/test_image',
        },
        {
          url: 'https://res.cloudinary.com/test/image/upload/products/test_image.png',
          expectedPublicId: 'products/test_image',
        },
        {
          url: 'https://res.cloudinary.com/test/image/upload/c_fill,w_300/v1234567890/products/test_image.webp',
          expectedPublicId: 'products/test_image',
        },
        {
          url: 'https://res.cloudinary.com/test/image/upload/v1234567890/folder/subfolder/image.jpg',
          expectedPublicId: 'folder/subfolder/image',
        },
        {
          url: 'https://res.cloudinary.com/test/image/upload/simple_image.gif',
          expectedPublicId: 'simple_image',
        },
      ];

      const mockResponse = createMockUploadApiResponse();
      mockCloudinary.uploader.destroy.mockResolvedValue(mockResponse);

      for (const testCase of testCases) {
        await service.deleteByUrls(testCase.url);
        expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith(testCase.expectedPublicId);
        jest.clearAllMocks();
      }
    });

    it('should handle edge cases in URL parsing through deleteByUrls', async () => {
      const edgeCases = [
        'https://res.cloudinary.com/test/image/upload/v1234567890/test.jpg',
        'https://res.cloudinary.com/test/image/upload/test',
        'https://res.cloudinary.com/test/image/upload/v1234567890/a/b/c/d/e/f.png',
      ];

      const mockResponse = createMockUploadApiResponse();
      mockCloudinary.uploader.destroy.mockResolvedValue(mockResponse);

      for (const url of edgeCases) {
        await service.deleteByUrls(url);
        expect(mockCloudinary.uploader.destroy).toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });

    it('should handle URL that results in empty public ID', async () => {
      // URL that will result in empty publicId after processing
      const urlWithEmptyPublicId = 'https://res.cloudinary.com/test/image/upload/v1234567890/.jpg';
      mockI18nService.translate.mockReturnValue('URL is invalid');

      // Mock I18nContext.current to return undefined
      const mockCurrentContext = jest.spyOn(I18nContext, 'current');
      mockCurrentContext.mockReturnValue(undefined as never);

      await expect(service.deleteByUrls(urlWithEmptyPublicId)).rejects.toThrow(BadRequestException);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.file.error.invalidUrl',
        expect.objectContaining({
          lang: undefined,
          args: { url: urlWithEmptyPublicId },
        }),
      );
    });
  });

  describe('uploadImagesToCloudinary', () => {
    it('should successfully upload multiple files', async () => {
      const mockFiles = [
        createMockFile({ originalname: 'file1.jpg' }),
        createMockFile({ originalname: 'file2.jpg' }),
      ];
      const mockUrls = ['url1', 'url2'];

      mockCloudUploadQueueService.enqueueUpload
        .mockResolvedValueOnce(mockUrls[0])
        .mockResolvedValueOnce(mockUrls[1]);

      const result = await service.uploadImagesToCloudinary(mockFiles);

      expect(result).toEqual(mockUrls);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCloudUploadQueueService.enqueueUpload).toHaveBeenCalledTimes(2);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCloudUploadQueueService.enqueueUpload).toHaveBeenNthCalledWith(
        1,
        mockFiles[0],
        'products',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCloudUploadQueueService.enqueueUpload).toHaveBeenNthCalledWith(
        2,
        mockFiles[1],
        'products',
      );
    });

    it('should throw BadRequestException when files array is null', async () => {
      const nullFiles = null as unknown as Array<Express.Multer.File>;
      mockI18nService.translate.mockReturnValue('Files are required');

      await expect(service.uploadImagesToCloudinary(nullFiles)).rejects.toThrow(
        BadRequestException,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith('common.product.error.filesExists');
    });

    it('should throw BadRequestException when files array is empty', async () => {
      const emptyFiles: Array<Express.Multer.File> = [];
      mockI18nService.translate.mockReturnValue('Files are required');

      await expect(service.uploadImagesToCloudinary(emptyFiles)).rejects.toThrow(
        BadRequestException,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith('common.product.error.filesExists');
    });

    it('should filter out empty URLs and throw error if no valid URLs', async () => {
      const mockFiles = [
        createMockFile({ originalname: 'file1.jpg' }),
        createMockFile({ originalname: 'file2.jpg' }),
      ];

      mockCloudUploadQueueService.enqueueUpload.mockResolvedValueOnce('').mockResolvedValueOnce('');

      mockI18nService.translate.mockReturnValue('Files are required');

      await expect(service.uploadImagesToCloudinary(mockFiles)).rejects.toThrow(
        BadRequestException,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith('common.product.error.filesExists');
    });

    it('should filter out empty URLs but return valid ones', async () => {
      const mockFiles = [
        createMockFile({ originalname: 'file1.jpg' }),
        createMockFile({ originalname: 'file2.jpg' }),
        createMockFile({ originalname: 'file3.jpg' }),
      ];

      mockCloudUploadQueueService.enqueueUpload
        .mockResolvedValueOnce('url1')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('url3');

      const result = await service.uploadImagesToCloudinary(mockFiles);

      expect(result).toEqual(['url1', 'url3']);
    });

    it('should handle upload queue service errors', async () => {
      const mockFiles = [createMockFile()];
      const error = new Error('Queue service error');

      mockCloudUploadQueueService.enqueueUpload.mockRejectedValue(error);

      await expect(service.uploadImagesToCloudinary(mockFiles)).rejects.toThrow(error);
    });

    it('should filter out null and undefined URLs', async () => {
      const mockFiles = [
        createMockFile({ originalname: 'file1.jpg' }),
        createMockFile({ originalname: 'file2.jpg' }),
        createMockFile({ originalname: 'file3.jpg' }),
      ];

      mockCloudUploadQueueService.enqueueUpload
        .mockResolvedValueOnce('url1')
        .mockResolvedValueOnce(null as unknown as string)
        .mockResolvedValueOnce(undefined as unknown as string);

      const result = await service.uploadImagesToCloudinary(mockFiles);

      expect(result).toEqual(['url1']);
    });
  });
});
