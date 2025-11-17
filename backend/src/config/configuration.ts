export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  auth: {
    mode: process.env.AUTH_MODE || 'local',
    serviceUrl: process.env.AUTH_SERVICE_URL,
  },
  logging: {
    level:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || 'logs/application.log',
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
      : ['http://localhost:4205', 'http://localhost:11001'],
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
});
