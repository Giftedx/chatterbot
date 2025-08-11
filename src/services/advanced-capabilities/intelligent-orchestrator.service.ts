/**
 * Intelligent Capability Orchestration Service
 * 
 * This service analyzes user messages and conversation context to intelligently determine
 * which advanced capabilities should be activated seamlessly in the background.
 * It operates invisibly, making the AI appear naturally capable without requiring
 * users to understand or explicitly request specific features.
 */

import { Message, ChatInputCommandInteraction, Attachment } from 'discord.js';
import { logger } from '../../utils/logger.js';

export interface CapabilityRequest {
  type: 'image_generation' | 'gif_generation' | 'speech_generation' | 'web_search' | 'reasoning' | 'memory_enhancement';
  confidence: number; // 0-1 score for how confident we are this capability is needed
  context: string;
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConversationContext {
  userId: string;
  channelId: string;
  guildId?: string;
  messageContent: string;
  attachments: Attachment[];
  conversationHistory: string[];
  userPreferences: Record<string, any>;
  timeOfDay: string;
  userEmotion?: string;
  topicCategory?: string;
}

export interface CapabilityResult {
  capability: string;
  result: any;
  confidence: number;
  executionTime: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export class IntelligentCapabilityOrchestrator {
  private capabilityThresholds = {
    image_generation: 0.7,
    gif_generation: 0.6,
    speech_generation: 0.8,
    web_search: 0.5,
    reasoning: 0.6,
    memory_enhancement: 0.4
  };

  constructor() {
    logger.info('Intelligent Capability Orchestrator initialized');
  }

  /**
   * Analyzes conversation context and determines which capabilities should be activated
   */
  async analyzeAndOrchestrate(context: ConversationContext): Promise<CapabilityRequest[]> {
    const capabilities: CapabilityRequest[] = [];

    try {
      // Image generation detection
      const imageRequest = await this.detectImageGenerationNeed(context);
      if (imageRequest) capabilities.push(imageRequest);

      // GIF generation detection
      const gifRequest = await this.detectGifGenerationNeed(context);
      if (gifRequest) capabilities.push(gifRequest);

      // Speech generation detection
      const speechRequest = await this.detectSpeechGenerationNeed(context);
      if (speechRequest) capabilities.push(speechRequest);

      // Web search detection
      const searchRequest = await this.detectWebSearchNeed(context);
      if (searchRequest) capabilities.push(searchRequest);

      // Advanced reasoning detection
      const reasoningRequest = await this.detectReasoningNeed(context);
      if (reasoningRequest) capabilities.push(reasoningRequest);

      // Memory enhancement detection
      const memoryRequest = await this.detectMemoryEnhancementNeed(context);
      if (memoryRequest) capabilities.push(memoryRequest);

      // Sort by priority and confidence
      capabilities.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      });

      logger.debug('Capability orchestration analysis complete', {
        userId: context.userId,
        capabilitiesDetected: capabilities.length,
        capabilities: capabilities.map(c => ({ type: c.type, confidence: c.confidence, priority: c.priority }))
      });

      return capabilities;
    } catch (error) {
      logger.error('Error in capability orchestration analysis', { error: String(error), userId: context.userId });
      return [];
    }
  }

