// @ts-nocheck
/**
 * Advanced Vercel AI SDK Provider with TypeScript-First AI Flows
 * Implements comprehensive AI capabilities with streaming, tools, and multi-modal support
 */
import { 
  generateText, 
  generateObject, 
  streamText, 
  tool,
  CoreMessage,
  LanguageModel,
  GenerateObjectResult
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolInvocations?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
}

interface AIGenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  stream?: boolean;
  tools?: Record<string, AITool>;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json' | 'structured';
  schema?: z.ZodSchema;
}

interface AITool {
  description: string;
  parameters: z.ZodSchema;
  execute: (args: any) => Promise<any> | any;
}

interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'tool-calls' | 'content-filter' | 'other';
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
  metadata: {
    model: string;
    provider: string;
    duration: number;
    timestamp: string;
  };
}

export class VercelAIProvider {
  private models: Map<string, LanguageModel> = new Map();
  private defaultModel = 'gpt-4o-mini';

  constructor() {
    this.initializeModels();
  }

  private initializeModels(): void {
    // OpenAI models
    this.models.set('gpt-4o', openai('gpt-4o'));
    this.models.set('gpt-4o-mini', openai('gpt-4o-mini'));
    this.models.set('gpt-4-turbo', openai('gpt-4-turbo'));
    this.models.set('gpt-3.5-turbo', openai('gpt-3.5-turbo'));

    // Google models
    this.models.set('gemini-pro', google('models/gemini-pro'));
    this.models.set('gemini-pro-vision', google('models/gemini-pro-vision'));
    
    // Anthropic models
    this.models.set('claude-3-opus', anthropic('claude-3-opus-20240229'));
    this.models.set('claude-3-sonnet', anthropic('claude-3-sonnet-20240229'));
    this.models.set('claude-3-haiku', anthropic('claude-3-haiku-20240307'));
  }

  private getModel(modelName?: string): LanguageModel {
    const model = this.models.get(modelName || this.defaultModel);
    if (!model) {
      logger.warn(`Model ${modelName} not found, using default: ${this.defaultModel}`);
      return this.models.get(this.defaultModel)!;
    }
    return model;
  }

