export const META_KEYS = {
  MODEL: Symbol('axar:model'),
  SYSTEM_PROMPTS: Symbol('axar:systemPrompts'),
  TOOLS: Symbol('axar:tools'),
  OUTPUT: Symbol('axar:output'),
  INPUT: Symbol('axar:input'),
} as const;

// Add new meta key for maximum steps configuration
export const META_KEYS = {
  MODEL: Symbol('axar:model'),
  SYSTEM_PROMPTS: Symbol('axar:systemPrompts'),
  TOOLS: Symbol('axar:tools'),
  OUTPUT: Symbol('axar:output'),
  INPUT: Symbol('axar:input'),
  MAX_STEPS: Symbol('axar:maxSteps'),
} as const;
