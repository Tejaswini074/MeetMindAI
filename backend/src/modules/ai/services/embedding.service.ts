import { env } from '@config/env';
import { getOpenAIClient } from '@modules/ai/services/openai.client';
import { logAiUsage } from '@modules/ai/services/aiUsage.service';
import { AiFeature } from '@prisma/client';

export async function embedText(text: string, userId?: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });

  await logAiUsage({
    userId,
    feature: AiFeature.EMBEDDING,
    model: env.OPENAI_EMBEDDING_MODEL,
    tokensUsed: response.usage?.total_tokens,
  });

  return response.data[0].embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
