import {
  model,
  systemPrompt,
  Agent,
  schema,
  property,
  output,
  input,
  optional,
} from '@axarai/axar';

@schema()
class GreetingAgentRequest {
  @property("User's full name")
  userName!: string;

  @property("User's current mood")
  userMood!: 'happy' | 'neutral' | 'sad';

  @property('Day of the week')
  dayOfWeek!: string;

  @property("User's language preference")
  language!: string;
}

@schema()
class GreetingAgentResponse {
  @property("A greeting message to cater to the user's mood")
  greeting!: string;

  @property("A line acknowledging the user's mood")
  moodResponse!: string;

  @property("A personalized message only if it's the weekend")
  @optional()
  weekendMessage?: string;
}

@model('openai:gpt-4o-mini')
@systemPrompt(
  `Greet the user by their name in a friendly tone in their preferred language.`,
)
@input(GreetingAgentRequest)
@output(GreetingAgentResponse)
export class GreetingAgent extends Agent<
  GreetingAgentRequest,
  GreetingAgentResponse
> {}

// Instantiate and run the agent
(async () => {
  const response = await new GreetingAgent().run({
    userName: 'Alice',
    userMood: 'happy',
    dayOfWeek: 'Saturday',
    language: 'English',
  });
  console.log(response);
})();
