import { z } from "zod";
import { output, systemPrompt, Agent, model, tool } from "../../../agent";
import { property, schema } from "../../../schema";
import { FlightModificationAgent } from "./flight-modification-agent";
import { LostBaggageAgent } from "./lost-baggage-agent";

@schema()
export class TriggerResponse {
	@property("Confirmation of intent.")
	confirmation!: string;

	@property("Details about the action taken.")
	details?: string;
}

@model("gpt-4o-mini")
@systemPrompt(`You are to triage a users request, and call a tool to transfer to the right intent.
    Once you are ready to transfer to the right intent, call the tool to transfer to the right intent.
    You dont need to know specifics, just the topic of the request.
    When you need more information to triage the request to an agent, ask a direct question without explaining why you're asking it.
    Do not share your thought process with the user! Do not make unreasonable assumptions on behalf of user.`)
@output(TriggerResponse)
export class TriggerAgent extends Agent<string, TriggerResponse> {
	constructor(
		private flightModificationAgent: FlightModificationAgent,
		private lostBaggageAgent: LostBaggageAgent
	) {
		super();
	}

	@systemPrompt()
	private async getCustomerAndFlightContext(): Promise<string> {
		// Get the customer and flight context

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
			},
		};

		return `The customer context is here: ${JSON.stringify(
			context.customer_context
		)}, and flight context is here: ${JSON.stringify(context.flight_context)}`;
	}

	@tool(
		"Decide if the user wants to modify their flight or report lost baggage, call the customer and flight context and then call the flight modification agent or the lost baggage agent with this context({query}) to transfer to the right intent modyfy or report .",
		z.object({
			query: z.string(), // Wrap the string in an object
		})
	)
	async decideIntent(params: { query: string }): Promise<any> {
		const { query } = params;

		// Let LLM decide if the user wants to modify or report lost baggage
		let intent: "modify" | "report" | "unknown" = "unknown";

		if (query.toLowerCase().includes("modify")) {
			intent = "modify";
		} else if (query.toLowerCase().includes("report")) {
			intent = "report";
		}

		switch (intent) {
			case "report":
				// Call the lost baggage agent
				return this.lostBaggageAgent.run(query);
			case "modify":
				// Call the flight modification agent
				return this.flightModificationAgent.run(query);
			default:
				return { intent: "unknown" };
		}
	}
}