  /**
   * Detects if user is requesting image generation naturally
   */
  private async detectImageGenerationNeed(context: ConversationContext): Promise<CapabilityRequest | null> {
    const { messageContent } = context;
    const lowerContent = messageContent.toLowerCase();

    // Visual creation keywords
    const imageKeywords = [
      'draw', 'create an image', 'picture of', 'show me', 'visualize', 'sketch',
      'paint', 'design', 'artwork', 'illustration', 'generate image', 'make picture',
      'can you draw', 'i want to see', 'what does', 'look like', 'imagine'
    ];

    // Scene description patterns
    const scenePatterns = [
      /a (beautiful|stunning|amazing|colorful|dark|bright).*scene/i,
      /picture of a.*in/i,
      /image showing/i,
      /what would.*look like/i,
      /can you show/i
    ];

    let confidence = 0;

    // Check for explicit image keywords
    for (const keyword of imageKeywords) {
      if (lowerContent.includes(keyword)) {
        confidence += 0.2;
      }
    }

    // Check for scene description patterns
    for (const pattern of scenePatterns) {
      if (pattern.test(messageContent)) {
        confidence += 0.3;
      }
    }

    // Check for creative/artistic context
    if (lowerContent.includes('art') || lowerContent.includes('creative') || lowerContent.includes('design')) {
      confidence += 0.2;
    }

    // Adjust based on conversation history
    if (context.conversationHistory.some(msg => msg.toLowerCase().includes('image') || msg.toLowerCase().includes('picture'))) {
      confidence += 0.1;
    }

    if (confidence >= this.capabilityThresholds.image_generation) {
      return {
        type: 'image_generation',
        confidence,
        context: `User appears to be requesting image generation: "${messageContent}"`,
        parameters: {
          prompt: this.extractImagePrompt(messageContent),
          style: this.inferImageStyle(context),
          size: '1024x1024'
        },
        priority: confidence > 0.8 ? 'high' : 'medium'
      };
    }

    return null;
  }

  /**
   * Detects if user wants GIF generation
   */
  private async detectGifGenerationNeed(context: ConversationContext): Promise<CapabilityRequest | null> {
    const { messageContent } = context;
    const lowerContent = messageContent.toLowerCase();

    const gifKeywords = [
      'gif', 'animated', 'reaction', 'meme', 'funny', 'animate',
      'moving picture', 'loop', 'dancing', 'celebration'
    ];

    const emotionalKeywords = [
      'excited', 'happy', 'sad', 'angry', 'surprised', 'confused',
      'celebrating', 'dancing', 'laughing', 'crying'
    ];

    let confidence = 0;

    for (const keyword of gifKeywords) {
      if (lowerContent.includes(keyword)) {
        confidence += 0.3;
      }
    }

    for (const keyword of emotionalKeywords) {
      if (lowerContent.includes(keyword)) {
        confidence += 0.2;
      }
    }

    // Check for reaction context
    if (lowerContent.includes('react') || lowerContent.includes('feel') || lowerContent.includes('emotion')) {
      confidence += 0.3;
    }

    if (confidence >= this.capabilityThresholds.gif_generation) {
      return {
        type: 'gif_generation',
        confidence,
        context: `User appears to want GIF generation: "${messageContent}"`,
        parameters: {
          emotion: this.extractEmotion(messageContent),
          style: 'reaction',
          duration: 3
        },
        priority: 'medium'
      };
    }

    return null;
  }

  /**
   * Detects if speech generation would enhance the response
   */
  private async detectSpeechGenerationNeed(context: ConversationContext): Promise<CapabilityRequest | null> {
    const { messageContent, userPreferences } = context;
    const lowerContent = messageContent.toLowerCase();

    // If user explicitly prefers audio responses
    if (userPreferences.preferAudio) {
      return {
        type: 'speech_generation',
        confidence: 0.9,
        context: 'User has preference for audio responses',
        parameters: {
          voice: userPreferences.preferredVoice || 'default',
          speed: 1.0,
          emotion: this.extractEmotion(messageContent) || 'neutral'
        },
        priority: 'high'
      };
    }

    const speechKeywords = [
      'read to me', 'say that', 'speak', 'voice', 'audio', 'listen',
      'tell me aloud', 'pronunciation', 'how to say'
    ];

    let confidence = 0;

    for (const keyword of speechKeywords) {
      if (lowerContent.includes(keyword)) {
        confidence += 0.4;
      }
    }

    // Check for educational content that benefits from audio
    if (lowerContent.includes('learn') || lowerContent.includes('teach') || lowerContent.includes('explain')) {
      confidence += 0.2;
    }

    // Check for long responses that might benefit from audio
    if (messageContent.length > 200) {
      confidence += 0.1;
    }

    if (confidence >= this.capabilityThresholds.speech_generation) {
      return {
        type: 'speech_generation',
        confidence,
        context: `Speech generation would enhance response for: "${messageContent}"`,
        parameters: {
          voice: 'default',
          speed: 1.0,
          emotion: this.extractEmotion(messageContent) || 'neutral'
        },
        priority: 'medium'
      };
    }

    return null;
  }

