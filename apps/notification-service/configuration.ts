export default () => ({
  app: {
    port: process.env.PORT || 3002,
    frontendUrl: process.env.FRONTEND_URL,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM,
  },
});
