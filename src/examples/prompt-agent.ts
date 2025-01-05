import { model, systemPrompt, Agent } from '../agent';

@model('openai:gpt-4o-mini')
@systemPrompt("Use the customer's name while replying.")
export class PromptAgent extends Agent<string, string> {
  constructor(private userName: string) {
    super();
  }

  @systemPrompt()
  private async addUserName(): Promise<string> {
    return `The user's name is '${this.userName}'`;
  }

  @systemPrompt()
  private async addTheDate(): Promise<string> {
    return `Today is ${new Date().toDateString()}`;
  }
}

async function main() {
  const response = await new PromptAgent('Frank').run('What is the date?');
  console.log(response);
}

main().catch(console.error);
