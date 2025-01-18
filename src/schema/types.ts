/**
 * Schemas have constructors with no argument
 */
export type SchemaConstructor<T = any> = { new (): T };

/**
 * Options for schema annotation
 */
export type SchemaOptions = Readonly<{
  description?: string;
  example?: any;
  deprecated?: boolean;
}>;

export type PropertyOptions = Readonly<{
  description?: string;
  example?: any;
}>;

/**
 * String validation rule types
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
 * Number validation rule types
 */
type NumberValidation =
  | 'minimum'
  | 'maximum'
  | 'exclusiveMinimum'
  | 'exclusiveMaximum'
  | 'multipleOf'
  | 'integer';

/**
 * Array validation rule types
 */
type ArrayValidation = 'minItems' | 'maxItems' | 'uniqueItems';

export type ValidationRule = {
  type: StringValidation | NumberValidation | ArrayValidation | 'enum';
  params?: any[];
};
