import { NameAgent } from './../../../examples/name-agent'; // Adjust the import path as needed

// SKIPPED: This is an E2E test that makes real LLM API calls.
// Requires OPENAI_API_KEY environment variable to run.
// To run: remove .skip and set OPENAI_API_KEY=your-key
describe.skip('NameAgent', () => {
  let nameAgent: NameAgent;

  beforeEach(() => {
    // Initialize the agent with a mock user
    nameAgent = new NameAgent({ name: 'Annie' });
  });

  it("should return the correct user's name", async () => {
    // Simulate the behavior of `addUserName` method
    const result = await nameAgent.addUserName();

    // Check if the result is a string and matches the expected format
    expect(result).toBe("The user's name is 'Annie'");
  });

  it("should return the correct user's name when run is called", async () => {
    // Mock the run method to simulate behavior
    const result = await nameAgent.run("Does their name start with 'A'?");

    // Check if the result is a string and matches the expected format
    expect(result).toBe("The user's name is 'Annie'");
  });

  it('should return a string when run is called', async () => {
    // Simulate the behavior of `run` method
    const result = await nameAgent.run("Does their name start with 'A'?");

    // Check if the result is a string
    expect(typeof result).toBe('string');
  });
});
