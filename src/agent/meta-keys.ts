export const META_KEYS = {
  MODEL: Symbol('axar:model'),
  MODEL_CONFIG: Symbol('axar:modelConfig'),
  SYSTEM_PROMPTS: Symbol('axar:systemPrompts'),
  TOOLS: Symbol('axar:tools'),
  OUTPUT: Symbol('axar:output'),
  INPUT: Symbol('axar:input'),
  MCP_SERVERS: Symbol('axar:mcpServers'),
  AGENT_TOOLS: Symbol('axar:agentTools'),
} as const;
