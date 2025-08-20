import { SupportedLocalesType } from '@app/common/constant/locales.constant';

export class OrderCreatedPayload {
  orderId: number;
  userId: number;
  userName: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: Date;
  lang: SupportedLocalesType = 'en';
}