  private formatMessages(
    prompt: string, 
    history: Array<{ role: string; content: string }>, 
    systemPrompt?: string
  ): CoreMessage[] {
    const messages: CoreMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    for (const msg of history) {
      messages.push({ 
        role: msg.role as 'user' | 'assistant' | 'system', 
        content: msg.content 
      });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    return messages;
  }

  /**
   * Legacy generate method for backward compatibility
   */
  async generate(prompt: string, history: Array<{ role: string; content: string }>, systemPrompt?: string, modelName?: string): Promise<string> {
    if (process.env.FEATURE_VERCEL_AI !== 'true') throw new Error('Vercel AI is disabled');
    
    const response = await this.generateAdvanced(prompt, history, {
      model: modelName,
      systemPrompt
    });
    
    return response.content;
  }

  /**
   * Generate text with comprehensive options and error handling
   */
  async generateAdvanced(
    prompt: string, 
    history: Array<{ role: string; content: string }> = [], 
    options: AIGenerationOptions = {}
  ): Promise<AIResponse> {
    if (process.env.FEATURE_VERCEL_AI !== 'true') {
      throw new Error('Vercel AI is disabled');
    }

    const startTime = Date.now();
    const model = this.getModel(options.model);
    const messages = this.formatMessages(prompt, history, options.systemPrompt);

    try {
      const result = await generateText({
        model,
        messages,
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        topP: options.topP,
        presencePenalty: options.presencePenalty,
        frequencyPenalty: options.frequencyPenalty,
        seed: options.seed,
        tools: options.tools ? this.convertTools(options.tools) : undefined
      });

      const duration = Date.now() - startTime;

      return {
        content: result.text,
        usage: {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens
        },
        finishReason: result.finishReason,
        toolCalls: result.toolCalls?.map(call => ({
          id: call.toolCallId,
          name: call.toolName,
          args: call.args,
          result: call.result
        })),
        metadata: {
          model: options.model || this.defaultModel,
          provider: this.getProviderName(options.model),
          duration,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Vercel AI generation failed', { error, model: options.model });
      throw new Error(`AI generation failed: ${error}`);
    }
  }

  /**
   * Generate structured objects with schema validation
   */
  async generateObject<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    history: Array<{ role: string; content: string }> = [],
    options: AIGenerationOptions = {}
  ): Promise<GenerateObjectResult<T> & { metadata: AIResponse['metadata'] }> {
    if (process.env.FEATURE_VERCEL_AI !== 'true') {
      throw new Error('Vercel AI is disabled');
    }

    const startTime = Date.now();
    const model = this.getModel(options.model);
    const messages = this.formatMessages(prompt, history, options.systemPrompt);

    try {
      const result = await generateObject({
        model,
        messages,
        schema,
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        topP: options.topP,
        presencePenalty: options.presencePenalty,
        frequencyPenalty: options.frequencyPenalty,
        seed: options.seed
      });

      const duration = Date.now() - startTime;

      return {
        ...result,
        metadata: {
          model: options.model || this.defaultModel,
          provider: this.getProviderName(options.model),
          duration,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Vercel AI object generation failed', { error, model: options.model });
      throw new Error(`AI object generation failed: ${error}`);
    }
  }

  /**
   * Stream text generation with real-time response
   */
  async *generateStream(
    prompt: string, 
    history: Array<{ role: string; content: string }> = [], 
    options: AIGenerationOptions = {}
  ): AsyncGenerator<string, AIResponse['metadata'], unknown> {
    if (process.env.FEATURE_VERCEL_AI !== 'true') {
      throw new Error('Vercel AI is disabled');
    }

    const startTime = Date.now();
    const model = this.getModel(options.model);
    const messages = this.formatMessages(prompt, history, options.systemPrompt);

    try {
      const result = await streamText({
        model,
        messages,
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        topP: options.topP,
        presencePenalty: options.presencePenalty,
        frequencyPenalty: options.frequencyPenalty,
        seed: options.seed,
        tools: options.tools ? this.convertTools(options.tools) : undefined
      });

      // Stream the text chunks
      for await (const delta of result.textStream) {
        yield delta;
      }

      const duration = Date.now() - startTime;

      // Return final metadata
      return {
        model: options.model || this.defaultModel,
        provider: this.getProviderName(options.model),
        duration,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Vercel AI streaming failed', { error, model: options.model });
      throw new Error(`AI streaming failed: ${error}`);
    }
  }

  /**
   * Define and use AI tools for enhanced capabilities
   */
  createTool(name: string, description: string, schema: z.ZodSchema, executor: (args: any) => Promise<any>): AITool {
    return {
      description,
      parameters: schema,
      execute: executor
    };
  }

  /**
   * Get available models and their capabilities
   */
  getAvailableModels(): Array<{
    id: string;
    name: string;
    provider: string;
    capabilities: string[];
    contextWindow: number;
  }> {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        capabilities: ['text', 'vision', 'tools', 'streaming'],
        contextWindow: 128000
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI',
        capabilities: ['text', 'vision', 'tools', 'streaming'],
        contextWindow: 128000
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        capabilities: ['text', 'vision', 'tools', 'analysis'],
        contextWindow: 200000
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        capabilities: ['text', 'vision', 'tools'],
        contextWindow: 200000
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        provider: 'Google',
        capabilities: ['text', 'tools', 'multimodal'],
        contextWindow: 1000000
      }
    ];
  }

  /**
   * Health check for the Vercel AI provider
   */
  async healthCheck(): Promise<{
    available: boolean;
    models: number;
    features: string[];
    error?: string;
  }> {
    try {
      if (process.env.FEATURE_VERCEL_AI !== 'true') {
        return {
          available: false,
          models: 0,
          features: [],
          error: 'Feature disabled'
        };
      }

      return {
        available: true,
        models: this.models.size,
        features: ['text-generation', 'streaming', 'structured-output', 'tools', 'multi-model'],
        error: undefined
      };

    } catch (error) {
      return {
        available: false,
        models: this.models.size,
        features: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Helper methods

  private convertTools(tools: Record<string, AITool>): Record<string, any> {
    const convertedTools: Record<string, any> = {};
    
    for (const [name, toolDef] of Object.entries(tools)) {
      convertedTools[name] = tool({
        description: toolDef.description,
        parameters: toolDef.parameters,
        execute: toolDef.execute
      });
    }
    
    return convertedTools;
  }

  private getProviderName(modelName?: string): string {
    const model = modelName || this.defaultModel;
    
    if (model.startsWith('gpt')) return 'OpenAI';
    if (model.startsWith('claude')) return 'Anthropic';
    if (model.startsWith('gemini')) return 'Google';
    
    return 'Unknown';
  }
}

// Export singleton instance
export const vercelAIProvider = new VercelAIProvider();