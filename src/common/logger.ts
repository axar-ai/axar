import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
let transport = undefined;

// Only attempt to use pino-pretty in non-production
if (!isProduction) {
  try {
    // If pino-pretty is available, it will be loaded
    require('pino-pretty');
    transport = {
      target: 'pino-pretty',
      options: { colorize: true },
    };
  } catch (e) {
    console.debug(
      'pino-pretty not available, falling back to default transport',
    );
  }
}

const logger = pino({
  level: process.env.AXAR_LOG_LEVEL || 'info',
  transport,
});

export default logger;
