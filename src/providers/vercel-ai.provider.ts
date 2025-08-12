import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

interface AIMessage {
  role: string;
  content: string;
}

export class VercelAIProvider {
  async generate(prompt: string, history: Array<{ role: string; content: string }>, systemPrompt?: string, modelName?: string): Promise<string> {
    if (process.env.FEATURE_VERCEL_AI !== 'true') throw new Error('Vercel AI is disabled');
    const modelId = modelName || process.env.AI_MODEL || 'gpt-4o-mini';
    const provider = modelId.startsWith('gpt') ? openai : google;
    const messages: AIMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    for (const m of history) messages.push({ role: m.role, content: m.content });
    messages.push({ role: 'user', content: prompt });
    const res = await generateText({ model: provider(modelId), messages });
    return res.text || res.outputText || '';
  }
}

export const vercelAIProvider = new VercelAIProvider();