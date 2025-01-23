import {
  trace,
  context,
  SpanStatusCode,
  Span,
  Context,
  Tracer,
} from '@opentelemetry/api';
import { Telemetry } from '../../../src/common/telemetry';
import { z } from 'zod';

// Mock OpenTelemetry modules
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: jest.fn(),
    setSpan: jest.fn(),
  },
  context: {
    active: jest.fn(),
    with: jest.fn(),
  },
  SpanStatusCode: {
    ERROR: 'ERROR',
  },
}));

// Test class to ensure proper constructor name
class TestObject {
  constructor(public name: string) {}
}

describe('Telemetry', () => {
  let mockTracer: jest.Mocked<Tracer>;
  let mockSpan: jest.Mocked<Partial<Span>>;
  let mockContext: Context;
  let telemetry: Telemetry<TestObject>;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock span
    mockSpan = {
      setAttribute: jest.fn(),
      end: jest.fn(),
      recordException: jest.fn(),
      setStatus: jest.fn(),
      isRecording: jest.fn().mockReturnValue(true),
    };
    
    // Setup mock tracer
    mockTracer = {
      startSpan: jest.fn().mockReturnValue(mockSpan),
    } as any;
    
    // Setup mock context
    mockContext = {} as Context;
    
    // Setup trace mock implementations
    (trace.getTracer as jest.Mock).mockReturnValue(mockTracer);
    (context.active as jest.Mock).mockReturnValue(mockContext);
    (trace.setSpan as jest.Mock).mockReturnValue(mockContext);
    (context.with as jest.Mock).mockImplementation((ctx, fn) => fn());
    
    // Create telemetry instance with TestObject instance
    telemetry = new Telemetry(new TestObject('test'));
  });

  describe('addAttribute', () => {
    it('should add string attribute', () => {
      // Force create span
      telemetry.withSpan('test', async () => {});
      
      telemetry.addAttribute('key', 'value');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('key', 'value');
    });

    it('should handle string array attribute', () => {
      telemetry.withSpan('test', async () => {});
      
      telemetry.addAttribute('key', ['value1', 'value2']);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('key', '["value1","value2"]');
    });

    it('should handle Zod schema attribute', () => {
      telemetry.withSpan('test', async () => {});
      
      const schema = z.object({ field: z.string() });
      telemetry.addAttribute('key', schema);
      expect(mockSpan.setAttribute).toHaveBeenCalled();
      const call = (mockSpan.setAttribute as jest.Mock).mock.calls[0];
      expect(call[0]).toBe('key');
      expect(JSON.parse(call[1])).toMatchObject({
        type: 'object',
        properties: {
          field: { type: 'string' }
        }
      });
    });

    it('should handle object attribute', () => {
      telemetry.withSpan('test', async () => {});
      
      const obj = { field: 'value' };
      telemetry.addAttribute('key', obj);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('key', JSON.stringify(obj));
    });

    it('should ignore undefined and null values', () => {
      telemetry.withSpan('test', async () => {});
      
      telemetry.addAttribute('key', undefined);
      telemetry.addAttribute('key2', null);
      expect(mockSpan.setAttribute).not.toHaveBeenCalled();
    });
  });

  describe('withSpan', () => {
    it('should create and end span for successful operation', async () => {
      const result = await telemetry.withSpan('testMethod', async () => 'result');
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('TestObject.testMethod');
      expect(result).toBe('result');
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle errors and record them in span', async () => {
      const error = new Error('Test error');
      
      await expect(
        telemetry.withSpan('testMethod', async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Test error'
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle non-Error objects in operation errors', async () => {
      const stringError = 'String error message';
      
      await expect(
        telemetry.withSpan('testMethod', async () => {
          throw stringError;
        })
      ).rejects.toBe(stringError);

      const recordedError = (mockSpan.recordException as jest.Mock).mock.calls[0][0];
      expect(recordedError).toBeInstanceOf(Error);
      expect(recordedError.message).toBe(stringError);
      
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: stringError
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle errors when span is undefined', async () => {
      // Force span to be undefined by making startSpan fail
      (mockTracer.startSpan as jest.Mock).mockImplementationOnce(() => {
        return undefined;
      });

      const error = new Error('Operation error');
      await expect(
        telemetry.withSpan('testMethod', async () => {
          throw error;
        })
      ).rejects.toThrow('Operation error');

      // Verify that no span operations were called
      expect(mockSpan.recordException).not.toHaveBeenCalled();
      expect(mockSpan.setStatus).not.toHaveBeenCalled();
    });

    it('should handle errors in span creation', async () => {
      const error = new Error('Span creation failed');
      (mockTracer.startSpan as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      await expect(
        telemetry.withSpan('testMethod', async () => 'result')
      ).rejects.toThrow('Failed to start span: Span creation failed');
    });

    it('should handle non-Error objects in span creation errors', async () => {
      (mockTracer.startSpan as jest.Mock).mockImplementationOnce(() => {
        throw 'Some string error';
      });

      await expect(
        telemetry.withSpan('testMethod', async () => 'result')
      ).rejects.toThrow('Failed to start span: Some string error');
    });
  });

  describe('getContext', () => {
    it('should return context with active span when span exists', () => {
      telemetry.withSpan('test', async () => {});
      
      const ctx = telemetry.getContext();
      expect(trace.setSpan).toHaveBeenCalledWith(mockContext, mockSpan);
      expect(ctx).toBe(mockContext);
    });

    it('should return active context when no span exists', () => {
      const ctx = telemetry.getContext();
      expect(context.active).toHaveBeenCalled();
      expect(ctx).toBe(mockContext);
    });
  });

  describe('isRecording', () => {
    it('should return false when no span exists', () => {
      expect(telemetry.isRecording()).toBe(false);
    });

    it('should return span recording status when span exists', () => {
      telemetry.withSpan('test', async () => {});
      expect(telemetry.isRecording()).toBe(true);
      
      (mockSpan.isRecording as jest.Mock).mockReturnValue(false);
      expect(telemetry.isRecording()).toBe(false);
    });
  });
}); 