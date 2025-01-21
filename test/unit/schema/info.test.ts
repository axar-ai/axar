import { describe, it, expect } from '@jest/globals';
import { schema } from '../../../src/schema/decorators';
import { hasSchemaDef, getSchemaDef } from '../../../src/schema/info';
import { SchemaConstructor } from '../../../src/schema/types';

describe('Schema Info', () => {
  it('should return true for class with schema decorator', () => {
    @schema()
    class WithSchema {}

    expect(hasSchemaDef(WithSchema)).toBe(true);
  });

  it('should return false for class without schema decorator', () => {
    class WithoutSchema {}

    expect(hasSchemaDef(WithoutSchema)).toBe(false);
  });

  it('should return false for non-class objects', () => {
    const obj = { constructor: {} };
    expect(hasSchemaDef(obj as unknown as SchemaConstructor)).toBe(false);

    const func = function () {};
    expect(hasSchemaDef(func as unknown as SchemaConstructor)).toBe(false);
  });

  class NoSchema {}

  @schema()
  class WithSchema {}

  it('should throw when getting schema for class without schema decorator', () => {
    expect(() => getSchemaDef(NoSchema)).toThrow(
      'No schema found for NoSchema. Did you apply @schema decorator?',
    );
  });

  it('should not throw when getting schema for class with schema decorator', () => {
    expect(() => getSchemaDef(WithSchema)).not.toThrow();
  });
});
