import { describe, it, expect } from '@jest/globals';
import { ModelRegistryService } from '../services/model-registry.service.js';
import { MODEL_CARDS, type ProviderName, type RoutingSignal } from '../config/models.js';

describe('ModelRegistryService selection', () => {
  const registry = ModelRegistryService.getInstance();
  const baseSignal: RoutingSignal = {
    mentionsCode: false,
    requiresLongContext: false,
    needsMultimodal: false,
    needsHighSafety: false,
    domain: 'general',
    latencyPreference: 'normal'
  };

  it('prefers specified provider when available', () => {
    const anyOpenAI = MODEL_CARDS.find(c => c.provider === 'openai');
    if (!anyOpenAI) return; // skip if no OpenAI in test env
    const selected = registry.selectBestModel(baseSignal, { preferProvider: 'openai' as ProviderName });
    expect(selected?.provider).toBe('openai');
  });

  it('respects disallowProviders', () => {
    const selected = registry.selectBestModel(baseSignal, { disallowProviders: ['anthropic'] as ProviderName[] });
    expect(selected?.provider).not.toBe('anthropic');
  });
});
