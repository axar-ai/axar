import { TaskExecutorConfig } from "llm/query-processor";
import { TaskExecutorService } from "./task-executor.service";

/**
 * Factory function to create a task executor with the provided configuration.
 * @param config - The configuration object containing the LLM type, credentials, and model name.
 * @returns An object with the executeTask method.
 */

export interface TaskExecutor {
  executeTask: (schema: any, query: any, shots?: any) => Promise<any>;
}

export function createTaskExecutor(config: TaskExecutorConfig): TaskExecutor {
  const taskExecutorService = new TaskExecutorService(config);

  return {
    /**
     * Execute the task using the provided schema and query.
     * @param schema - The schema for validating the output.
     * @param query - The input query to process.
     * @param shots - Optional additional configuration (e.g., examples).
     * @returns A Promise that resolves to the processed result.
     */
    async executeTask(schema: any, query: any, shots: any = null) {
      const taskHandler = await taskExecutorService.getTaskHandler();
      return taskExecutorService.executeTask(schema, query, shots, taskHandler);
    },
  };
}
