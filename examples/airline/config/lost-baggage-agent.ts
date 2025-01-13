import { z } from 'zod';
import { output, Agent, tool, model, systemPrompt } from '@axarai/axar';
import { property, schema, optional } from '@axarai/axar';
import { LOST_BAGGAGE_POLICY, STARTER_PROMPT } from './policies';
import { caseResolved, escalateToAgent, initiateBaggageSearch } from './tools';

@schema()
export class LostBaggageResponse {
  @property('Confirmation of lost baggage.')
  confirmation!: string;

  @property('Details about the action taken.')
  @optional()
  details?: string;
}

@model('openai:gpt-4o-mini')
@systemPrompt(`${STARTER_PROMPT} ${LOST_BAGGAGE_POLICY}`)
@output(LostBaggageResponse)
export class LostBaggageAgent extends Agent<string, LostBaggageResponse> {
  @tool('Escalate to agent', z.object({ reason: z.string() }))
  async escalateToAgentRequest({
    reason,
  }: {
    reason: string;
  }): Promise<string> {
    const response = escalateToAgent(reason);
    return response;
  }

  @tool('Initiate baggage search', z.object({ context: z.string() }))
  async initiateBaggageSearchRequest({
    context,
  }: {
    context: string;
  }): Promise<string> {
    const response = initiateBaggageSearch();
    return response;
  }

  @tool('Case resolved', z.object({ context: z.string() }))
  async caseResolvedRequest({ context }: { context: string }): Promise<string> {
    const response = caseResolved();
    return response;
  }
}
