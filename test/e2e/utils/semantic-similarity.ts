import { embed, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * Check if two texts are semantically similar using OpenAI embeddings via AI SDK
 * Uses text-embedding-3-small model which is OpenAI's most cost-effective embedding model
 * at $0.00002/1K tokens (as of March 2024)
 *
 * @param text1 First text to compare
 * @param text2 Second text to compare
 * @param threshold Optional similarity threshold (0-1). Default is 0.7
 * @returns True if texts are semantically similar
 */
export async function areSimilar(
  text1: string,
  text2: string,
  threshold: number = 0.7,
): Promise<boolean> {
  if (!text1 || !text2) return false;
  if (threshold < 0 || threshold > 1) {
    throw new Error('Threshold must be between 0 and 1');
  }

  try {
    // Using text-embedding-3-small: most cost-effective model for semantic similarity
    const [embedding1, embedding2] = await Promise.all([
      embed({
        model: openai.embedding('text-embedding-3-small'),
        value: text1,
      }),
      embed({
        model: openai.embedding('text-embedding-3-small'),
        value: text2,
      }),
    ]);

    // Calculate similarity using the AI SDK's cosineSimilarity helper
    const similarity = cosineSimilarity(
      embedding1.embedding,
      embedding2.embedding,
    );

    return similarity >= threshold;
  } catch (error) {
    console.error('Error checking semantic similarity:', error);
    // In case of errors, be conservative and return false
    return false;
  }
}
