import * as AxarCore from "./../../src/index"; // Adjust the path to your index file.

describe("Module Exports", () => {
	it("should export createTaskExecutor function", () => {
		expect(typeof AxarCore.createTaskExecutor).toBe("function");
	});

	it("should export LLMType enum", () => {
		expect(AxarCore.LLMType).toBeDefined();
		expect(typeof AxarCore.LLMType).toBe("object");
		expect(Object.keys(AxarCore.LLMType)).toContain("OPENAI");
	});

	it("should export ModelName enum", () => {
		expect(AxarCore.ModelName).toBeDefined();
		expect(typeof AxarCore.ModelName).toBe("object");
		expect(Object.keys(AxarCore.ModelName)).toContain("GPT_4");
	});
});
