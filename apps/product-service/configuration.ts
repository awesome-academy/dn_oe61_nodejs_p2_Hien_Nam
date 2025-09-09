export default () => ({
  app: {
    port: process.env.PORT || 3003,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  cache: {
    appPrefix: process.env.CACHE_APP_PREFIX,
    ttl: process.env.CACHE_TTL_DEFAULT,
  },
  payOS: {
    clientId: process.env.CLIENT_ID,
    apiKey: process.env.API_KEY,
    checkSumKey: process.env.CHECK_SUM_KEY,
    endpoint: process.env.PAYOS_ENDPOINT,
    expireTime: process.env.EXPIRE_TIME,
    reminderBeforeExpire: process.env.REMINDER_BEFOR_EXPIRED,
  },
});
