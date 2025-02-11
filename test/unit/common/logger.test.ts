import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock pino to control configuration
const pinoMock = jest.fn((config) => ({
  level: config.level,
}));

jest.mock('pino', () => pinoMock);

describe('Logger', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    pinoMock.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should use info level by default', () => {
    const logger = require('../../../src/common/logger').default;
    expect(logger.level).toBe('info');
  });

  it('should use custom level when AXAR_LOG_LEVEL is set', () => {
    process.env.AXAR_LOG_LEVEL = 'debug';
    const logger = require('../../../src/common/logger').default;
    expect(logger.level).toBe('debug');
  });
});
