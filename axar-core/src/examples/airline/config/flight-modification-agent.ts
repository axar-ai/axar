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
	@tool("Escalate to agent", z.object({ reason: z.string() }))
	async escalateToAgentRequest({
		reason,
	}: {
		reason: string;
	}): Promise<string> {
		const response = escalateToAgent(reason);
		// console.log("🚀 ~ FlightCancelAgent ~ response:", response);
		return response;
	}

	@tool("Initiate refund", z.object({ context: z.string() }))
	async initiateRefundRequest({
		context,
	}: {
		context: string;
	}): Promise<string> {
		const response = initiateRefund(context);
		// console.log("🚀 ~ FlightCancelAgent ~ response:", response);
		return response;
	}

	@tool("Initiate flight credits", z.object({ context: z.string() }))
	async initiateFlightCreditsRequest({
		context,
	}: {
		context: string;
	}): Promise<string> {
		const response = initiateFlightCredits();
		// console.log("🚀 ~ FlightCancelAgent ~ response:", response);
		return response;
	}

	@tool("case resolved", z.object({ context: z.string() }))
	async caseResolvedRequest({ context }: { context: string }): Promise<string> {
		const response = caseResolved();
		console.log("🚀 ~ FlightCancelAgent ~ response:", response);
		return response;
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
${STARTER_PROMPT}  ${FLIGHT_CHANGE_POLICY}`)
@output(FlightChangeResponse)
export class FlightChangeAgent extends Agent<string, FlightChangeResponse> {
	@tool("Escalate to agent", z.object({ reason: z.string() }))
	async escalateToAgentRequest({
		reason,
	}: {
		reason: string;
	}): Promise<string> {
		return escalateToAgent(reason);
	}

	@tool("Change flight", z.object({ context: z.string() }))
	async changeFlightRequest({ context }: { context: string }): Promise<string> {
		// console.log("🚀 ~ FlightChangeAgent ~ context:", context);
		try {
			const response = changeFlight();
			// console.log("🚀 ~ FlightChangeAgent ~ response:", response);
			return response;
		} catch (error) {
			console.error("Error creating task in collection:", error);
			throw error; // Rethrow error for caller to handle
		}
	}

	@tool("Validate to change flight", z.object({ context: z.string() }))
	async validToChangeFlightRequest({
		context,
	}: {
		context: string;
	}): Promise<string> {
		const response = validToChangeFlight();
		return response;
	}

	@tool("case resolved", z.object({ context: z.string() }))
	async caseResolvedRequest({ context }: { context: string }): Promise<string> {
		const response = caseResolved();
		// console.log("🚀 ~ FlightChangeAgent ~ response:", response);
		return response;
	}
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

	@tool(
		"For cancel flight, call the cancel agent with this context to transfer to the right intent.",
		z.object({ query: z.string() })
	)
	async cancelFlightRequest(params: {
		query: string;
	}): Promise<FlightCancelResponse> {
		return this.cancelAgent.run(params.query);
	}

	@tool(
		"For change flight, call the change agent with this context to transfer to the right intent.",
		z.object({ query: z.string() })
	)
	async changeFlightRequest(params: {
		query: string;
	}): Promise<FlightChangeResponse> {
		return this.changeAgent.run(params.query);
	}

	// @tool(
	// 	"Flight modification decision",
	// 	z.object({
	// 		query: z.string(),
	// 	})
	// )
	// async handleFlightModificationRequest(params: {
	// 	query: string;
	// }): Promise<FlightModificationResponse> {
	// 	const { query: userQuery } = params; // This is the flight request from the user
	// 	console.log("🚀 ~ userQuery======>>>:", userQuery);

	// 	// Let LLM decide if the user wants to cancel or change their flight
	// 	let intent: "cancel" | "change" | "unknown" = "unknown";

	// 	// Let LLM analyze the user query and decide on the action
	// 	// This logic can be more sophisticated based on LLM's understanding.
	// 	if (userQuery.toLowerCase().includes("cancel")) {
	// 		intent = "cancel";
	// 	} else if (
	// 		userQuery.toLowerCase().includes("change") ||
	// 		userQuery.toLowerCase().includes("reschedule")
	// 	) {
	// 		intent = "change";
	// 	}

	// 	// Invoke the appropriate agent based on the detected intent
	// 	switch (intent) {
	// 		case "cancel":
	// 			// Delegate the flight cancellation to the cancel agent
	// 			const cancelResponse = await this.cancelAgent.run(userQuery);
	// 			return {
	// 				confirmation: cancelResponse.confirmation,
	// 				details: cancelResponse.details,
	// 			};
	// 		case "change":
	// 			// Delegate the flight change to the change agent
	// 			const changeResponse = await this.changeAgent.run(userQuery);
	// 			return {
	// 				confirmation: changeResponse.confirmation,
	// 				details: changeResponse.details,
	// 			};
	// 		default:
	// 			// If intent is unclear, ask for more information
	// 			return {
	// 				confirmation: "Intent not recognized.",
	// 				details:
	// 					"Please specify if you want to cancel or change your flight.",
	// 			};
	// 	}
	// }
}
