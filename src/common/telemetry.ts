import {
  trace,
  context,
  Tracer,
  Span,
  Context,
  SpanStatusCode,
} from '@opentelemetry/api';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ZodSchema } from 'zod';

/**
 * Type definition for valid attribute values in telemetry spans
 */
type AttributeValue = string | ZodSchema | string[] | Object | undefined | null;

/**
 * Telemetry class that provides a wrapper around OpenTelemetry functionality
 * for tracking and monitoring application behavior.
 *
 * @template T - The type of object being monitored. Must extend Object.
 */
export class Telemetry<T extends Object> {
  private readonly tracer: Tracer;
  private span?: Span;

  /**
   * Creates a new Telemetry instance
   * @param object - The object to monitor. Used to generate span names based on the constructor name.
   */
  constructor(private readonly object: T) {
    this.tracer = trace.getTracer(`${this.object.constructor.name}`);
  }

  /**
   * Starts a new span with the given method name
   * @param method - The method name to use for the span
   * @throws Error if span creation fails
   */
  private startSpan(method: string): void {
    try {
      this.span = this.tracer.startSpan(
        `${this.object.constructor.name}.${method}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start span: ${errorMessage}`);
    }
  }

  /**
   * Ends the current span if it exists and cleans up resources
   */
  private endSpan(): void {
    this.span?.end();
    this.span = undefined;
  }

  /**
   * Adds an attribute to the current span if telemetry is enabled
   * @param key - The attribute key to be added to the span
   * @param value - The attribute value. Can be:
   *   - string: Added directly as an attribute
   *   - ZodSchema: Converted to JSON schema before adding
   *   - string[]: Stringified before adding
   *   - Object: Stringified with indentation before adding
   *   - undefined/null: Ignored
   * @example
   * ```typescript
   * telemetry.addAttribute('userId', '12345');
   * telemetry.addAttribute('requestBody', userSchema);
   * telemetry.addAttribute('tags', ['important', 'urgent']);
   * ```
   */
  public addAttribute(key: string, value: AttributeValue): void {
    if (!this.span || value === undefined || value === null) {
      return;
    }

    if (typeof value === 'string') {
      this.span.setAttribute(key, value);
      return;
    }

    if (Array.isArray(value)) {
      this.span.setAttribute(key, JSON.stringify(value));
      return;
    }

    if (value instanceof ZodSchema) {
      const jsonSchema = zodToJsonSchema(value, {
        $refStrategy: 'none',
        errorMessages: false,
      });
      this.span.setAttribute(key, JSON.stringify(jsonSchema));
      return;
    }

    this.span.setAttribute(key, JSON.stringify(value));
  }

  /**
   * Executes an operation within a new span, providing automatic error handling
   * and context management.
   *
   * @param method - The method name for the span. Must not be empty.
   * @param operation - The async operation to execute within the span
   * @returns The result of the operation
   * @throws Any error from the operation, after recording it in the span
   *
   * @example
   * ```typescript
   * const result = await telemetry.withSpan('processUser', async () => {
   *   const user = await processUserData();
   *   return user;
   * });
   * ```
   */
  public async withSpan<R>(
    method: string,
    operation: () => Promise<R>,
  ): Promise<R> {
    this.startSpan(method);
    try {
      return await context.with(
        trace.setSpan(context.active(), this.span!),
        operation,
      );
    } catch (error) {
      if (this.span) {
        const errorObject =
          error instanceof Error ? error : new Error(String(error));
        this.span.recordException(errorObject);
        this.span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorObject.message,
        });
      }
      throw error;
    } finally {
      this.endSpan();
    }
  }

  /**
   * Gets the current context with the active span
   * @returns The current context with the active span if one exists,
   *          otherwise returns the active context
   */
  public getContext(): Context {
    return this.span
      ? trace.setSpan(context.active(), this.span)
      : context.active();
  }

  public isRecording(): boolean {
    return this.span !== undefined && this.span.isRecording();
  }
}
