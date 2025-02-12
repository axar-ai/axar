import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import dotenv from 'dotenv';
import {
  GreetingAgent,
  GreetingAgentRequest,
} from '../../examples/greeting-agent/greeting-agent-with-structured-io';
import { areSimilar } from './utils/semantic-similarity';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type UserMood = 'happy' | 'neutral' | 'sad';
type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';
type Language = 'English' | 'Spanish' | 'French';

// Helper function to create a properly typed request
function createRequest(
  userName: string,
  userMood: UserMood,
  dayOfWeek: DayOfWeek,
  language: Language,
): GreetingAgentRequest {
  return {
    userName,
    userMood,
    dayOfWeek,
    language,
  };
}

describe('Structured I/O GreetingAgent E2E Tests', () => {
  beforeAll(async () => {
    // Load environment variables
    dotenv.config({ path: '.env' });
    dotenv.config({ path: '.env.local' });
  });

  beforeEach(async () => {
    // Add a small delay between tests to avoid rate limiting
    await sleep(1000);
  });

  test('should handle weekend days correctly', async () => {
    const agent = new GreetingAgent();
    const weekendDays: DayOfWeek[] = ['Saturday', 'Sunday'];
    const expectedWeekendResponse = "I hope you're enjoying your weekend!";

    for (const day of weekendDays) {
      const response = await agent.run(
        createRequest('Alice', 'happy', day, 'English'),
      );

      expect(response.greeting).toBeTruthy();
      expect(response.moodResponse).toBeTruthy();
      expect(response.weekendMessage).toBeTruthy();
      expect(
        areSimilar(response.weekendMessage || '', expectedWeekendResponse),
      ).toBeTruthy();

      await sleep(1000);
    }
  }, 30000);

  test('should not include weekend message on weekdays', async () => {
    const agent = new GreetingAgent();
    const weekday: DayOfWeek = 'Wednesday';

    const response = await agent.run(
      createRequest('Bob', 'neutral', weekday, 'English'),
    );

    expect(response.greeting).toBeTruthy();
    expect(response.moodResponse).toBeTruthy();
    expect(response.weekendMessage).toBeUndefined();
  }, 15000);

  test('should handle different languages', async () => {
    const agent = new GreetingAgent();
    const greetings: Record<Language, string> = {
      English: "Hello Charlie! It's great to meet you!",
      Spanish: '¡Hola Charlie! ¡Es un placer conocerte!',
      French: 'Bonjour Charlie! Ravi de vous rencontrer!',
    };

    for (const [language, expectedGreeting] of Object.entries(greetings)) {
      const response = await agent.run(
        createRequest('Charlie', 'happy', 'Monday', language as Language),
      );

      expect(response.greeting).toBeTruthy();
      expect(areSimilar(response.greeting, expectedGreeting)).toBeTruthy();

      await sleep(1000);
    }
  }, 90000);

  test('should handle all mood types appropriately', async () => {
    const agent = new GreetingAgent();
    const moods: Record<UserMood, string> = {
      happy: "I'm glad to hear you're feeling happy!",
      neutral: "I understand you're feeling balanced and steady.",
      sad: "I'm here to support you through this difficult time.",
    };

    for (const [mood, expectedResponse] of Object.entries(moods)) {
      const response = await agent.run(
        createRequest('David', mood as UserMood, 'Tuesday', 'English'),
      );

      expect(response.greeting).toBeTruthy();
      expect(response.moodResponse).toBeTruthy();
      expect(areSimilar(response.moodResponse, expectedResponse)).toBeTruthy();

      await sleep(1000);
    }
  }, 90000);
});
