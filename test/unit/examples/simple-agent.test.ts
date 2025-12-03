import { SimpleAgent } from './../../../examples/simple-agent';

// Mock the AI SDK - the actual dependency
jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({
    text: 'It comes from the famous "Hello, World!" program used to demonstrate the basic syntax of a programming language.',
    experimental_output: null,
  }),
  Output: {
    object: jest.fn((config) => config),
  },
}));

// Mock the model factory
jest.mock('../../../src/llm/model-factory', () => ({
  getModel: jest.fn().mockResolvedValue({
    specificationVersion: 'v2',
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    doGenerate: jest.fn(),
    doStream: jest.fn(),
    supportedUrls: {},
  }),
}));

describe('SimpleAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a concise one-sentence response', async () => {
    const agent = new SimpleAgent();

    // Call the real run method (not mocked)
    const result = await agent.run('Where does "hello world" come from?');

    // Verify the result comes from the mocked generateText
    expect(result).toBe(
      'It comes from the famous "Hello, World!" program used to demonstrate the basic syntax of a programming language.',
    );

    // Verify generateText was actually called
    const { generateText } = require('ai');
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Where does "hello world" come from?',
          }),
        ]),
      }),
    );
  });

  it('should include system prompt in the request', async () => {
    const agent = new SimpleAgent();

    await agent.run('Test input');

    const { generateText } = require('ai');
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: 'Be concise, reply with one sentence',
          }),
        ]),
      }),
    );
  });
});
