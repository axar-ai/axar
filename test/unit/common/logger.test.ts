import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import logger from '../../../src/common/logger';

describe('Logger', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use info level by default in development', () => {
    process.env.NODE_ENV = 'development';
    expect(logger.level).toBe('info');
  });

  it('should use info level by default in production', () => {
    process.env.NODE_ENV = 'production';
    expect(logger.level).toBe('info');
  });

  it('should use custom level when AXAR_LOG_LEVEL is set', () => {
    process.env.AXAR_LOG_LEVEL = 'debug';
    const customLogger = require('../../../src/common/logger').default;
    expect(customLogger.level).toBe('debug');
  });
});
