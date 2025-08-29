import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 as Cloudinary } from 'cloudinary';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { maxSizeBytes } from '../constant/cloudinary';
import { CloudUploadQueueService } from './cloud-upload-queue/cloud-upload-queue.service';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY') private readonly cloudinary: typeof Cloudinary,
    private readonly i18nService: I18nService,
    private readonly cloudUploadQueueService: CloudUploadQueueService,
  ) {}

  async upload(file: Express.Multer.File, folder: string): Promise<UploadApiResponse> {
    if (!file || !file.buffer || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException(
        'File must be uploaded in memory storage and buffer must be a Buffer.',
      );
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        this.i18nService.translate('common.file.validation.unsupportedType', {
          lang: I18nContext.current()?.lang,
          args: { fileType: file.mimetype },
        }),
      );
    }

    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        this.i18nService.translate('common.file.validation.sizeExceeded', {
          lang: I18nContext.current()?.lang,
          args: { fileSize: (file.size / 1024 / 1024).toFixed(2) },
        }),
      );
    }

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const originalName = file.originalname.split('.').slice(0, -1).join('.');
      const uniqueId = `${originalName}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;

      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: uniqueId,
          overwrite: true,
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            return reject(new BadRequestException(error.message));
          }
          if (result && result.existing) {
            return reject(
              new BadRequestException(
                this.i18nService.translate('common.errors.cloudinary.fileExists', {
                  lang: I18nContext.current()?.lang,
                  args: { fileName: result.public_id },
                }),
              ),
            );
          }
          if (!result) {
            return reject(new BadRequestException('Upload failed'));
          }
          return resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async delete(publicId: string): Promise<UploadApiResponse> {
    return this.cloudinary.uploader.destroy(publicId) as unknown as Promise<UploadApiResponse>;
  }

  async uploadImagesToCloudinary(files: Array<Express.Multer.File>): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException(this.i18nService.translate('common.product.error.filesExists'));
    }

    const uploadResults = await Promise.all(
      files.map((file) => this.cloudUploadQueueService.enqueueUpload(file, 'products')),
    );
    const imagesUrl = uploadResults.filter((url) => !!url);

    if (!imagesUrl || imagesUrl.length === 0) {
      throw new BadRequestException(this.i18nService.translate('common.product.error.filesExists'));
    }
    return imagesUrl;
  }
}
