export const META_KEYS = {
  SCHEMA: Symbol("axar:schema"),
  MODEL: Symbol("axar:model"),
  SYSTEM_PROMPTS: Symbol("axar:systemPrompts"),
  TOOLS: Symbol("axar:tools"),
  OUTPUT_SCHEMA: Symbol("axar:outputSchema"),
  PROPERTIES: Symbol("axar:properties"),
  OPTIONAL: Symbol("axar:optional"),
  ARRAY_ITEM_TYPE: Symbol("axar:arrayItemType"),
  DESCRIPTION: Symbol("axar:description"),
  ENUM_VALUES: Symbol("axar:enumValues"),
  EXAMPLE: Symbol("axar:example"),
} as const;
