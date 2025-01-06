export const META_KEYS = {
  SCHEMA: Symbol('axar:schema'),
  SCHEMA_DEF: Symbol('axar:schemaDef'),
  PROPERTY: Symbol('axar:property'),
  PROPERTIES: Symbol('axar:properties'),
  PROPERTY_RULES: Symbol('axar:propertyRules'),
  OPTIONAL: Symbol('axar:optional'),
  ARRAY_ITEM_TYPE: Symbol('axar:arrayItemType'),
  ENUM_VALUES: Symbol('axar:enumValues'),
} as const;
