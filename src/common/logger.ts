import pino from 'pino';

const logger = pino({
  level: process.env.AXAR_LOG_LEVEL || 'info',
});

export default logger;
