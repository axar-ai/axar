import { META_KEYS } from './meta-keys';
import { ValidationRule } from './types';

/**
 * Registers a property in the metadata registry for schema generation.
 * Ensures each property is only registered once.
 *
 * @param target - The target object (typically the class prototype)
 * @param propertyKey - The property symbol
 */
export function registerProperty(target: Object, propertyKey: string | symbol) {
  const propertyKeyStr = propertyKey.toString();
  const properties: string[] =
    Reflect.getMetadata(META_KEYS.PROPERTIES, target) || [];
  if (!properties.includes(propertyKeyStr)) {
    properties.push(propertyKeyStr);
    Reflect.defineMetadata(META_KEYS.PROPERTIES, properties, target);
  }
}

/**
 * Adds a validation rule to a property's metadata.
 *
 * @param target - The target object
 * @param propertyKey - The property to validate
 * @param rule - The validation rule to add
 *
 * @example
 * ```typescript
 * addValidationRule(user, 'age', {
 *   type: 'minimum',
 *   params: [0]
 * });
 * ```
 */
export function addValidationRule(
  target: Object,
  propertyKey: string | symbol,
  rule: ValidationRule,
): void {
  const propertyKeyStr = propertyKey.toString();
  const existingRules = getValidationMetadata(target, propertyKeyStr);
  existingRules.push(rule);
  setValidationMetadata(target, propertyKeyStr, existingRules);
}

/**
 * Retrieves validation rules for a property.
 *
 * @param target - The target object
 * @param propertyKey - The property to get validation rules for
 * @returns Array of validation rules
 */
function getValidationMetadata(
  target: Object,
  propertyKey: string,
): ValidationRule[] {
  return (
    Reflect.getMetadata(META_KEYS.PROPERTY_RULES, target, propertyKey) || []
  );
}

/**
 * Sets validation rules for a property.
 *
 * @param target - The target object
 * @param propertyKey - The property to set validation rules for
 * @param rules - Array of validation rules to set
 * @throws {Error} If any required parameter is missing or if operation fails
 */
function setValidationMetadata(
  target: Object,
  propertyKey: string,
  rules: ValidationRule[],
): void {
  Reflect.defineMetadata(META_KEYS.PROPERTY_RULES, rules, target, propertyKey);
}
