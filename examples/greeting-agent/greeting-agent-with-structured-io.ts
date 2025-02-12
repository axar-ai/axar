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
export class GreetingAgentRequest {
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
export class GreetingAgentResponse {
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
  `Greet the user by their name in a friendly tone in their preferred language.
   If it's a weekend day (Saturday or Sunday), include a special weekend message.
   If it's not a weekend, do not include a weekend message at all.
   
   Example weekend response:
   {
     "greeting": "Hello Alice! Great to see you!",
     "moodResponse": "I see you're feeling happy today!",
     "weekendMessage": "Hope you're enjoying your Saturday!"
   }
   
   Example weekday response:
   {
     "greeting": "Hello Bob! Great to see you!",
     "moodResponse": "I see you're feeling happy today!"
   }`,
)
@input(GreetingAgentRequest)
@output(GreetingAgentResponse)
export class GreetingAgent extends Agent<
  GreetingAgentRequest,
  GreetingAgentResponse
> {}

// Example usage
export async function main() {
  const response = await new GreetingAgent().run({
    userName: 'Alice',
    userMood: 'happy',
    dayOfWeek: 'Saturday',
    language: 'English',
  });
  console.log(response);
}

// Only run if this file is executed directly (not imported as a module)
if (require.main === module) {
  main();
}
