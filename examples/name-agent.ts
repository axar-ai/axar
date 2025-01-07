import { model, systemPrompt, Agent } from '@axar-ai/axar-core';

type User = {
  name: string;
};

@model('openai:gpt-4o-mini')
@systemPrompt('Be concise, reply with one sentence')
export class NameAgent extends Agent<string, string> {
  constructor(private user: User) {
    super();
  }

  @systemPrompt()
  async addUserName(): Promise<string> {
    return `The user's name is '${this.user.name}'`;
  }
}

async function main() {
  const response = await new NameAgent({ name: 'Annie' }).run(
    "Do their name start with 'A'?",
  );
  console.log(response);
}

if (require.main === module) {
  main().catch(console.error);
}
