/**
 * Represents a class constructor that creates schema instances.
 * Constructor must not require any arguments.
 *
 * @template T - The type of schema being constructed
 */
export type SchemaConstructor<T = any> = { new (): T };

/**
 * Configuration options for schema-level decorators.
 * Used to provide metadata about the entire schema.
 *
 * @property description - Human-readable description of the schema
 * @property example - Example value representing valid schema data
 * @property deprecated - Indicates if the schema is deprecated
 */
export type SchemaOptions = Readonly<{
  description?: string;
  example?: any;
  deprecated?: boolean;
}>;

/**
 * Configuration options for property-level decorators.
 * Used to provide metadata about individual properties.
 *
 * @property description - Human-readable description of the property
 * @property example - Example value for the property
 */
export type PropertyOptions = Readonly<{
  description?: string;
  example?: any;
}>;

/**
 * Available validation rules for string properties.
 * Each type corresponds to a specific validation check.
 *
 * - email: Validates email format
 * - url: Validates URL format
 * - pattern: Validates against a regex pattern
 * - min/max: Validates string length
 * - uuid: Validates UUID format
 * - cuid: Validates CUID format
 * - datetime: Validates ISO datetime format
 * - ip: Validates IP address format
 */
type StringValidation =
  | 'email'
  | 'url'
  | 'pattern'
  | 'min'
  | 'max'
  | 'uuid'
  | 'cuid'
  | 'datetime'
  | 'ip';

/**
 * Available validation rules for number properties.
 * Each type corresponds to a specific validation check.
 *
 * - minimum/maximum: Validates value bounds (inclusive)
 * - exclusiveMinimum/exclusiveMaximum: Validates value bounds (exclusive)
 * - multipleOf: Validates number is multiple of given value
 * - integer: Validates number is an integer
 */
type NumberValidation =
  | 'minimum'
  | 'maximum'
  | 'exclusiveMinimum'
  | 'exclusiveMaximum'
  | 'multipleOf'
  | 'integer';

/**
 * Available validation rules for array properties.
 * Each type corresponds to a specific validation check.
 *
 * - minItems: Validates minimum array length
 * - maxItems: Validates maximum array length
 * - uniqueItems: Validates all items are unique
 */
type ArrayValidation = 'minItems' | 'maxItems' | 'uniqueItems';

/**
 * Represents a single validation rule with its parameters.
 * Used to define validation constraints on schema properties.
 *
 * @property type - The type of validation to perform
 * @property params - Optional parameters for the validation rule
 *
 * @example
 * ```ts
 * const emailRule: ValidationRule = { type: 'email' };
 * const minLengthRule: ValidationRule = { type: 'min', params: [3] };
 * ```
 */
export type ValidationRule = {
  type: StringValidation | NumberValidation | ArrayValidation | 'enum';
  params?: any[];
};
