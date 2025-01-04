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

	const context = {
		customer_context: {
			CUSTOMER_ID: "customer_12345",
			NAME: "John Doe",
			PHONE_NUMBER: "(123) 456-7890",
			EMAIL: "johndoe@example.com",
			STATUS: "Premium",
			ACCOUNT_STATUS: "Active",
			BALANCE: "$0.00",
			LOCATION: "1234 Main St, San Francisco, CA 94123, USA",
		},
		flight_context: {
			FLIGHT_NUMBER: "1919",
			DEPARTURE_AIRPORT: "LGA",
			ARRIVAL_AIRPORT: "LAX",
			DEPARTURE_TIME: "3pm ET",
			DEPARTURE_DATE: "5/21/2024",
			ARRIVAL_TIME: "6pm PT",
			FLIGHT_STATUS: "On Time",
		},
	};

	// Test cases
	const changeQuery =
		"I want to change my flight to one day earlier. I can't make it anymore due to a personal conflict. Please provide me a new flight";
	const cancelQuery =
		"I want to cancel my flight. I can't make it anymore due to a personal conflict. Please provide me a new flight";

	const cancelQuery2 =
		"I want to cancel my flight. I can't make it anymore due to a personal conflict, and I want refund";
	const unclearQuery =
		"I dont want this flight, please reschedule it for next week and provide me the new flight details";
	const lostBaggageQuery = "My bag is missing please help me find it";

	console.log(
		await triggerAgent.run(
			JSON.stringify({
				query: changeQuery,
				context: context,
			})
		)
	);
	console.log(
		await triggerAgent.run(
			JSON.stringify({
				query: cancelQuery,
				context: context,
			})
		)
	);
	console.log(
		await triggerAgent.run(
			JSON.stringify({
				query: cancelQuery2,
				context: context,
			})
		)
	);
	console.log(
		await triggerAgent.run(
			JSON.stringify({
				query: unclearQuery,
				context: context,
			})
		)
	);
	console.log(
		await triggerAgent.run(
			JSON.stringify({
				query: lostBaggageQuery,
				context: context,
			})
		)
	);
}

main().catch(console.error);
