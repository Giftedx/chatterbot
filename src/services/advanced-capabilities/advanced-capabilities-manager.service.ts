/**
 * Advanced Capabilities Manager
 * 
 * Coordinates all advanced AI capabilities in a seamless, intelligent manner.
 * Acts as the central hub for capability orchestration, execution, and integration.
 */

import { Message, ChatInputCommandInteraction, Attachment } from 'discord.js';
import { logger } from '../../utils/logger.js';

// Import capability services
import { 
  IntelligentCapabilityOrchestrator, 
  CapabilityRequest, 
  ConversationContext,
  CapabilityResult 
} from './intelligent-orchestrator.service.js';

import { 
  ImageGenerationService,
  ImageGenerationRequest,
  ImageGenerationResult 
} from './image-generation.service.js';

import { 
  GifGenerationService,
  GifGenerationRequest,
  GifGenerationResult 
} from './gif-generation.service.js';

import { 
  SpeechGenerationService,
  SpeechGenerationRequest,
  SpeechGenerationResult 
} from './speech-generation.service.js';

import { 
  EnhancedReasoningService,
  ReasoningRequest,
  ReasoningResult 
} from './enhanced-reasoning.service.js';

// Import existing MCP integration
import { braveWebSearch, BraveWebSearchParams } from '../../mcp/index.js';

export interface AdvancedCapabilitiesConfig {
  enableImageGeneration: boolean;
  enableGifGeneration: boolean;
  enableSpeechGeneration: boolean;
  enableEnhancedReasoning: boolean;
  enableWebSearch: boolean;
  enableMemoryEnhancement: boolean;
  maxConcurrentCapabilities: number;
  responseTimeoutMs: number;
}

export interface CapabilityExecutionResult {
  capabilityType: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  confidence: number;
}

export interface EnhancedResponse {
  textResponse: string;
  attachments: Array<{
    type: 'image' | 'gif' | 'audio';
    url?: string;
    buffer?: Buffer;
    filename: string;
    description: string;
  }>;
  reasoning?: string;
  webSearchResults?: any[];
  metadata: {
    capabilitiesUsed: string[];
    totalExecutionTime: number;
    confidenceScore: number;
  };
}

export class AdvancedCapabilitiesManager {
  private orchestrator: IntelligentCapabilityOrchestrator;
  private imageService: ImageGenerationService;
  private gifService: GifGenerationService;
  private speechService: SpeechGenerationService;
  private reasoningService: EnhancedReasoningService;
  
  private config: AdvancedCapabilitiesConfig;
  private activeExecutions = new Map<string, Promise<any>>();

  constructor(config: Partial<AdvancedCapabilitiesConfig> = {}) {
    this.config = {
      enableImageGeneration: true,
      enableGifGeneration: true,
      enableSpeechGeneration: true,
      enableEnhancedReasoning: true,
      enableWebSearch: true,
      enableMemoryEnhancement: true,
      maxConcurrentCapabilities: 3,
      responseTimeoutMs: 30000,
      ...config
    };

    // Initialize services
    this.orchestrator = new IntelligentCapabilityOrchestrator();
    this.imageService = new ImageGenerationService();
    this.gifService = new GifGenerationService();
    this.speechService = new SpeechGenerationService();
    this.reasoningService = new EnhancedReasoningService();

    logger.info('Advanced Capabilities Manager initialized', {
      capabilities: this.getEnabledCapabilities()
    });
  }

