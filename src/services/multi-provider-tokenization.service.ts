/**
 * Multi-Provider Tokenization Service
 * Supports accurate token counting for multiple AI providers
 * OpenAI, Anthropic, Google, and custom tokenizers
 */

import { encoding_for_model, get_encoding } from '@dqbd/tiktoken';
import { features } from '../config/feature-flags.js';
import { logger } from '../utils/logger.js';

export type SupportedProvider = 'openai' | 'anthropic' | 'google' | 'qwen' | 'mistral' | 'groq';
export type SupportedModel = 
  | 'gpt-3.5-turbo' 
  | 'gpt-4' 
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'claude-3-5-sonnet'
  | 'gemini-pro'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'qwen2.5-32b'
  | 'qwen2.5-72b'
  | 'mistral-large'
  | 'llama-3.1-70b';

interface TokenizationResult {
  tokens: number;
  provider: SupportedProvider;
  model: string;
  encoding?: string;
  estimatedCost?: number;
  metadata?: Record<string, any>;
}

interface ProviderConfig {
  encoding: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  contextWindow: number;
  specialTokens?: string[];
}

export class MultiProviderTokenizationService {
  private isEnabled: boolean;
  private providerConfigs: Map<SupportedProvider, Map<string, ProviderConfig>>;
  private encodings: Map<string, any> = new Map();

  constructor() {
    this.isEnabled = features.multiProviderTokenization;
    this.providerConfigs = this.initializeProviderConfigs();
    
    if (this.isEnabled) {
      logger.info('Multi-provider tokenization service initialized');
    }
  }

  private initializeProviderConfigs(): Map<SupportedProvider, Map<string, ProviderConfig>> {
    const configs = new Map<SupportedProvider, Map<string, ProviderConfig>>();

    // OpenAI models
    const openaiModels = new Map<string, ProviderConfig>();
    openaiModels.set('gpt-3.5-turbo', {
      encoding: 'cl100k_base',
      costPer1kInput: 0.0015,
      costPer1kOutput: 0.002,
      contextWindow: 16385
    });
    openaiModels.set('gpt-4', {
      encoding: 'cl100k_base',
      costPer1kInput: 0.03,
      costPer1kOutput: 0.06,
      contextWindow: 8192
    });
    openaiModels.set('gpt-4o', {
      encoding: 'o200k_base',
      costPer1kInput: 0.005,
      costPer1kOutput: 0.015,
      contextWindow: 128000
    });
    openaiModels.set('gpt-4o-mini', {
      encoding: 'o200k_base',
      costPer1kInput: 0.00015,
      costPer1kOutput: 0.0006,
      contextWindow: 128000
    });
    configs.set('openai', openaiModels);

    // Anthropic models (using approximation for now)
    const anthropicModels = new Map<string, ProviderConfig>();
    anthropicModels.set('claude-3-opus', {
      encoding: 'cl100k_base', // Approximation
      costPer1kInput: 0.015,
      costPer1kOutput: 0.075,
      contextWindow: 200000
    });
    anthropicModels.set('claude-3-sonnet', {
      encoding: 'cl100k_base',
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
      contextWindow: 200000
    });
    anthropicModels.set('claude-3-haiku', {
      encoding: 'cl100k_base',
      costPer1kInput: 0.00025,
      costPer1kOutput: 0.00125,
      contextWindow: 200000
    });
    anthropicModels.set('claude-3-5-sonnet', {
      encoding: 'cl100k_base',
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
      contextWindow: 200000
    });
    configs.set('anthropic', anthropicModels);

    // Google models
    const googleModels = new Map<string, ProviderConfig>();
    googleModels.set('gemini-pro', {
      encoding: 'cl100k_base', // Approximation
      costPer1kInput: 0.0005,
      costPer1kOutput: 0.0015,
      contextWindow: 30720
    });
    googleModels.set('gemini-1.5-pro', {
      encoding: 'cl100k_base',
      costPer1kInput: 0.0035,
      costPer1kOutput: 0.0105,
      contextWindow: 1000000
    });
    googleModels.set('gemini-1.5-flash', {
      encoding: 'cl100k_base',
      costPer1kInput: 0.000075,
      costPer1kOutput: 0.0003,
      contextWindow: 1000000
    });
    configs.set('google', googleModels);

    // Additional providers can be added here
    configs.set('qwen', new Map());
    configs.set('mistral', new Map());
    configs.set('groq', new Map());

    return configs;
  }

  private getEncoding(encodingName: string): any {
    if (!this.encodings.has(encodingName)) {
      try {
        const encoding = get_encoding(encodingName as any);
        this.encodings.set(encodingName, encoding);
      } catch (error) {
        logger.warn(`Failed to load encoding ${encodingName}, falling back to cl100k_base`);
        const fallback = get_encoding('cl100k_base');
        this.encodings.set(encodingName, fallback);
      }
    }
    return this.encodings.get(encodingName);
  }

