export type ProviderName = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'mistral' | 'openai_compat';

export interface ModelCard {
  provider: ProviderName;
  model: string;
  displayName: string;
  contextWindowK: number;
  costTier: 'low' | 'medium' | 'high';
  speedTier: 'fast' | 'medium' | 'slow';
  strengths: string[];
  weaknesses?: string[];
  modalities: Array<'text' | 'image' | 'audio' | 'tools'>;
  supportsFunctionCalling?: boolean;
  bestFor: string[]; // tags like 'coding', 'long_context', 'reasoning', 'factuality', 'creative'
  safetyLevel: 'standard' | 'high';
}

export const MODEL_CARDS: ModelCard[] = [
  {
    provider: 'openai',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    displayName: 'GPT-4o-mini',
    contextWindowK: 128,
    costTier: 'low',
    speedTier: 'fast',
    strengths: ['coding', 'chat', 'tools'],
    modalities: ['text', 'image', 'tools'],
    supportsFunctionCalling: true,
    bestFor: ['coding', 'general', 'multimodal'],
    safetyLevel: 'standard'
  },
  {
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    contextWindowK: 128,
    costTier: 'high',
    speedTier: 'medium',
    strengths: ['reasoning', 'coding', 'multimodal'],
    modalities: ['text', 'image', 'tools'],
    supportsFunctionCalling: true,
    bestFor: ['reasoning', 'coding', 'analysis'],
    safetyLevel: 'standard'
  },
  {
    provider: 'anthropic',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
    displayName: 'Claude 3.5 Sonnet',
    contextWindowK: 200,
    costTier: 'high',
    speedTier: 'medium',
    strengths: ['long_context', 'factuality', 'writing'],
    modalities: ['text', 'tools'],
    supportsFunctionCalling: false,
    bestFor: ['long_context', 'factuality', 'writing'],
    safetyLevel: 'high'
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    contextWindowK: 1000,
    costTier: 'medium',
    speedTier: 'medium',
    strengths: ['multimodal', 'long_context'],
    modalities: ['text', 'image', 'tools'],
    supportsFunctionCalling: false,
    bestFor: ['multimodal', 'long_context'],
    safetyLevel: 'standard'
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    contextWindowK: 1000,
    costTier: 'low',
    speedTier: 'fast',
    strengths: ['speed', 'multimodal'],
    modalities: ['text', 'image'],
    supportsFunctionCalling: false,
    bestFor: ['chat', 'multimodal'],
    safetyLevel: 'standard'
  },
  {
    provider: 'groq',
    model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
    displayName: 'Llama 3.1 70B (Groq)',
    contextWindowK: 128,
    costTier: 'low',
    speedTier: 'fast',
    strengths: ['speed', 'coding', 'general'],
    modalities: ['text'],
    supportsFunctionCalling: false,
    bestFor: ['coding', 'chat', 'low_latency'],
    safetyLevel: 'standard'
  },
  {
    provider: 'mistral',
    model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
    displayName: 'Mistral Large',
    contextWindowK: 32,
    costTier: 'medium',
    speedTier: 'medium',
    strengths: ['coding', 'tools', 'general'],
    modalities: ['text', 'tools'],
    supportsFunctionCalling: true,
    bestFor: ['coding', 'tools'],
    safetyLevel: 'standard'
  },
  {
    provider: 'openai_compat',
    model: process.env.OPENAI_COMPAT_MODEL || 'qwen2.5-32b-instruct',
    displayName: 'OpenAI-Compatible (Custom Endpoint)',
    contextWindowK: 128,
    costTier: 'low',
    speedTier: 'medium',
    strengths: ['flexibility'],
    modalities: ['text', 'tools'],
    supportsFunctionCalling: true,
    bestFor: ['self_hosted', 'custom_endpoints'],
    safetyLevel: 'standard'
  }
];

export interface RoutingSignal {
  mentionsCode: boolean;
  requiresLongContext: boolean;
  needsMultimodal: boolean;
  needsHighSafety: boolean;
  domain: 'gaming' | 'technical' | 'general' | 'realworld';
  latencyPreference: 'low' | 'normal';
}

export function filterAvailableModels(cards: ModelCard[]): ModelCard[] {
  return cards.filter(card => {
    if (card.provider === 'openai' && !process.env.OPENAI_API_KEY) return false;
    if (card.provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) return false;
    if (card.provider === 'gemini' && !process.env.GEMINI_API_KEY) return true; // Gemini optional
    if (card.provider === 'groq' && !process.env.GROQ_API_KEY) return false;
    if (card.provider === 'mistral' && !process.env.MISTRAL_API_KEY) return false;
    if (card.provider === 'openai_compat' && !process.env.OPENAI_COMPAT_API_KEY) return false;
    return true;
  });
}

export function rankModelsForSignals(cards: ModelCard[], signal: RoutingSignal): ModelCard[] {
  const scored = cards.map(card => {
    let score = 0;
    if (signal.mentionsCode && card.bestFor.includes('coding')) score += 3;
    if (signal.requiresLongContext && (card.bestFor.includes('long_context') || card.contextWindowK >= 128)) score += 2;
    if (signal.needsMultimodal && card.modalities.includes('image')) score += 2;
    if (signal.needsHighSafety && card.safetyLevel === 'high') score += 2;
    if (signal.domain === 'technical' && (card.bestFor.includes('coding') || card.bestFor.includes('reasoning'))) score += 2;
    if (signal.latencyPreference === 'low' && card.speedTier === 'fast') score += 1;
    // Prefer lower cost when ties
    const costBias = card.costTier === 'low' ? 0.5 : card.costTier === 'medium' ? 0.25 : 0;
    score += costBias;
    return { card, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.card);
}