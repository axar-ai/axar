import { z } from "zod";
import { output, Agent, tool, model, systemPrompt } from "../../../agent";
import { property, schema, optional } from "../../../schema";
import { LOST_BAGGAGE_POLICY, STARTER_PROMPT } from "./policies";
import { caseResolved, escalateToAgent, initiateBaggageSearch } from "./tools";

@schema()
export class LostBaggageResponse {
	@property("Confirmation of lost baggage.")
	confirmation!: string;

	@property("Details about the action taken.")
	@optional()
	details?: string;
}

@model("gpt-4o-mini")
@systemPrompt(`${STARTER_PROMPT} ${LOST_BAGGAGE_POLICY}`)
@output(LostBaggageResponse)
export class LostBaggageAgent extends Agent<string, LostBaggageResponse> {
	@tool("Escalate to agent", z.string())
	async escalateToAgentRequest(reason?: string): Promise<string> {
		const response = escalateToAgent(reason);
		console.log("🚀 ~ FlightCancelAgent ~ response:", response);
		return response;
	}

	@tool("Initiate baggage search", z.string())
	async initiateBaggageSearchRequest(context?: string): Promise<string> {
		const response = initiateBaggageSearch();
		console.log("🚀 ~ FlightCancelAgent ~ response:", response);
		return response;
	}

	@tool("Case resolved", z.string())
	async caseResolvedRequest(context?: string): Promise<string> {
		const response = caseResolved();
		console.log("🚀 ~ FlightCancelAgent ~ response:", response);
		return response;
	}
}
