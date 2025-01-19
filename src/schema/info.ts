import { SchemaConstructor } from './types';
import { META_KEYS } from './meta-keys';
import { ZodSchema } from 'zod';

/**
 * Checks if a class has an associated Zod schema.
 *
 * This function determines whether the specified class constructor
 * has been decorated with a Zod schema, by checking for the presence
 * of metadata associated with the schema.
 *
 * @param target - The class constructor to check for schema metadata.
 * @returns A boolean indicating if the Zod schema metadata is present.
 */
export function hasSchemaDef(target: SchemaConstructor): boolean {
  return Reflect.hasMetadata(META_KEYS.SCHEMA_DEF, target);
}

/**
 * Retrieves the Zod schema associated with the specified class constructor.
 *
 * @param target - The class constructor to retrieve the schema for.
 * @returns The Zod schema associated with the class constructor
 * @throws Error if no schema is present.
 */
export function getSchemaDef(target: SchemaConstructor): ZodSchema {
  const schema = Reflect.getMetadata(META_KEYS.SCHEMA_DEF, target);
  if (!schema) {
    throw new Error(
      `No schema found for ${target.name}. Did you apply @schema decorator?`,
    );
  }
  return schema;
}
