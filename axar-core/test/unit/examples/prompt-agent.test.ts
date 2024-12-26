import { PromptAgent } from "./../../../src/examples/prompt-agent"; // Adjust the import path as needed

describe("PromptAgent", () => {
	let promptAgent: PromptAgent;

	beforeEach(() => {
		promptAgent = new PromptAgent("Frank");
	});

	it("should return the correct user's name when run is called", async () => {
		// Simulate the behavior of `run` method
		const result = await promptAgent.run("What is the user's name?");

		// Check if the result matches the expected format
		expect(result).toBe("The user's name is 'Frank'");
	});

	it("should return the correct date when run is called", async () => {
		// Simulate the behavior of `run` method
		const result = await promptAgent.run("What is the date?");

		// Get the current date in the same format as the agent's output
		const expectedDate = `Today is ${new Date().toDateString()}`;

		// Check if the result matches the expected format
		expect(result).toBe(expectedDate);
	});

	it("should return a string when run is called", async () => {
		// Simulate the behavior of `run` method
		const result = await promptAgent.run("What is the date?");

		// Check if the result is a string
		expect(typeof result).toBe("string");
	});
});
