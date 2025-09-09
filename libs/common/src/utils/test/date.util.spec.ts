import * as dayjs from 'dayjs';
import { I18nService } from 'nestjs-i18n';
import { formatDateTime, getRemainingTime, parseExpireTime } from '../date.util';

jest.mock('dayjs', () => {
  const actualDayjs = jest.requireActual<typeof dayjs>('dayjs'); // 👈 typed
  const mockDayjs = jest.fn(() => ({
    locale: jest.fn().mockReturnThis(),
    format: jest.fn(),
  }));
  Object.assign(mockDayjs, actualDayjs);

  return mockDayjs;
});

describe('date.util', () => {
  let mockI18nService: jest.Mocked<I18nService<Record<string, unknown>>>;
  beforeEach(() => {
    mockI18nService = {
      translate: jest.fn(),
    } as unknown as jest.Mocked<I18nService<Record<string, unknown>>>;
    jest.clearAllMocks();
  });
  describe('formatDateTime', () => {
    const mockDate = new Date('2024-01-15T14:30:00Z');
    const mockDayjsInstance = {
      locale: jest.fn().mockReturnThis(),
      format: jest.fn(),
    } as unknown as dayjs.Dayjs;
    let dayjsSpy: jest.SpyInstance;
    let localeSpy: jest.SpyInstance;
    let formatSpy: jest.SpyInstance;

    beforeEach(() => {
      dayjsSpy = (dayjs as jest.MockedFunction<typeof dayjs>).mockReturnValue(mockDayjsInstance);
      localeSpy = jest.spyOn(mockDayjsInstance, 'locale').mockReturnThis();
      formatSpy = jest.spyOn(mockDayjsInstance, 'format');
    });

    it('should format date with Vietnamese locale by default', () => {
      formatSpy.mockReturnValue('15/01/24 14:30');

      const result = formatDateTime(mockDate);

      expect(dayjsSpy).toHaveBeenCalledWith(mockDate);
      expect(localeSpy).toHaveBeenCalledWith('vi');
      expect(formatSpy).toHaveBeenCalledWith('DD/MM/YY HH:mm');
      expect(result).toBe('15/01/24 14:30');
    });

    it('should format date with Vietnamese locale when explicitly specified', () => {
      formatSpy.mockReturnValue('15/01/24 14:30');

      const result = formatDateTime(mockDate, 'vi');

      expect(dayjsSpy).toHaveBeenCalledWith(mockDate);
      expect(localeSpy).toHaveBeenCalledWith('vi');
      expect(formatSpy).toHaveBeenCalledWith('DD/MM/YY HH:mm');
      expect(result).toBe('15/01/24 14:30');
    });

    it('should format date with English locale', () => {
      formatSpy.mockReturnValue('Jan 15,2024, 2:30 PM');

      const result = formatDateTime(mockDate, 'en');

      expect(dayjsSpy).toHaveBeenCalledWith(mockDate);
      expect(localeSpy).toHaveBeenCalledWith('en');
      expect(formatSpy).toHaveBeenCalledWith('MMM D,YYYY, h:mm A');
      expect(result).toBe('Jan 15,2024, 2:30 PM');
    });

    it('should handle different dates correctly', () => {
      const differentDates = [
        new Date('2023-12-31T23:59:59Z'),
        new Date('2024-06-15T12:00:00Z'),
        new Date('2024-02-29T08:15:30Z'),
        new Date('2024-07-04T16:45:22Z'),
      ];

      const expectedViFormats = [
        '31/12/23 23:59',
        '15/06/24 12:00',
        '29/02/24 08:15',
        '04/07/24 16:45',
      ];

      differentDates.forEach((date, index) => {
        formatSpy.mockReturnValue(expectedViFormats[index]);

        const result = formatDateTime(date, 'vi');

        expect(dayjsSpy).toHaveBeenCalledWith(date);
        expect(result).toBe(expectedViFormats[index]);
      });
    });

    it('should handle edge case dates', () => {
      const edgeCases = [
        new Date('1970-01-01T00:00:00Z'), // Unix epoch
        new Date('2038-01-19T03:14:07Z'), // Near 32-bit timestamp limit
        new Date('2000-01-01T00:00:00Z'), // Y2K
      ];

      edgeCases.forEach((date) => {
        formatSpy.mockReturnValue('formatted-date');
        formatDateTime(date, 'en');
        expect(dayjsSpy).toHaveBeenCalledWith(date);
        expect(localeSpy).toHaveBeenCalledWith('en');
        expect(formatSpy).toHaveBeenCalledWith('MMM D,YYYY, h:mm A');
      });
    });
  });

  describe('parseExpireTime', () => {
    it('should parse hours only', () => {
      const result = parseExpireTime('2h');
      expect(result).toBe(7200); // 2 * 3600
    });

    it('should parse minutes only', () => {
      const result = parseExpireTime('30m');
      expect(result).toBe(1800); // 30 * 60
    });

    it('should parse seconds only', () => {
      const result = parseExpireTime('45s');
      expect(result).toBe(45);
    });

    it('should parse hours and minutes', () => {
      const result = parseExpireTime('1h30m');
      expect(result).toBe(5400); // 1 * 3600 + 30 * 60
    });

    it('should parse hours and seconds', () => {
      const result = parseExpireTime('2h15s');
      expect(result).toBe(7215); // 2 * 3600 + 15
    });

    it('should parse minutes and seconds', () => {
      const result = parseExpireTime('15m30s');
      expect(result).toBe(930); // 15 * 60 + 30
    });

    it('should parse hours, minutes, and seconds', () => {
      const result = parseExpireTime('1h15m30s');
      expect(result).toBe(4530); // 1 * 3600 + 15 * 60 + 30
    });

    it('should handle case insensitive input', () => {
      const testCases = [
        { input: '1H', expected: 3600 },
        { input: '30M', expected: 1800 },
        { input: '45S', expected: 45 },
        { input: '1H30M45S', expected: 5445 },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseExpireTime(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle zero values', () => {
      const result = parseExpireTime('0h0m0s');
      expect(result).toBe(0);
    });

    it('should handle large numbers', () => {
      const result = parseExpireTime('24h59m59s');
      expect(result).toBe(89999); // 24 * 3600 + 59 * 60 + 59
    });

    it('should handle single digit numbers', () => {
      const result = parseExpireTime('1h2m3s');
      expect(result).toBe(3723); // 1 * 3600 + 2 * 60 + 3
    });

    it('should handle multi-digit numbers', () => {
      const result = parseExpireTime('12h34m56s');
      expect(result).toBe(45296); // 12 * 3600 + 34 * 60 + 56
    });

    it('should handle empty string', () => {
      expect(() => parseExpireTime('')).toThrow('Invalid expire time format');
    });

    it('should handle partial matches correctly', () => {
      const testCases = [
        { input: '1h', expected: 3600 },
        { input: '30m', expected: 1800 },
        { input: '45s', expected: 45 },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseExpireTime(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('getRemainingTime', () => {
    const originalDateNow = Date.now;
    let dateNowSpy: jest.SpyInstance;
    let translateSpy: jest.SpyInstance;

    beforeEach(() => {
      dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00 UTC
      translateSpy = jest.spyOn(mockI18nService, 'translate');
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });

    it('should return expired message when time has passed', () => {
      const expiredAt = 1640995100; // 100 seconds before current time
      translateSpy.mockReturnValue('Payment expired');

      const result = getRemainingTime(expiredAt, 'en', mockI18nService);

      expect(dateNowSpy).toHaveBeenCalledTimes(1);
      expect(translateSpy).toHaveBeenCalledWith('common.date.expiredTime', {
        args: { lang: 'en' },
      });
      expect(result).toBe('Payment expired');
    });

    it('should return expired message when time equals current time', () => {
      const expiredAt = 1640995200; // Exactly current time
      translateSpy.mockReturnValue('Hết hạn thanh toán');

      const result = getRemainingTime(expiredAt, 'vi', mockI18nService);

      expect(dateNowSpy).toHaveBeenCalledTimes(1);
      expect(translateSpy).toHaveBeenCalledWith('common.date.expiredTime', {
        args: { lang: 'vi' },
      });
      expect(result).toBe('Hết hạn thanh toán');
    });

    it('should return minutes only when less than 1 hour remaining', () => {
      const expiredAt = 1640995800; // 10 minutes from current time
      translateSpy.mockReturnValue('10 minutes left');

      const result = getRemainingTime(expiredAt, 'en', mockI18nService);

      expect(dateNowSpy).toHaveBeenCalledTimes(1);
      expect(translateSpy).toHaveBeenCalledWith('common.date.remainingMinutesPayment', {
        args: { lang: 'en', minutes: 10 },
      });
      expect(result).toBe('10 minutes left');
    });

    it('should return hours and minutes when more than 1 hour remaining', () => {
      const expiredAt = 1640999400; // 1 hour 10 minutes from current time
      translateSpy.mockReturnValue('1 hour 10 minutes left');

      const result = getRemainingTime(expiredAt, 'en', mockI18nService);

      expect(dateNowSpy).toHaveBeenCalledTimes(1);
      expect(translateSpy).toHaveBeenCalledWith('common.date.remainingPayment', {
        args: { lang: 'en', hours: 1, minutes: 10 },
      });
      expect(result).toBe('1 hour 10 minutes left');
    });

    it('should handle exactly 1 hour remaining', () => {
      const expiredAt = 1640998800; // Exactly 1 hour from current time
      translateSpy.mockReturnValue('1 hour 0 minutes left');

      const result = getRemainingTime(expiredAt, 'en', mockI18nService);

      expect(dateNowSpy).toHaveBeenCalledTimes(1);
      expect(translateSpy).toHaveBeenCalledWith('common.date.remainingPayment', {
        args: { lang: 'en', hours: 1, minutes: 0 },
      });
      expect(result).toBe('1 hour 0 minutes left');
    });

    it('should handle multiple hours correctly', () => {
      const expiredAt = 1641006000; // 3 hours from current time
      translateSpy.mockReturnValue('3 hours 0 minutes left');

      const result = getRemainingTime(expiredAt, 'en', mockI18nService);

      expect(dateNowSpy).toHaveBeenCalledTimes(1);
      expect(translateSpy).toHaveBeenCalledWith('common.date.remainingPayment', {
        args: { lang: 'en', hours: 3, minutes: 0 },
      });
      expect(result).toBe('3 hours 0 minutes left');
    });

    it('should handle Vietnamese language correctly', () => {
      const expiredAt = 1640996100; // 15 minutes from current time
      translateSpy.mockReturnValue('Còn lại 15 phút');

      const result = getRemainingTime(expiredAt, 'vi', mockI18nService);

      expect(dateNowSpy).toHaveBeenCalledTimes(1);
      expect(translateSpy).toHaveBeenCalledWith('common.date.remainingMinutesPayment', {
        args: { lang: 'vi', minutes: 15 },
      });
      expect(result).toBe('Còn lại 15 phút');
    });

    it('should use default English language when not specified', () => {
      const expiredAt = 1640995800; // 10 minutes from current time
      translateSpy.mockReturnValue('10 minutes left');

      const result = getRemainingTime(expiredAt, undefined, mockI18nService);

      expect(dateNowSpy).toHaveBeenCalledTimes(1);
      expect(translateSpy).toHaveBeenCalledWith('common.date.remainingMinutesPayment', {
        args: { lang: 'en', minutes: 10 },
      });
      expect(result).toBe('10 minutes left');
    });

    it('should handle very small remaining time (less than 1 minute)', () => {
      const expiredAt = 1640995230; // 30 seconds from current time
      translateSpy.mockReturnValue('0 minutes left');

      const result = getRemainingTime(expiredAt, 'en', mockI18nService);

      expect(dateNowSpy).toHaveBeenCalledTimes(1);
      expect(translateSpy).toHaveBeenCalledWith('common.date.remainingMinutesPayment', {
        args: { lang: 'en', minutes: 0 },
      });
      expect(result).toBe('0 minutes left');
    });

    it('should handle large remaining time correctly', () => {
      const expiredAt = 1641081600; // 24 hours from current time
      const i18nMockSpy = jest
        .spyOn(mockI18nService, 'translate')
        .mockReturnValue('24 hours 0 minutes left');

      const result = getRemainingTime(expiredAt, 'en', mockI18nService);

      expect(i18nMockSpy).toHaveBeenCalledWith('common.date.remainingPayment', {
        args: { lang: 'en', hours: 24, minutes: 0 },
      });
      expect(result).toBe('24 hours 0 minutes left');
    });

    it('should handle complex time calculations correctly', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1640994420 * 1000);

      const testCases = [
        {
          expiredAt: 1640999520, // cách 5100s = 1h25m
          expectedHours: 1,
          expectedMinutes: 25,
          useHourFormat: true,
        },
        {
          expiredAt: 1640997120, // cách 2700s = 45m
          expectedMinutes: 45,
          useHourFormat: false,
        },
        {
          expiredAt: 1641006120, // cách 11700s = 3h15m
          expectedHours: 3,
          expectedMinutes: 15,
          useHourFormat: true,
        },
      ];

      testCases.forEach(({ expiredAt, expectedHours, expectedMinutes, useHourFormat }) => {
        const i18nMockSpy = jest
          .spyOn(mockI18nService, 'translate')
          .mockReturnValue('mocked result');

        getRemainingTime(expiredAt, 'en', mockI18nService);

        if (useHourFormat) {
          expect(i18nMockSpy).toHaveBeenCalledWith('common.date.remainingPayment', {
            args: { lang: 'en', hours: expectedHours, minutes: expectedMinutes },
          });
        } else {
          expect(i18nMockSpy).toHaveBeenCalledWith('common.date.remainingMinutesPayment', {
            args: { lang: 'en', minutes: expectedMinutes },
          });
        }

        jest.clearAllMocks();
      });
    });

    it('should handle edge case with exactly 59 minutes', () => {
      const expiredAt = 1640998740; // 59 minutes from current time
      const i18nMockSpy = jest
        .spyOn(mockI18nService, 'translate')
        .mockReturnValue('59 minutes left');

      const result = getRemainingTime(expiredAt, 'en', mockI18nService);

      expect(i18nMockSpy).toHaveBeenCalledWith('common.date.remainingMinutesPayment', {
        args: { lang: 'en', minutes: 59 },
      });
      expect(result).toBe('59 minutes left');
    });

    it('should handle different i18n service responses', () => {
      const expiredAt = 1640995800; // 10 minutes from current time
      const differentResponses = ['10 minutes left', 'Còn lại 10 phút'];

      differentResponses.forEach((response) => {
        mockI18nService.translate.mockReturnValue(response);

        const result = getRemainingTime(expiredAt, 'en', mockI18nService);

        expect(result).toBe(response);
        jest.clearAllMocks();
      });
    });
  });
});
