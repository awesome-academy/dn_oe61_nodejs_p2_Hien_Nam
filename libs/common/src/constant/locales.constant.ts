export const SUPPORTED_LOCALES = {
  vi: 'vi',
  en: 'en',
} as const;
export type SupportedLocalesType = keyof typeof SUPPORTED_LOCALES;