  /**
   * Detects if web search is needed for current information
   */
  private async detectWebSearchNeed(context: ConversationContext): Promise<CapabilityRequest | null> {
    const { messageContent } = context;
    const lowerContent = messageContent.toLowerCase();

    const searchKeywords = [
      'what is', 'who is', 'when did', 'where is', 'how to', 'latest',
      'recent', 'news', 'update', 'current', 'today', 'now', 'search'
    ];

    const timeKeywords = [
      'today', 'yesterday', 'this week', 'this month', 'recently',
      'latest', 'current', 'now', '2024', '2025'
    ];

    let confidence = 0;

    for (const keyword of searchKeywords) {
      if (lowerContent.includes(keyword)) {
        confidence += 0.2;
      }
    }

    for (const keyword of timeKeywords) {
      if (lowerContent.includes(keyword)) {
        confidence += 0.3;
      }
    }

    // Check for specific topics that often need current info
    const currentTopics = ['weather', 'stock', 'price', 'score', 'result', 'status'];
    for (const topic of currentTopics) {
      if (lowerContent.includes(topic)) {
        confidence += 0.4;
      }
    }

    if (confidence >= this.capabilityThresholds.web_search) {
      return {
        type: 'web_search',
        confidence,
        context: `Web search needed for current information: "${messageContent}"`,
        parameters: {
          query: this.extractSearchQuery(messageContent),
          maxResults: 5,
          timeframe: 'recent'
        },
        priority: 'medium'
      };
    }

    return null;
  }

  /**
   * Detects if advanced reasoning is needed
   */
  private async detectReasoningNeed(context: ConversationContext): Promise<CapabilityRequest | null> {
    const { messageContent } = context;
    const lowerContent = messageContent.toLowerCase();

    const reasoningKeywords = [
      'analyze', 'compare', 'evaluate', 'explain why', 'reasoning',
      'logic', 'think through', 'step by step', 'pros and cons',
      'advantages', 'disadvantages', 'problem solving'
    ];

    const complexityIndicators = [
      'complex', 'complicated', 'difficult', 'challenging', 'multiple factors',
      'various aspects', 'different perspectives', 'consider all'
    ];

    let confidence = 0;

    for (const keyword of reasoningKeywords) {
      if (lowerContent.includes(keyword)) {
        confidence += 0.3;
      }
    }

    for (const indicator of complexityIndicators) {
      if (lowerContent.includes(indicator)) {
        confidence += 0.2;
      }
    }

    // Check for question complexity
    const questionMarks = messageContent.split('?').length - 1;
    if (questionMarks > 1) {
      confidence += 0.2;
    }

    // Check message length as complexity indicator
    if (messageContent.length > 150) {
      confidence += 0.1;
    }

    if (confidence >= this.capabilityThresholds.reasoning) {
      return {
        type: 'reasoning',
        confidence,
        context: `Advanced reasoning needed for: "${messageContent}"`,
        parameters: {
          complexity: confidence > 0.8 ? 'high' : 'medium',
          steps: Math.ceil(confidence * 5),
          analysisType: this.determineAnalysisType(messageContent)
        },
        priority: confidence > 0.8 ? 'high' : 'medium'
      };
    }

    return null;
  }

  /**
   * Detects if memory enhancement would be beneficial
   */
  private async detectMemoryEnhancementNeed(context: ConversationContext): Promise<CapabilityRequest | null> {
    const { messageContent, conversationHistory } = context;
    const lowerContent = messageContent.toLowerCase();

    const memoryKeywords = [
      'remember', 'recall', 'forgot', 'mentioned before', 'told you',
      'my preference', 'i like', 'i hate', 'always', 'never'
    ];

    let confidence = 0;

    for (const keyword of memoryKeywords) {
      if (lowerContent.includes(keyword)) {
        confidence += 0.2;
      }
    }

    // Check if user is sharing personal information
    const personalIndicators = ['my', 'i am', 'i work', 'i live', 'i study', 'my job', 'my hobby'];
    for (const indicator of personalIndicators) {
      if (lowerContent.includes(indicator)) {
        confidence += 0.3;
      }
    }

    // Check conversation depth
    if (conversationHistory.length > 5) {
      confidence += 0.2;
    }

    // Always have some base memory enhancement for personalization
    confidence = Math.max(confidence, 0.3);

    if (confidence >= this.capabilityThresholds.memory_enhancement) {
      return {
        type: 'memory_enhancement',
        confidence,
        context: `Memory enhancement needed for personalization: "${messageContent}"`,
        parameters: {
          type: 'preference_learning',
          importance: confidence > 0.7 ? 'high' : 'medium',
          categories: this.extractMemoryCategories(messageContent)
        },
        priority: 'low'
      };
    }

    return null;
  }

