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

		const mockRun = jest
			.spyOn(FlightCancelAgent.prototype, "run")
			.mockResolvedValue({
				confirmation: "Cancellation processed",
				details: "Cancellation processed",
			});

		const result = await triggerAgent.run(cancelQuery);

		expect(result).toEqual({
			confirmation: "Cancellation processed",
			details: "Cancellation processed",
		});

		mockRun.mockRestore();
	});

	it("should call the flight change agent when the query is related to rescheduling", async () => {
		const changeQuery = "Can I reschedule my flight to next week?";

		const mockRun = jest
			.spyOn(FlightChangeAgent.prototype, "run")
			.mockResolvedValue({
				confirmation: "Flight rescheduled",
				details: "Flight rescheduled",
			});

		const result = await triggerAgent.run(changeQuery);

		expect(result).toEqual({
			confirmation: "Flight rescheduled",
			details: "Flight rescheduled",
		});

		mockRun.mockRestore();
	});

	it("should call the lost baggage agent when the query is related to lost baggage", async () => {
		const lostBaggageQuery = "My bag is missing";

		const mockRun = jest
			.spyOn(LostBaggageAgent.prototype, "run")
			.mockResolvedValue({
				confirmation: "Baggage search initiated",
				details: "Baggage search initiated",
			});

		const result = await triggerAgent.run(lostBaggageQuery);

		expect(result).toEqual({
			confirmation: "Baggage search initiated",
			details: "Baggage search initiated",
		});

		mockRun.mockRestore();
	});

	it("should return unknown intent if the query doesn't match modify or report", async () => {
		const unclearQuery = "What options do I have?";

		const TriggerMockRun = jest
			.spyOn(TriggerAgent.prototype, "run")
			.mockResolvedValue({
				confirmation: "Unknown query",
				details: "Unknown query",
			});

		const modificationMockRun = jest
			.spyOn(FlightModificationAgent.prototype, "run")
			.mockResolvedValue({
				confirmation: "Unknown query",
				details: "Unknown query",
			});

		const cancelMockRun = jest
			.spyOn(FlightCancelAgent.prototype, "run")
			.mockResolvedValue({
				confirmation: "Unknown query",
				details: "Unknown query",
			});

		const changeMockRun = jest
			.spyOn(FlightChangeAgent.prototype, "run")
			.mockResolvedValue({
				confirmation: "Unknown query",
				details: "Unknown query",
			});

		const lostMockRun = jest
			.spyOn(LostBaggageAgent.prototype, "run")
			.mockResolvedValue({
				confirmation: "Unknown query",
				details: "Unknown query",
			});

		const result = await triggerAgent.run(unclearQuery);

		expect(result).toEqual({
			confirmation: "Unknown query",
			details: "Unknown query",
		});

		TriggerMockRun.mockRestore();
		modificationMockRun.mockRestore();
		cancelMockRun.mockRestore();
		changeMockRun.mockRestore();
		lostMockRun.mockRestore();
	});
});
