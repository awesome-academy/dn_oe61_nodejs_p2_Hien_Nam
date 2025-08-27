export interface RequestWithCookies {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  [key: string]: any;
}

export interface NestResponse {
  cookie(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      path?: string;
      maxAge?: number;
      expires?: Date;
    },
  ): void;

  redirect(statusOrUrl: number | string, url?: string): void;
}

export interface CookieResponse {
  clearCookie: (name: string, options?: object) => void;
  cookie(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      path?: string;
      maxAge?: number;
      expires?: Date;
    },
  ): void;
}