  // Helper methods for extracting parameters
  private extractImagePrompt(message: string): string {
    // Remove command words and extract the core description
    const prompt = message
      .replace(/^(draw|create|make|show|generate).*?(image|picture|drawing)/i, '')
      .replace(/^(can you|please|i want)/i, '')
      .trim();
    return prompt || message;
  }

  private inferImageStyle(context: ConversationContext): string {
    const { messageContent, userPreferences } = context;
    
    if (userPreferences.imageStyle) return userPreferences.imageStyle;
    
    const styleKeywords = {
      'realistic': ['realistic', 'photo', 'photograph', 'real'],
      'artistic': ['artistic', 'art', 'painting', 'creative'],
      'cartoon': ['cartoon', 'animated', 'cute', 'fun'],
      'digital': ['digital', 'cyber', 'futuristic', 'tech']
    };

    for (const [style, keywords] of Object.entries(styleKeywords)) {
      if (keywords.some(keyword => messageContent.toLowerCase().includes(keyword))) {
        return style;
      }
    }

    return 'realistic';
  }

  private extractEmotion(message: string): string {
    const emotions = {
      'happy': ['happy', 'joy', 'excited', 'cheerful', 'pleased'],
      'sad': ['sad', 'disappointed', 'down', 'upset'],
      'angry': ['angry', 'mad', 'frustrated', 'annoyed'],
      'surprised': ['surprised', 'shocked', 'amazed', 'wow'],
      'confused': ['confused', 'puzzled', 'unclear', 'lost']
    };

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        return emotion;
      }
    }

    return 'neutral';
  }

  private extractSearchQuery(message: string): string {
    // Extract the main query from the message
    const query = message
      .replace(/^(what is|who is|when did|where is|how to|search for|find|look up)/i, '')
      .replace(/\?/g, '')
      .trim();
    return query || message;
  }

  private determineAnalysisType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('compare') || lowerMessage.includes('versus') || lowerMessage.includes('vs')) {
      return 'comparison';
    }
    if (lowerMessage.includes('pros and cons') || lowerMessage.includes('advantages')) {
      return 'pros_cons';
    }
    if (lowerMessage.includes('step by step') || lowerMessage.includes('process')) {
      return 'step_by_step';
    }
    if (lowerMessage.includes('why') || lowerMessage.includes('because') || lowerMessage.includes('reason')) {
      return 'causal';
    }
    
    return 'general';
  }

  private extractMemoryCategories(message: string): string[] {
    const categories = [];
    const lowerMessage = message.toLowerCase();

    const categoryMap = {
      'personal': ['i am', 'my name', 'i work', 'i live', 'my age'],
      'preferences': ['i like', 'i love', 'i hate', 'i prefer', 'my favorite'],
      'professional': ['my job', 'i work', 'my career', 'my company'],
      'hobbies': ['hobby', 'i enjoy', 'free time', 'weekend', 'fun'],
      'relationships': ['my friend', 'my family', 'my partner', 'my spouse']
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        categories.push(category);
      }
    }

    return categories.length > 0 ? categories : ['general'];
  }

  /**
   * Updates capability thresholds based on user feedback and success rates
   */
  async updateCapabilityThresholds(capability: string, success: boolean, userFeedback?: 'positive' | 'negative' | 'neutral'): Promise<void> {
    // Implement adaptive threshold learning here
    // For now, this is a placeholder for future enhancement
    logger.debug('Capability threshold update', { capability, success, userFeedback });
  }
}