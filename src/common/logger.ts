import pino from 'pino';

const isNotProduction = process.env.NODE_ENV !== 'production';

// Check if pino-pretty is available
const getPrettyTransport = () => {
  if (!isNotProduction) return undefined;

  try {
    require.resolve('pino-pretty');
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    };
  } catch (e) {
    // Silently fallback to default transport if pino-pretty is not available
    return undefined;
  }
};

const logger = pino({
  level: process.env.AXAR_LOG_LEVEL || (isNotProduction ? 'debug' : 'info'),
  transport: getPrettyTransport(),
});

export default logger;
