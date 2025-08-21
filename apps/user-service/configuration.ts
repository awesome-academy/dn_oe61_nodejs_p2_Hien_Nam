export default () => ({
  app: {
    port: process.env.PORT || 3004,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});
