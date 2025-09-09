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
  facebook: {
    appID: process.env.FACEBOOK_APP_ID,
    sharePostUrl: process.env.SHARE_FACEBOOK_POST_URL,
    shareMessengerUrl: process.env.SHARE_MESSENGER_URL,
  },
  frontendUrl: process.env.FRONTEND_URL,
  chatwork: {
    apiToken: process.env.CHATWORK_API_TOKEN,
    baseApi: process.env.CHATWORK_BASE_API,
    roomId: process.env.CHATWORK_ROOM_ID,
  },
});
