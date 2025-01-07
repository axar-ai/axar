import { output, systemPrompt, Agent, model, tool } from '@axar-ai/axar-core';
import { property, schema, optional } from '@axar-ai/axar-core';
import {
  caseResolved,
  changeFlight,
  escalateToAgent,
  IChnageFlightResponse,
  initiateFlightCredits,
  initiateRefund,
  validToChangeFlight,
} from './tools';
import {
  FLIGHT_CANCELLATION_POLICY,
  FLIGHT_CHANGE_POLICY,
  STARTER_PROMPT,
} from './policies';
import { z } from 'zod';
import { TriggerRequest } from './trigger-agent';

@schema()
export class FlightModificationResponse {
  @property('Confirmation of modification.')
  confirmation!: string;

  @property('Details about the action taken.')
  @optional()
  details?: string;
}

@schema()
export class FlightCancelResponse {
  @property('Confirmation of cancellation.')
  confirmation!: string;

  @property(
    'Details about the action taken, including cancellation reason and refund details.',
  )
  @optional()
  details?: string;
}

@model('openai:gpt-4o-mini')
@systemPrompt(`
${STARTER_PROMPT}  ${FLIGHT_CANCELLATION_POLICY}`)
@output(FlightCancelResponse)
export class FlightCancelAgent extends Agent<string, FlightCancelResponse> {
  @tool('Escalate to agent', z.object({ reason: z.string() }))
  async escalateToAgentRequest({
    reason,
  }: {
    reason: string;
  }): Promise<string> {
    const response = escalateToAgent(reason);
    return response;
  }

  @tool('Initiate refund', z.object({ context: z.string() }))
  async initiateRefundRequest({
    context,
  }: {
    context: string;
  }): Promise<string> {
    const response = initiateRefund(context);
    return response;
  }

  @tool('Initiate flight credits', z.object({ context: z.string() }))
  async initiateFlightCreditsRequest({
    context,
  }: {
    context: string;
  }): Promise<string> {
    const response = initiateFlightCredits();
    return response;
  }

  @tool('case resolved', z.object({ context: z.string() }))
  async caseResolvedRequest({ context }: { context: string }): Promise<string> {
    const response = caseResolved();
    return response;
  }
}

@schema()
export class FlightChangeResponse {
  @property('Confirmation of change.')
  confirmation!: string;

  @property(
    'Details about the action taken, including change details with new flight details.',
  )
  @optional()
  details?: string;
}

@model('openai:gpt-4o-mini')
@systemPrompt(`
${STARTER_PROMPT}  ${FLIGHT_CHANGE_POLICY}`)
@output(FlightChangeResponse)
export class FlightChangeAgent extends Agent<string, FlightChangeResponse> {
  @tool('Escalate to agent', z.object({ reason: z.string() }))
  async escalateToAgentRequest({
    reason,
  }: {
    reason: string;
  }): Promise<string> {
    return escalateToAgent(reason);
  }

  @tool('Change flight', z.object({ context: z.string() }))
  async changeFlightRequest({ context }: { context: string }): Promise<string> {
    try {
      const response = changeFlight();
      return response;
    } catch (error) {
      console.error('Error creating task in collection:', error);
      throw error;
    }
  }

  @tool('Validate to change flight', z.object({ context: z.string() }))
  async validToChangeFlightRequest({
    context,
  }: {
    context: string;
  }): Promise<string> {
    const response = validToChangeFlight();
    return response;
  }

  @tool('case resolved', z.object({ context: z.string() }))
  async caseResolvedRequest({ context }: { context: string }): Promise<string> {
    const response = caseResolved();
    return response;
  }
}

@model('openai:gpt-4o-mini')
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
    private changeAgent: FlightChangeAgent,
  ) {
    super();
  }

  @tool(
    'For cancel flight, call the cancel agent with this context to transfer to the right intent.',
    TriggerRequest,
  )
  async cancelFlightRequest(
    params: TriggerRequest,
  ): Promise<FlightCancelResponse> {
    return this.cancelAgent.run(JSON.stringify(params));
  }

  @tool(
    'For change flight, call the change agent with this context to transfer to the right intent.',
    TriggerRequest,
  )
  async changeFlightRequest(
    params: TriggerRequest,
  ): Promise<FlightChangeResponse> {
    return this.changeAgent.run(JSON.stringify(params));
  }
}
