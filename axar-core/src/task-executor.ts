import {
	LLMType,
	ModelName,
	QueryProcessor,
	TaskExecutorConfig,
} from "./llm/query-processor";
import { LLMHandlerFactory } from "./llm/llm-handler.factory";
import { PromptBuilder } from "./prompt-builder";

/**
 * Service for executing tasks using various LLM handlers.
 */
export class TaskExecutor {
	private promptBuilder: PromptBuilder;
	private llmType: LLMType;
	private credentials: { apiKey: string };
	private modelName: ModelName;

	constructor(config: TaskExecutorConfig) {
		this.promptBuilder = new PromptBuilder();
		this.llmType = config.llmType;
		this.credentials = config.credentials;
		this.modelName = config.taskConfig.modelName;
	}

	/**
	 * Executes a task by processing the query with the provided task handler.
	 * @param schema - The schema for validating the output.
	 * @param query - The input query to process.
	 * @param shots - Optional additional configuration (e.g., examples).
	 * @param taskHandler - The pre-configured handler for processing the task.
	 * @returns A Promise that resolves to the processed result.
	 */
	async executeTask(
		schema: any,
		query: string,
		shots: any = null,
		taskHandler: QueryProcessor
	): Promise<any> {
		const promptSchema = await this.promptBuilder.generatePrompt(schema);

		const shotsSchema = await this.promptBuilder.generateShots(
			schema,
			shots,
			query
		);

		const schemaName = schema.name;
		const schemaDescription = schema.description;
		return taskHandler.processQuery(
			promptSchema,
			query,
			schemaName,
			schemaDescription,
			shotsSchema
		);
	}

	/**
	 * Initializes and returns the appropriate LLM handler based on configuration.
	 * @returns A Promise that resolves to a QueryProcessor instance.
	 */
	async getTaskHandler(): Promise<QueryProcessor> {
		const llmHandler = await new LLMHandlerFactory().getHandler(
			this.llmType,
			this.credentials.apiKey,
			this.modelName
		);
		return llmHandler;
	}
}
