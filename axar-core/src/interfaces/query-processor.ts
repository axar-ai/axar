export interface QueryProcessor {
	processQuery(
		schema: any,
		query: any,
		schemaName: string,
		schemaDescription: string
	): Promise<any>;
}

export enum LLMType {
	OPENAI = "openai",
	ANTHROPIC = "anthropic",
	COHERE = "cohere",
	GPT4ALL = "gpt4all",
}

export enum ModelName {
	GPT_4 = "gpt-4",
	GPT_4O = "gpt-4o",
	GPT_4_TURBO = "gpt-4-turbo",
	GPT_3_5 = "gpt-3.5-turbo",
	GPT_3_5_16K = "gpt-3.5-turbo-16k",
	CLAUDE_V1 = "claude-v1",
	CLAUDE_V2 = "claude-v2",
	COHERE_COMMAND_XLARGE = "command-xlarge",
	COHERE_COMMAND_MEDIUM = "command-medium",
}

export interface TaskExecutorConfig {
	llmType: LLMType;
	credentials: {
		apiKey: string;
	};
	taskConfig: {
		modelName: ModelName;
	};
}
