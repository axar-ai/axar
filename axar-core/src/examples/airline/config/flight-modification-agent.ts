import { output, systemPrompt, Agent, model, tool } from "../../../agent";
import { property, schema, optional } from "../../../schema";
import {
	caseResolved,
	changeFlight,
	escalateToAgent,
	IChnageFlightResponse,
	initiateFlightCredits,
	initiateRefund,
	validToChangeFlight,
} from "./tools";
import {
	FLIGHT_CANCELLATION_POLICY,
	FLIGHT_CHANGE_POLICY,
	STARTER_PROMPT,
} from "./policies";
import { z } from "zod";

@schema()
export class FlightModificationResponse {
	@property("Confirmation of modification.")
	confirmation!: string;

	@property("Details about the action taken.")
	@optional()
	details?: string;
}

@schema()
export class ToolParams {
	@property("Flight details")
	flightDetails!: Object;

	@property("Customer's information")
	customerInfo!: Object;
}

@schema()
export class FlightCancelResponse {
	@property("Confirmation of cancellation.")
	confirmation!: string;

	@property(
		"Details about the action taken, including cancellation reason and refund details."
	)
	@optional()
	details?: string;
}

@model("gpt-4o-mini")
@systemPrompt(`
${STARTER_PROMPT}  ${FLIGHT_CANCELLATION_POLICY}`)
@output(FlightCancelResponse)
export class FlightCancelAgent extends Agent<string, FlightCancelResponse> {
	@tool("Escalate to agent", z.string())
	async escalateToAgentRequest(reason?: string): Promise<string> {
		return escalateToAgent(reason);
	}

	@tool("Initiate refund")
	async initiateRefundRequest(): Promise<string> {
		return initiateRefund();
	}

	@tool("Initiate flight credits")
	async initiateFlightCreditsRequest(): Promise<string> {
		return initiateFlightCredits();
	}

	@tool("case resolved")
	async caseResolvedRequest(): Promise<string> {
		return caseResolved();
	}
}

@model("gpt-4o-mini")
@systemPrompt(`
${STARTER_PROMPT}  ${FLIGHT_CHANGE_POLICY}`)
@output(FlightCancelResponse)
export class FlightChangeAgent extends Agent<string, FlightCancelResponse> {
	@tool("Escalate to agent")
	async escalateToAgentRequest(reason?: string): Promise<string> {
		return escalateToAgent(reason);
	}

	@tool("Change flight")
	async initiateChangeFlightRequest(): Promise<IChnageFlightResponse> {
		return changeFlight();
	}

	@tool("Validate to change flight")
	async validToChangeFlightRequest(): Promise<string> {
		return validToChangeFlight();
	}

	@tool("case resolved")
	async caseResolvedRequest(): Promise<string> {
		return caseResolved();
	}
}

@schema()
export class FlightChangeResponse {
	@property("Confirmation of change.")
	confirmation!: string;

	@property(
		"Details about the action taken, including change details with new flight details."
	)
	@optional()
	details?: string;
}

@model("gpt-4o-mini")
@systemPrompt(`
You are a Flight Modification Agent for a customer service airlines company.
You are an expert customer service agent deciding which sub intent the user should be referred to.
You already know the intent is for flight modification related question. First, look at message history and see if you can determine if the user wants to cancel or change their flight.
Ask user clarifying questions until you know whether or not it is a cancel request or change flight request. Once you know, call the appropriate transfer function. Either ask clarifying questions, or call one of your functions, every time.`)
@output(FlightModificationResponse)
export class FlightModificationAgent extends Agent<
	string,
	FlightModificationResponse
> {
	constructor(
		private cancelAgent: FlightCancelAgent,
		private changeAgent: FlightChangeAgent
	) {
		super();
	}

	@tool("Flight modification decision")
	async handleFlightModificationRequest(
		params: string
	): Promise<FlightModificationResponse> {
		const userQuery = params; // This is the flight request from the user

		// Let LLM decide if the user wants to cancel or change their flight
		let intent: "cancel" | "change" | "unknown" = "unknown";

		// Let LLM analyze the user query and decide on the action
		// This logic can be more sophisticated based on LLM's understanding.
		if (userQuery.toLowerCase().includes("cancel")) {
			intent = "cancel";
		} else if (
			userQuery.toLowerCase().includes("change") ||
			userQuery.toLowerCase().includes("reschedule")
		) {
			intent = "change";
		}

		// Invoke the appropriate agent based on the detected intent
		switch (intent) {
			case "cancel":
				// Delegate the flight cancellation to the cancel agent
				const cancelResponse = await this.cancelAgent.run(params);
				return {
					confirmation: cancelResponse.confirmation,
					details: cancelResponse.details,
				};
			case "change":
				// Delegate the flight change to the change agent
				const changeResponse = await this.changeAgent.run(params);
				return {
					confirmation: changeResponse.confirmation,
					details: changeResponse.details,
				};
			default:
				// If intent is unclear, ask for more information
				return {
					confirmation: "Intent not recognized.",
					details:
						"Please specify if you want to cancel or change your flight.",
				};
		}
	}
}
