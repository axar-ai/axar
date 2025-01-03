import {
	FlightCancelAgent,
	FlightChangeAgent,
	FlightModificationAgent,
} from "./config/flight-modification-agent";
import { LostBaggageAgent } from "./config/lost-baggage-agent";
import { TriggerAgent } from "./config/trigger-agent";

async function main() {
	// Create sub-agents
	const cancelAgent = new FlightCancelAgent();
	const changeAgent = new FlightChangeAgent();
	const lostBaggageAgent = new LostBaggageAgent();

	// Create the orchestrator agent
	const modificationAgent = new FlightModificationAgent(
		cancelAgent,
		changeAgent
	);

	const triggerAgent = new TriggerAgent(modificationAgent, lostBaggageAgent);

	// Test cases
	const changeQuery = "I want to change my flight to one day earlier";
	const cancelQuery =
		"I want to cancel my flight. I can't make it anymore due to a personal conflict";

	const cancelQuery2 =
		"I want to cancel my flight. I can't make it anymore due to a personal conflict, and I want refund";
	const unclearQuery =
		"I dont want this flight, please reschedule it for next week";
	const lostBaggageQuery = "My bag is missing";

	console.log(await triggerAgent.run(changeQuery));
	console.log(await triggerAgent.run(cancelQuery));
	console.log(await triggerAgent.run(cancelQuery2));
	console.log(await triggerAgent.run(unclearQuery));
	console.log(await triggerAgent.run(lostBaggageQuery));
}

main().catch(console.error);
