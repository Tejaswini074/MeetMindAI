import OpenAI from 'openai';
import { env } from '@config/env';
import { AppError } from '@common/errors/AppError';

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw AppError.internal(
      'OPENAI_API_KEY is not configured. Set it in your .env to use AI features.',
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}
