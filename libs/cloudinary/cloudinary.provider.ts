import { v2 as cloudinary } from 'cloudinary';
const CLOUDINARY_PROVIDER = 'CLOUDINARY';
export const CloudinaryProvider = {
  provide: CLOUDINARY_PROVIDER,
  useFactory: () => {
    console.log('Cloud name:: ', process.env.CLOUDINARY_CLOUD_NAME);
    return cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  },
};
