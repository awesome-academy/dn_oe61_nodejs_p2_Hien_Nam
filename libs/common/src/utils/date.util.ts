import * as dayjs from 'dayjs';
import { SupportedLocalesType } from '../constant/locales.constant';
import { I18nService } from 'nestjs-i18n';

export function formatDateTime(date: Date, lang: SupportedLocalesType = 'vi'): string {
  return dayjs(date)
    .locale(lang)
    .format(lang === 'vi' ? 'DD/MM/YY HH:mm' : 'MMM D,YYYY, h:mm A');
}
export function parseExpireTime(input: string): number {
  if (!input) {
    throw new Error('Invalid expire time format');
  }
  const regex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i;
  const match = input.match(regex);
  if (!match) {
    throw new Error(`Invalid expire time format ${input}`);
  }
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}
export function getRemainingTime(
  expiredAt: number,
  lang: SupportedLocalesType = 'en',
  i18nService: I18nService,
): string {
  const now = Date.now();
  const remainingMs = expiredAt * 1000 - now;

  if (remainingMs <= 0)
    return i18nService.translate('common.date.expiredTime', {
      args: {
        lang,
      },
    });

  const minutes = Math.floor(remainingMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return i18nService.translate('common.date.remainingPayment', {
      args: {
        lang,
        hours,
        minutes: remainingMinutes,
      },
    });
  }
  return i18nService.translate('common.date.remainingMinutesPayment', {
    args: {
      lang,
      minutes,
    },
  });
}
