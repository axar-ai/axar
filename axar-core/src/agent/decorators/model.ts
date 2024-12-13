// src/decorators/model.ts
import "reflect-metadata";
import { META_KEYS } from "./metaKeys";

/**
 * `model` decorator to associate a model identifier with a class.
 *
 * @param modelIdentifier - The model identifier string.
 * @returns A class decorator function.
 */
export function model(modelIdentifier: string): ClassDecorator {
  // Define the class decorator with the correct signature
  const classDecorator: ClassDecorator = function (
    constructor: Function
  ): void {
    Reflect.defineMetadata(META_KEYS.MODEL, modelIdentifier, constructor);
  };

  return classDecorator;
}
