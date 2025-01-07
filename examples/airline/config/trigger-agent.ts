import { output, systemPrompt, Agent, model, tool } from '@axar/core';
import { property, schema } from '@axar/core';
import {
  FlightModificationAgent,
  FlightModificationResponse,
} from './flight-modification-agent';
import { LostBaggageAgent, LostBaggageResponse } from './lost-baggage-agent';

@schema()
export class TriggerResponse {
  @property('Confirmation of intent.')
  confirmation!: string;

  @property('Details about the action taken.')
  details?: string;
}

@schema()
class CustomerContext {
  @property('Customer ID')
  CUSTOMER_ID!: string;
  @property('Customer name')
  NAME!: string;
  @property('Customer phone number')
  PHONE_NUMBER!: string;
  @property('Customer email')
  EMAIL!: string;
  @property('Customer status')
  STATUS!: string;
  @property('Customer account status')
  ACCOUNT_STATUS!: string;
  @property('Customer balance')
  BALANCE!: string;
  @property('Customer location')
  LOCATION!: string;
}

@schema()
class FlightContext {
  @property('Flight number')
  FLIGHT_NUMBER!: string;
  @property('Departure airport')
  DEPARTURE_AIRPORT!: string;
  @property('Arrival airport')
  ARRIVAL_AIRPORT!: string;
  @property('Departure time')
  DEPARTURE_TIME!: string;
  @property('Arrival time')
  ARRIVAL_TIME!: string;
  @property('Flight status')
  FLIGHT_STATUS!: string;
}

@schema()
class CustomerContextAndFlightContext {
  @property('Customer context')
  customer_context!: CustomerContext;
  @property('Flight context')
  flight_context!: FlightContext;
}

@schema()
export class TriggerRequest {
  @property('Customer query')
  query!: string;

  @property('Customer and flight context')
  context!: CustomerContextAndFlightContext;
}

@model('openai:gpt-4o-mini')
@systemPrompt(
  `You are to decide if the customer wants to initiate a flight modification or lost baggage claim. If the customer wants to initiate a flight modification, respond with "Flight Modification". If the customer wants to initiate a lost baggage claim, respond with "Lost Baggage".`,
)
@output(TriggerResponse)
export class TriggerAgent extends Agent<string, TriggerResponse> {
  constructor(
    private flightModificationAgent: FlightModificationAgent,
    private lostBaggageAgent: LostBaggageAgent,
  ) {
    super();
  }

  @tool(
    'For canceling or changing a flight, invoke the flight modification agent using the provided query and context.',
    TriggerRequest,
  )
  async decideToChangeOrCancelFlight(
    params: TriggerRequest,
  ): Promise<FlightModificationResponse> {
    return this.flightModificationAgent.run(JSON.stringify(params));
  }

  @tool(
    'To report lost baggage, call the lost baggage agent using the provided query and context.',
    TriggerRequest,
  )
  async reportLostBaggage(
    params: TriggerRequest,
  ): Promise<LostBaggageResponse> {
    return this.lostBaggageAgent.run(JSON.stringify(params));
  }
}