  /**
   * Main entry point for processing messages with advanced capabilities
   */
  async processMessage(
    message: string,
    attachments: Attachment[],
    userId: string,
    channelId: string,
    guildId?: string,
    conversationHistory: string[] = [],
    userPreferences: Record<string, any> = {}
  ): Promise<EnhancedResponse> {
    const startTime = Date.now();
    const executionId = `${userId}_${Date.now()}`;

    try {
      logger.debug('Processing message with advanced capabilities', {
        userId,
        messageLength: message.length,
        attachmentCount: attachments.length,
        executionId
      });

      // Build conversation context
      const context: ConversationContext = {
        userId,
        channelId,
        guildId,
        messageContent: message,
        attachments,
        conversationHistory,
        userPreferences,
        timeOfDay: new Date().toLocaleTimeString(),
        userEmotion: this.detectUserEmotion(message),
        topicCategory: this.categorizeMessage(message)
      };

      // Analyze and determine which capabilities to activate
      const capabilityRequests = await this.orchestrator.analyzeAndOrchestrate(context);
      
      logger.debug('Capability orchestration complete', {
        userId,
        capabilitiesDetected: capabilityRequests.length,
        capabilities: capabilityRequests.map(c => ({ type: c.type, confidence: c.confidence }))
      });

      // Execute capabilities concurrently (up to max limit)
      const executionResults = await this.executeCapabilities(capabilityRequests, executionId);

      // Generate enhanced response
      const enhancedResponse = await this.generateEnhancedResponse(
        message,
        context,
        executionResults,
        startTime
      );

      // Clean up execution tracking
      this.activeExecutions.delete(executionId);

      logger.info('Advanced capabilities processing complete', {
        userId,
        capabilitiesUsed: enhancedResponse.metadata.capabilitiesUsed,
        totalExecutionTime: enhancedResponse.metadata.totalExecutionTime,
        confidenceScore: enhancedResponse.metadata.confidenceScore
      });

      return enhancedResponse;

    } catch (error) {
      logger.error('Advanced capabilities processing error', {
        error: String(error),
        userId,
        executionId
      });

      // Return fallback response
      return {
        textResponse: 'I encountered an issue while processing your request with advanced capabilities. Let me provide a standard response instead.',
        attachments: [],
        metadata: {
          capabilitiesUsed: ['fallback'],
          totalExecutionTime: Date.now() - startTime,
          confidenceScore: 0.1
        }
      };
    }
  }

