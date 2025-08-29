export default () => ({
  app: {
    port: process.env.PORT || 3003,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});
