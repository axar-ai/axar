import {
	FlightCancelAgent,
	FlightChangeAgent,
	FlightModificationAgent,
} from "./config/flight-modification-agent";

async function main() {
	// Create sub-agents
	const cancelAgent = new FlightCancelAgent();
	const changeAgent = new FlightChangeAgent();

	// Create the orchestrator agent
	const modificationAgent = new FlightModificationAgent(
		cancelAgent,
		changeAgent
	);

	// Test cases
	const cancelQuery = "I want to cancel my flight.";
	const changeQuery = "Can I reschedule my flight to next week?";
	const unclearQuery = "What options do I have?";

	console.log(await modificationAgent.run(cancelQuery));
	console.log(await modificationAgent.run(changeQuery));
	console.log(await modificationAgent.run(unclearQuery));
}

main().catch(console.error);
