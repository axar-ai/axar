import pino from 'pino';

const isNotProduction = process.env.NODE_ENV !== 'production';

const logger = pino({
  // Default to 'debug' in development and 'info' in production
  level: process.env.AXAR_LOG_LEVEL || (isNotProduction ? 'info' : 'info'),
  transport: isNotProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      }
    : undefined, // Use default JSON output in production
});

export default logger;
