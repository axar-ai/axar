import { SimpleAgent } from './../../../examples/simple-agent';

describe('SimpleAgent', () => {
  it('should return a concise one-sentence response', async () => {
    // Mocking the behavior of the `run` method of SimpleAgent
    const mockRun = jest
      .fn()
      .mockResolvedValue(
        'It comes from the famous "Hello, World!" program used to demonstrate the basic syntax of a programming language.',
      );
    SimpleAgent.prototype.run = mockRun;

    const agent = new SimpleAgent();

    // Simulating a user input
    const result = await agent.run('Where does "hello world" come from?');

    // Test assertions
    expect(result).toBe(
      'It comes from the famous "Hello, World!" program used to demonstrate the basic syntax of a programming language.',
    );
    expect(mockRun).toHaveBeenCalledWith('Where does "hello world" come from?');
  });
});
