import { model, systemPrompt } from "../agent/decorators";
import { Agent } from "./agent";

type User = {
  name: string;
};

@model("gpt-4o-mini")
@systemPrompt("Be concise, reply with one sentence")
class NameAgent extends Agent<string, string> {
  constructor(private user: User) {
    super();
  }

  @systemPrompt()
  async addUserName(): Promise<string> {
    return `The user's name is '${this.user.name}'`;
  }
}

async function main() {
  const response = await new NameAgent({ name: "Annie" }).run(
    "Does their name start with 'A'?"
  );
  console.log(response);
}

main().catch(console.error);
