import { RouletteAgent } from "./../../../src/examples/roulette-agent"; // Adjust the import path as needed

describe("RouletteAgent", () => {
	let rouletteAgent: RouletteAgent;

	beforeEach(() => {
		// Initialize the agent with a winning number (e.g., 18)
		rouletteAgent = new RouletteAgent(18);
	});

	it("should return true when the customer bets the winning number", async () => {
		// Simulate the behavior of `run` method with a bet on the winning number (18)
		const result = await rouletteAgent.run("Put my money on square eighteen");

		// Check if the result is true, indicating the customer is a winner
		expect(result).toBe(true);
	});

	it("should return false when the customer bets a losing number", async () => {
		// Simulate the behavior of `run` method with a bet on a losing number (e.g., 5)
		const result = await rouletteAgent.run("I bet five is the winner");

		// Check if the result is false, indicating the customer is not a winner
		expect(result).toBe(false);
	});

	it("should return a boolean value when run is called", async () => {
		// Simulate the behavior of `run` method
		const result = await rouletteAgent.run("Put my money on square eighteen");

		// Check if the result is a boolean
		expect(typeof result).toBe("boolean");
	});
});
