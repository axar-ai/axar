import { model, systemPrompt, Agent, output, input } from '@axarai/axar';
import { z } from 'zod';

const GreetingAgentRequestSchema = z.object({
  userName: z.string().describe('User name'),
  userMood: z.enum(['happy', 'neutral', 'sad']).describe('User mood'),
  dayOfWeek: z.string().describe('Day of the week'),
  language: z.string().describe('User language preference'),
});

const GreetingAgentResponseSchema = z.object({
  greeting: z.string().describe('Greeting message to cater to the user mood'),
  moodResponse: z.string().describe('Line acknowledging the user mood'),
  weekendMessage: z
    .string()
    .describe('Personalized message if it is the weekend'),
});

type GreetingAgentRequest = z.infer<typeof GreetingAgentRequestSchema>;
type GreetingAgentResponse = z.infer<typeof GreetingAgentResponseSchema>;

@model('openai:gpt-4o-mini')
@systemPrompt(
  `Greet the user by their name in a friendly tone in their preferred language.`,
)
@input(GreetingAgentRequestSchema)
@output(GreetingAgentResponseSchema)
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