  /**
   * Executes multiple capabilities concurrently with proper error handling
   */
  private async executeCapabilities(
    requests: CapabilityRequest[],
    executionId: string
  ): Promise<CapabilityExecutionResult[]> {
    const results: CapabilityExecutionResult[] = [];
    
    // Group by priority and execute in batches
    const priorityGroups = this.groupByPriority(requests);
    
    for (const [priority, groupRequests] of priorityGroups) {
      logger.debug(`Executing ${priority} priority capabilities`, {
        count: groupRequests.length,
        executionId
      });

      // Execute capabilities in this priority group concurrently
      const batchSize = Math.min(groupRequests.length, this.config.maxConcurrentCapabilities);
      const batches = this.createBatches(groupRequests, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(request => this.executeCapability(request, executionId));
        const batchResults = await Promise.allSettled(batchPromises);

        // Process batch results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              capabilityType: batch[index].type,
              success: false,
              error: String(result.reason),
              executionTime: 0,
              confidence: 0
            });
          }
        });
      }

      // If we have critical results, we might want to stop here
      if (priority === 'critical' && results.some(r => r.success)) {
        break;
      }
    }

    return results;
  }

  /**
   * Executes a single capability with timeout and error handling
   */
  private async executeCapability(
    request: CapabilityRequest,
    executionId: string
  ): Promise<CapabilityExecutionResult> {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Capability execution timeout')), this.config.responseTimeoutMs);
      });

      let result: any;

      // Execute the appropriate capability
      const executionPromise = (async () => {
        switch (request.type) {
          case 'image_generation':
            if (!this.config.enableImageGeneration) throw new Error('Image generation disabled');
            return await this.executeImageGeneration(request);

          case 'gif_generation':
            if (!this.config.enableGifGeneration) throw new Error('GIF generation disabled');
            return await this.executeGifGeneration(request);

          case 'speech_generation':
            if (!this.config.enableSpeechGeneration) throw new Error('Speech generation disabled');
            return await this.executeSpeechGeneration(request);

          case 'reasoning':
            if (!this.config.enableEnhancedReasoning) throw new Error('Enhanced reasoning disabled');
            return await this.executeReasoning(request);

          case 'web_search':
            if (!this.config.enableWebSearch) throw new Error('Web search disabled');
            return await this.executeWebSearch(request);

          case 'memory_enhancement':
            if (!this.config.enableMemoryEnhancement) throw new Error('Memory enhancement disabled');
            return await this.executeMemoryEnhancement(request);

          default:
            throw new Error(`Unknown capability type: ${request.type}`);
        }
      })();

      // Race between execution and timeout
      result = await Promise.race([executionPromise, timeoutPromise]);

      return {
        capabilityType: request.type,
        success: true,
        result,
        executionTime: Date.now() - startTime,
        confidence: request.confidence
      };

    } catch (error) {
      logger.warn(`Capability execution failed: ${request.type}`, {
        error: String(error),
        executionId,
        requestContext: request.context
      });

      return {
        capabilityType: request.type,
        success: false,
        error: String(error),
        executionTime: Date.now() - startTime,
        confidence: 0
      };
    }
  }

  // Individual capability execution methods
  private async executeImageGeneration(request: CapabilityRequest): Promise<ImageGenerationResult> {
    const imageRequest: ImageGenerationRequest = {
      prompt: this.imageService.enhancePrompt(request.parameters.prompt, request.parameters.style),
      style: request.parameters.style,
      size: request.parameters.size,
      userId: 'system' // This would be passed from the main request
    };

    // Validate prompt first
    const validation = this.imageService.validatePrompt(imageRequest.prompt);
    if (!validation.valid) {
      throw new Error(`Invalid image prompt: ${validation.issues?.join(', ')}`);
    }

    imageRequest.prompt = validation.sanitized;
    return await this.imageService.generateImage(imageRequest);
  }

  private async executeGifGeneration(request: CapabilityRequest): Promise<GifGenerationResult> {
    const gifRequest: GifGenerationRequest = {
      emotion: request.parameters.emotion,
      style: request.parameters.style,
      duration: request.parameters.duration,
      userId: 'system' // This would be passed from the main request
    };

    const validation = this.gifService.validateRequest(gifRequest);
    if (!validation.valid) {
      throw new Error(`Invalid GIF request: ${validation.issues?.join(', ')}`);
    }

    return await this.gifService.generateGif(gifRequest);
  }

  private async executeSpeechGeneration(request: CapabilityRequest): Promise<SpeechGenerationResult> {
    const speechRequest: SpeechGenerationRequest = {
      text: request.parameters.text || request.context,
      voice: request.parameters.voice,
      speed: request.parameters.speed,
      emotion: request.parameters.emotion,
      userId: 'system' // This would be passed from the main request
    };

    return await this.speechService.generateSpeech(speechRequest);
  }

  private async executeReasoning(request: CapabilityRequest): Promise<ReasoningResult> {
    const reasoningRequest: ReasoningRequest = {
      query: request.context,
      analysisType: request.parameters.analysisType,
      complexity: request.parameters.complexity,
      maxSteps: request.parameters.steps,
      userId: 'system' // This would be passed from the main request
    };

    return await this.reasoningService.performReasoning(reasoningRequest);
  }

  private async executeWebSearch(request: CapabilityRequest): Promise<any> {
    const searchParams: BraveWebSearchParams = {
      query: request.parameters.query,
      count: request.parameters.maxResults || 5
    };

    return await braveWebSearch(searchParams);
  }

  private async executeMemoryEnhancement(request: CapabilityRequest): Promise<any> {
    // Placeholder for memory enhancement
    // This would integrate with the existing memory services
    return {
      type: 'memory_enhancement',
      categories: request.parameters.categories,
      importance: request.parameters.importance,
      processed: true
    };
  }

  /**
   * Generates the final enhanced response by combining all capability results
   */
  private async generateEnhancedResponse(
    originalMessage: string,
    context: ConversationContext,
    executionResults: CapabilityExecutionResult[],
    startTime: number
  ): Promise<EnhancedResponse> {
    const attachments: EnhancedResponse['attachments'] = [];
    const capabilitiesUsed: string[] = [];
    let textResponse = 'I\'ve processed your request with my advanced capabilities.';
    let reasoning: string | undefined;
    let webSearchResults: any[] | undefined;

    // Process successful results
    const successfulResults = executionResults.filter(r => r.success);
    
    for (const result of successfulResults) {
      capabilitiesUsed.push(result.capabilityType);

      switch (result.capabilityType) {
        case 'image_generation':
          if (result.result?.success && result.result.imageUrl) {
            attachments.push({
              type: 'image',
              url: result.result.imageUrl,
              filename: 'generated_image.png',
              description: `Generated image: ${result.result.metadata.prompt}`
            });
            textResponse = `I've created an image for you based on your request.`;
          }
          break;

        case 'gif_generation':
          if (result.result?.success && result.result.gifUrl) {
            attachments.push({
              type: 'gif',
              url: result.result.gifUrl,
              filename: 'reaction.gif',
              description: `GIF expressing: ${result.result.metadata.emotion}`
            });
            textResponse = `Here's a GIF that captures the emotion you're expressing!`;
          }
          break;

        case 'speech_generation':
          if (result.result?.success && result.result.audioBuffer) {
            attachments.push({
              type: 'audio',
              buffer: result.result.audioBuffer,
              filename: 'voice_message.mp3',
              description: 'AI-generated voice message'
            });
            textResponse = `I've created a voice message for you!`;
          }
          break;

        case 'reasoning':
          if (result.result?.success) {
            reasoning = this.reasoningService.formatReasoningExplanation(result.result);
            textResponse = `I've analyzed your question thoroughly. ${result.result.analysis.conclusion}`;
          }
          break;

        case 'web_search':
          if (result.result?.results) {
            webSearchResults = result.result.results;
            textResponse = `I've searched the web for current information to help answer your question.`;
          }
          break;
      }
    }

    // Calculate overall confidence
    const confidenceScore = successfulResults.length > 0 
      ? successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length
      : 0.1;

    return {
      textResponse,
      attachments,
      reasoning,
      webSearchResults,
      metadata: {
        capabilitiesUsed,
        totalExecutionTime: Date.now() - startTime,
        confidenceScore
      }
    };
  }

  // Helper methods
  private detectUserEmotion(message: string): string {
    const emotions = {
      'happy': ['happy', 'excited', 'great', 'awesome', 'love', '😊', '😄', '🎉'],
      'sad': ['sad', 'disappointed', 'upset', 'down', '😢', '😞'],
      'angry': ['angry', 'mad', 'frustrated', 'annoyed', '😠', '😡'],
      'confused': ['confused', 'unclear', 'lost', 'don\'t understand', '🤔'],
      'surprised': ['wow', 'amazing', 'incredible', 'surprised', '😲', '🤯']
    };

    const lowerMessage = message.toLowerCase();
    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return emotion;
      }
    }

    return 'neutral';
  }

  private categorizeMessage(message: string): string {
    const categories = {
      'creative': ['create', 'design', 'art', 'imagine', 'draw'],
      'analytical': ['analyze', 'compare', 'explain', 'why', 'how'],
      'informational': ['what', 'when', 'where', 'who', 'information'],
      'conversational': ['hello', 'hi', 'chat', 'talk', 'conversation']
    };

    const lowerMessage = message.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  private groupByPriority(requests: CapabilityRequest[]): Map<string, CapabilityRequest[]> {
    const groups = new Map<string, CapabilityRequest[]>();
    
    for (const request of requests) {
      const priority = request.priority;
      if (!groups.has(priority)) {
        groups.set(priority, []);
      }
      groups.get(priority)!.push(request);
    }

    // Return in priority order
    const orderedGroups = new Map<string, CapabilityRequest[]>();
    for (const priority of ['critical', 'high', 'medium', 'low']) {
      if (groups.has(priority)) {
        orderedGroups.set(priority, groups.get(priority)!);
      }
    }

    return orderedGroups;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private getEnabledCapabilities(): string[] {
    const capabilities: string[] = [];
    if (this.config.enableImageGeneration) capabilities.push('image_generation');
    if (this.config.enableGifGeneration) capabilities.push('gif_generation');
    if (this.config.enableSpeechGeneration) capabilities.push('speech_generation');
    if (this.config.enableEnhancedReasoning) capabilities.push('enhanced_reasoning');
    if (this.config.enableWebSearch) capabilities.push('web_search');
    if (this.config.enableMemoryEnhancement) capabilities.push('memory_enhancement');
    return capabilities;
  }

  /**
   * Updates capability configuration at runtime
   */
  updateConfig(newConfig: Partial<AdvancedCapabilitiesConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Advanced capabilities configuration updated', {
      enabledCapabilities: this.getEnabledCapabilities()
    });
  }

  /**
   * Gets current capability status and statistics
   */
  getStatus(): { 
    config: AdvancedCapabilitiesConfig;
    activeExecutions: number;
    enabledCapabilities: string[];
  } {
    return {
      config: this.config,
      activeExecutions: this.activeExecutions.size,
      enabledCapabilities: this.getEnabledCapabilities()
    };
  }
}