import { TriggerAgent } from "./../../../src/examples/airline/config/trigger-agent";
import {
	FlightCancelAgent,
	FlightChangeAgent,
	FlightModificationAgent,
} from "./../../../src/examples/airline/config/flight-modification-agent";
import { LostBaggageAgent } from "./../../../src/examples/airline/config/lost-baggage-agent";

jest.mock("./../../../src/examples/airline/config/flight-modification-agent");
jest.mock("./../../../src/examples/airline/config/lost-baggage-agent");

describe("TriggerAgent", () => {
	let cancelAgent: jest.Mocked<FlightCancelAgent>;
	let changeAgent: jest.Mocked<FlightChangeAgent>;
	let lostBaggageAgent: jest.Mocked<LostBaggageAgent>;
	let modificationAgent: FlightModificationAgent;
	let triggerAgent: TriggerAgent;

	beforeEach(() => {
		// Mock the dependencies
		cancelAgent = new FlightCancelAgent() as jest.Mocked<FlightCancelAgent>;
		changeAgent = new FlightChangeAgent() as jest.Mocked<FlightChangeAgent>;
		lostBaggageAgent = new LostBaggageAgent() as jest.Mocked<LostBaggageAgent>;

		// Create the FlightModificationAgent with mocked dependencies
		modificationAgent = new FlightModificationAgent(cancelAgent, changeAgent);

		// Create the TriggerAgent with the mocked FlightModificationAgent and LostBaggageAgent
		triggerAgent = new TriggerAgent(modificationAgent, lostBaggageAgent);
	});

	it("should call the flight modification agent when the query is related to flight cancellation", async () => {
		const cancelQuery = "I want to cancel my flight.";

		// Mocking the method of the modification agent
		cancelAgent.run.mockResolvedValue({
			confirmation: "Cancellation processed",
			details: "Cancellation processed",
		});

		const result = await triggerAgent.run(cancelQuery);

		expect(result).toEqual({
			confirmation: "Cancellation processed",
			details: "Cancellation processed",
		});
		expect(cancelAgent.run).toHaveBeenCalledWith(cancelQuery);
	});

	it("should call the flight change agent when the query is related to rescheduling", async () => {
		const changeQuery = "Can I reschedule my flight to next week?";

		// Mocking the method of the modification agent
		changeAgent.run.mockResolvedValue({
			confirmation: "Flight rescheduled",
			details: "Flight rescheduled",
		});

		const result = await triggerAgent.run(changeQuery);

		expect(result).toEqual({
			confirmation: "Flight rescheduled",
			details: "Flight rescheduled",
		});
		expect(changeAgent.run).toHaveBeenCalledWith(changeQuery);
	});

	it("should call the lost baggage agent when the query is related to lost baggage", async () => {
		const lostBaggageQuery = "My bag is missing";

		// Mocking the method of the lost baggage agent
		lostBaggageAgent.run.mockResolvedValue({
			confirmation: "Baggage search initiated",
			details: "Baggage search initiated",
		});

		const result = await triggerAgent.run(lostBaggageQuery);

		expect(result).toEqual({
			confirmation: "Baggage search initiated",
			details: "Baggage search initiated",
		});
		expect(lostBaggageAgent.run).toHaveBeenCalledWith(lostBaggageQuery);
	});

	it("should return unknown intent if the query doesn't match modify or report", async () => {
		const unclearQuery = "What options do I have?";

		// Mocking the method of both agents to avoid side effects
		cancelAgent.run.mockResolvedValue({
			confirmation: "Unknown query",
			details: "Unknown query",
		});
		changeAgent.run.mockResolvedValue({
			confirmation: "Unknown query",
			details: "Unknown query",
		});
		lostBaggageAgent.run.mockResolvedValue({
			confirmation: "Unknown query",
			details: "Unknown query",
		});

		const result = await triggerAgent.run(unclearQuery);

		expect(result).toEqual({
			confirmation: "Unknown query",
			details: "Unknown query",
		});
		expect(cancelAgent.run).not.toHaveBeenCalled();
		expect(changeAgent.run).not.toHaveBeenCalled();
		expect(lostBaggageAgent.run).not.toHaveBeenCalled();
	});
});
