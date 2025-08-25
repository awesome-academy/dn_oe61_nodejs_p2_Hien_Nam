export default () => ({
  app: {
    port: process.env.PORT || 3000,
  },
  cookie: {
    accessTokenTTL: process.env.COOKIE_ACCESSTOKEN_TTL,
    httpOnly: process.env.COOKIE_HTTPONLY,
    secure: process.env.COOKIE_SECURE,
    sameSite: process.env.COOKIE_SAMESITE,
  },
});