  /**
   * Count tokens for any supported provider/model combination
   */
  async countTokens(params: {
    text: string;
    provider: SupportedProvider;
    model: SupportedModel;
    includeSpecialTokens?: boolean;
  }): Promise<TokenizationResult> {
    if (!this.isEnabled) {
      // Fallback to basic estimation
      return {
        tokens: Math.ceil(params.text.length / 4),
        provider: params.provider,
        model: params.model,
        encoding: 'estimated'
      };
    }

    try {
      const providerModels = this.providerConfigs.get(params.provider);
      const modelConfig = providerModels?.get(params.model);

      if (!modelConfig) {
        logger.warn(`No configuration found for ${params.provider}/${params.model}, using estimation`);
        return {
          tokens: Math.ceil(params.text.length / 4),
          provider: params.provider,
          model: params.model,
          encoding: 'estimated'
        };
      }

      const encoding = this.getEncoding(modelConfig.encoding);
      const tokens = encoding.encode(params.text);
      
      // Add special tokens if requested
      let tokenCount = tokens.length;
      if (params.includeSpecialTokens && modelConfig.specialTokens) {
        tokenCount += modelConfig.specialTokens.length;
      }

      const result: TokenizationResult = {
        tokens: tokenCount,
        provider: params.provider,
        model: params.model,
        encoding: modelConfig.encoding,
        estimatedCost: (tokenCount / 1000) * modelConfig.costPer1kInput,
        metadata: {
          contextWindow: modelConfig.contextWindow,
          costPer1kInput: modelConfig.costPer1kInput,
          costPer1kOutput: modelConfig.costPer1kOutput
        }
      };

      return result;
    } catch (error) {
      logger.error('Token counting failed:', error);
      return {
        tokens: Math.ceil(params.text.length / 4),
        provider: params.provider,
        model: params.model,
        encoding: 'error_fallback'
      };
    }
  }

  /**
   * Count tokens for conversation messages
   */
  async countConversationTokens(params: {
    messages: Array<{ role: string; content: string }>;
    provider: SupportedProvider;
    model: SupportedModel;
  }): Promise<TokenizationResult> {
    if (!this.isEnabled) {
      const totalText = params.messages.map(m => m.content).join(' ');
      return {
        tokens: Math.ceil(totalText.length / 4),
        provider: params.provider,
        model: params.model,
        encoding: 'estimated'
      };
    }

    try {
      // Different providers have different conversation formatting
      let formattedText: string;
      
      switch (params.provider) {
        case 'openai':
          formattedText = this.formatOpenAIConversation(params.messages);
          break;
        case 'anthropic':
          formattedText = this.formatAnthropicConversation(params.messages);
          break;
        case 'google':
          formattedText = this.formatGoogleConversation(params.messages);
          break;
        default:
          formattedText = params.messages.map(m => `${m.role}: ${m.content}`).join('\n');
      }

      return this.countTokens({
        text: formattedText,
        provider: params.provider,
        model: params.model,
        includeSpecialTokens: true
      });
    } catch (error) {
      logger.error('Conversation token counting failed:', error);
      const totalText = params.messages.map(m => m.content).join(' ');
      return {
        tokens: Math.ceil(totalText.length / 4),
        provider: params.provider,
        model: params.model,
        encoding: 'error_fallback'
      };
    }
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(params: {
    inputTokens: number;
    outputTokens: number;
    provider: SupportedProvider;
    model: SupportedModel;
  }): { inputCost: number; outputCost: number; totalCost: number } {
    const providerModels = this.providerConfigs.get(params.provider);
    const modelConfig = providerModels?.get(params.model);

    if (!modelConfig) {
      return { inputCost: 0, outputCost: 0, totalCost: 0 };
    }

    const inputCost = (params.inputTokens / 1000) * modelConfig.costPer1kInput;
    const outputCost = (params.outputTokens / 1000) * modelConfig.costPer1kOutput;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  /**
   * Check if text fits within model context window
   */
  checkContextWindow(params: {
    tokenCount: number;
    provider: SupportedProvider;
    model: SupportedModel;
    reserveOutputTokens?: number;
  }): { fits: boolean; maxTokens: number; available: number } {
    const providerModels = this.providerConfigs.get(params.provider);
    const modelConfig = providerModels?.get(params.model);

    if (!modelConfig) {
      return { fits: true, maxTokens: 8192, available: 8192 };
    }

    const reservedTokens = params.reserveOutputTokens || 1000;
    const available = modelConfig.contextWindow - reservedTokens;
    const fits = params.tokenCount <= available;

    return {
      fits,
      maxTokens: modelConfig.contextWindow,
      available
    };
  }

  private formatOpenAIConversation(messages: Array<{ role: string; content: string }>): string {
    return messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return `<|system|>${msg.content}<|end|>`;
        case 'user':
          return `<|user|>${msg.content}<|end|>`;
        case 'assistant':
          return `<|assistant|>${msg.content}<|end|>`;
        default:
          return `<|${msg.role}|>${msg.content}<|end|>`;
      }
    }).join('');
  }

  private formatAnthropicConversation(messages: Array<{ role: string; content: string }>): string {
    return messages.map(msg => {
      return `\n\n${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`;
    }).join('');
  }

  private formatGoogleConversation(messages: Array<{ role: string; content: string }>): string {
    return messages.map(msg => {
      const role = msg.role === 'assistant' ? 'model' : msg.role;
      return `${role}: ${msg.content}`;
    }).join('\n');
  }

  /**
   * Get supported providers and models
   */
  getSupportedProviders(): Record<SupportedProvider, SupportedModel[]> {
    const result: Record<string, SupportedModel[]> = {};
    
    for (const [provider, models] of this.providerConfigs.entries()) {
      result[provider] = Array.from(models.keys()) as SupportedModel[];
    }
    
    return result as Record<SupportedProvider, SupportedModel[]>;
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    enabled: boolean;
    supportedProviders: number;
    supportedModels: number;
    loadedEncodings: number;
  } {
    let totalModels = 0;
    for (const models of this.providerConfigs.values()) {
      totalModels += models.size;
    }

    return {
      enabled: this.isEnabled,
      supportedProviders: this.providerConfigs.size,
      supportedModels: totalModels,
      loadedEncodings: this.encodings.size
    };
  }
}

// Singleton instance
export const multiProviderTokenizer = new MultiProviderTokenizationService();