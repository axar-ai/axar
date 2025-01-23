import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock pino to control transport configuration
jest.mock('pino', () => {
  return jest.fn((config) => ({
    level: config.level,
    transport: config.transport
  }));
});

describe('Logger', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should use info level by default in development', () => {
    process.env.NODE_ENV = 'development';
    const logger = require('../../../src/common/logger').default;
    expect(logger.level).toBe('info');
  });

  it('should use info level by default in production', () => {
    process.env.NODE_ENV = 'production';
    const logger = require('../../../src/common/logger').default;
    expect(logger.level).toBe('info');
  });

  it('should use custom level when AXAR_LOG_LEVEL is set', () => {
    process.env.AXAR_LOG_LEVEL = 'debug';
    const logger = require('../../../src/common/logger').default;
    expect(logger.level).toBe('debug');
  });

  it('should use pino-pretty transport in development', () => {
    process.env.NODE_ENV = 'development';
    const logger = require('../../../src/common/logger').default;
    expect(logger.transport).toBeDefined();
    expect(logger.transport.target).toBe('pino-pretty');
    expect(logger.transport.options).toEqual({
      colorize: true,
    });
  });

  it('should use default JSON transport in production', () => {
    process.env.NODE_ENV = 'production';
    const logger = require('../../../src/common/logger').default;
    expect(logger.transport).toBeUndefined();
  });

  it('should handle test environment as non-production', () => {
    process.env.NODE_ENV = 'test';
    const logger = require('../../../src/common/logger').default;
    expect(logger.transport).toBeDefined();
    expect(logger.transport.target).toBe('pino-pretty');
  });
});
