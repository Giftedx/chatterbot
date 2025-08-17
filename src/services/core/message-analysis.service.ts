/**
 * Unified Message Analysis Service
 * 
 * Consolidates message analysis capabilities from both intelligence and enhanced-intelligence modules.
 * Provides comprehensive analysis for all intelligence tiers with consistent interfaces.
 */

import { Message, Attachment } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { advancedIntentDetectionService } from '../advanced-intent-detection.service.js';
import type { IntentClassification } from '../advanced-intent-detection.service.js';
import type { UserCapabilities } from '../intelligence/permission.service.js';

function sanitizeUserInput(raw: string): string {
  const injectionPatterns = [
    /ignore\s+previous/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /developer\s*:/gi,
    /###/g,
  ];
  let text = raw.slice(0, 2000);
  for (const pat of injectionPatterns) text = text.replace(pat, '[FILTERED]');
  return text;
}

export interface AttachmentAnalysis {
  type: 'image' | 'audio' | 'document' | 'video' | 'unknown';
  analysisNeeded: boolean;
  suggestedService: string;
  processingPriority: 'high' | 'medium' | 'low';
}

export interface AttachmentInfo {
  name: string;
  url: string;
  contentType?: string;
}

export interface UnifiedMessageAnalysis {
  // Core analysis (compatible with both systems)
  hasAttachments: boolean;
  hasUrls: boolean;
  attachmentTypes: string[];
  urls: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  intents: string[];
  requiredTools: string[];
  
  // Enhanced analysis capabilities
  needsPersonaSwitch: boolean;
  suggestedPersona?: string;
  needsAdminFeatures: boolean;
  adminCommands: string[];
  needsMultimodal: boolean;
  attachmentAnalysis: AttachmentAnalysis[];
  needsConversationManagement: boolean;
  conversationActions: string[];
  needsMemoryOperation: boolean;
  memoryActions: string[];
  needsMCPTools: boolean;
  mcpRequirements: string[];
  
  // AI Model Routing Intelligence
  preferredProvider?: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'mistral' | 'openai_compat';
  reasoningLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  contextRequirement: 'short' | 'medium' | 'long' | 'extra-long';
  responseSpeed: 'fast' | 'balanced' | 'thorough';
  modelCapabilities: {
    needsCoding: boolean;
    needsReasoning: boolean;
    needsCreativity: boolean;
    needsFactuality: boolean;
    needsMultimodal: boolean;
    needsTools: boolean;
  };
  
  // Intelligence Service Routing
  intelligenceServices: {
    coreIntelligence: boolean;
    agenticIntelligence: boolean;
    enhancedIntelligence: boolean;
    advancedCapabilities: boolean;
    mcpIntegration: boolean;
  };
  
  // Analysis metadata
  confidence: number;
  processingRecommendations: string[];
  
  // Additional analysis properties
  sentiment?: string;
  language?: string;
  topics?: string[];
  mentions?: string[];
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  userExpertise: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

/**
 * Unified Message Analysis Service
 * Replaces both IntelligenceAnalysisService and EnhancedMessageAnalysisService
 */
export class UnifiedMessageAnalysisService {
  
  /**
   * Comprehensive message analysis for all intelligence tiers
   */
  public async analyzeMessage(
    message: Message | string, 
    attachments: Attachment[] | AttachmentInfo[] = [],
    userCapabilities?: UserCapabilities
  ): Promise<UnifiedMessageAnalysis> {
    
    const rawContent = typeof message === 'string' ? message : message.content;
    const content = sanitizeUserInput(rawContent);
    const messageAttachments = Array.isArray(attachments) 
      ? attachments 
      : Array.from((message as Message).attachments?.values() || []);
    
    const analysis: UnifiedMessageAnalysis = {
      // Core analysis
      hasAttachments: messageAttachments.length > 0,
      hasUrls: false,
      attachmentTypes: [],
      urls: [],
      complexity: 'simple',
      intents: [],
      requiredTools: ['memory'], // Always include memory
      
      // Enhanced analysis
      needsPersonaSwitch: false,
      needsAdminFeatures: false,
      adminCommands: [],
      needsMultimodal: false,
      attachmentAnalysis: [],
      needsConversationManagement: false,
      conversationActions: [],
      needsMemoryOperation: false,
      memoryActions: [],
      needsMCPTools: false,
      mcpRequirements: [],
      
      // AI Model Routing Intelligence
      reasoningLevel: 'basic',
      contextRequirement: 'short',
      responseSpeed: 'balanced',
      modelCapabilities: {
        needsCoding: false,
        needsReasoning: false,
        needsCreativity: false,
        needsFactuality: false,
        needsMultimodal: false,
        needsTools: false,
      },
      
      // Intelligence Service Routing
      intelligenceServices: {
        coreIntelligence: true,
        agenticIntelligence: false,
        enhancedIntelligence: false,
        advancedCapabilities: false,
        mcpIntegration: false,
      },
      
      // Metadata
      confidence: 0.8,
      processingRecommendations: [],
      urgency: 'normal',
      userExpertise: 'intermediate'
    };

    try {
      // Extract URLs and basic content analysis
      analysis.urls = this.extractUrls(content);
      analysis.hasUrls = analysis.urls.length > 0;
      
      // Analyze attachments
      if (messageAttachments.length > 0) {
        analysis.attachmentTypes = messageAttachments.map(att => this.getAttachmentType(att));
        analysis.attachmentAnalysis = this.analyzeAttachments(messageAttachments, content);
        analysis.needsMultimodal = userCapabilities?.hasMultimodal ?? true;
      }
      
      // Detect intents and complexity (enhanced with advanced classification)
      const intentResult = await this.detectIntents(content, {
        hasAttachments: analysis.hasAttachments,
        attachmentTypes: analysis.attachmentTypes,
        hasUrls: analysis.hasUrls
      });
      
      analysis.intents = intentResult.intents;
      
      // Use advanced classification to enhance analysis
      const { intentClassification } = intentResult;
      
      // Update analysis with advanced classification insights
      analysis.complexity = this.mapComplexityFromClassification(intentClassification.complexity, analysis);
      analysis.urgency = intentClassification.urgency;
      
      // Update user expertise based on classification
      if (intentClassification.complexity === 'expert') {
        analysis.userExpertise = 'expert';
      } else if (intentClassification.complexity === 'complex') {
        analysis.userExpertise = 'advanced';
      } else if (intentClassification.complexity === 'moderate') {
        analysis.userExpertise = 'intermediate';
      } else {
        analysis.userExpertise = 'beginner';
      }
      
      // Map to required tools
      analysis.requiredTools = this.mapIntentsToTools(analysis.intents, analysis.attachmentTypes, analysis.urls);
      
      // Enhanced analysis (if capabilities provided)
      if (userCapabilities) {
        this.performEnhancedAnalysis(content, analysis, userCapabilities);
      }
      
      // Perform AI routing intelligence analysis
      this.analyzeModelCapabilities(content, analysis);
      this.analyzeReasoningLevel(content, analysis);
      this.analyzeContextRequirement(content, analysis);
      this.analyzeResponseSpeed(content, analysis);
      this.analyzeIntelligenceServices(content, analysis);
      this.analyzeUrgencyAndExpertise(content, analysis);
      
      // Generate processing recommendations
      analysis.processingRecommendations = this.generateProcessingRecommendations(analysis);
      
      logger.debug('Unified message analysis complete', {
        operation: 'unified-message-analysis',
        metadata: {
          complexity: analysis.complexity,
          intents: analysis.intents,
          toolsRequired: analysis.requiredTools.length,
          hasAdvancedFeatures: analysis.needsMCPTools
        }
      });

      return analysis;

    } catch (error) {
      logger.error('Message analysis failed', {
        operation: 'unified-message-analysis',
        metadata: { error: String(error) }
      });

      // Return safe default analysis
      return analysis;
    }
  }

  /**
   * Extract URLs from content
   */
  private extractUrls(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.match(urlRegex) || [];
  }

  /**
   * Determine attachment type
   */
  private getAttachmentType(attachment: Attachment | AttachmentInfo): string {
    // Both interfaces should have 'name', but handle both cases safely
    const name = attachment.name;
    const contentType = 'contentType' in attachment 
      ? attachment.contentType 
      : (attachment as unknown as { contentType?: string }).contentType;
    
    const ext = name?.split('.').pop()?.toLowerCase();
    const type = contentType?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '') || type.startsWith('image/')) return 'image';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '') || type.startsWith('audio/')) return 'audio';
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '') || type.includes('document') || type.includes('text')) return 'document';
    if (type.startsWith('video/')) return 'video';
    
    return 'unknown';
  }

  /**
   * Analyze attachments for processing requirements
   */
  private analyzeAttachments(attachments: (Attachment | AttachmentInfo)[], content: string): AttachmentAnalysis[] {
    return attachments.map(attachment => {
      const type = this.getAttachmentType(attachment) as AttachmentAnalysis['type'];
      return {
        type,
        analysisNeeded: true,
        suggestedService: this.suggestAnalysisService(type),
        processingPriority: content.includes('analyze') || content.includes('detailed') ? 'high' : 'medium'
      };
    });
  }

  /**
   * Suggest analysis service for attachment type
   */
  private suggestAnalysisService(type: string): string {
    switch (type) {
      case 'image': return 'imageAnalysis';
      case 'audio': return 'audioAnalysis';
      case 'document': return 'documentProcessing';
      case 'video': return 'multimodal';
      default: return 'fileIntelligence';
    }
  }

  /**
   * Detect user intents from content
   */
  /**
   * Advanced intent detection using machine learning style classification
   */
  private async detectIntents(
    content: string, 
    context?: {
      hasAttachments?: boolean;
      attachmentTypes?: string[];
      hasUrls?: boolean;
    }
  ): Promise<{ intents: string[], intentClassification: IntentClassification }> {
    try {
      // Use advanced intent detection service
      const classification = await advancedIntentDetectionService.classifyIntent(content, context);
      
      // Map intent classification to legacy intent format
      const intents = [classification.primary, ...classification.secondary];
      
      logger.debug('Advanced intent detection completed', {
        operation: 'intent-detection',
        metadata: {
          primary: classification.primary,
          confidence: classification.confidence,
          category: classification.category,
          complexity: classification.complexity,
          urgency: classification.urgency
        }
      });
      
      return {
        intents,
        intentClassification: classification
      };
      
    } catch (error) {
      logger.error('Advanced intent detection failed, falling back to basic detection', {
        operation: 'intent-detection-fallback',
        metadata: { error: String(error) }
      });
      
      // Fallback to basic intent detection
      const basicIntents = this.detectBasicIntents(content);
      const fallbackClassification: IntentClassification = {
        primary: basicIntents[0] || 'general',
        secondary: basicIntents.slice(1),
        confidence: 0.6,
        category: 'informational',
        reasoning: ['Fallback classification due to advanced detection failure'],
        urgency: 'normal',
        complexity: 'moderate'
      };
      
      return {
        intents: basicIntents,
        intentClassification: fallbackClassification
      };
    }
  }
  
  /**
   * Basic intent detection (fallback method)
   */
  private detectBasicIntents(content: string): string[] {
    const intents = [];
    const lower = content.toLowerCase();
    
    // Search intents
    if (lower.includes('search') || lower.includes('find') || lower.includes('look up')) {
      intents.push('search');
    }
    
    // Analysis intents
    if (lower.includes('analyze') || lower.includes('explain') || lower.includes('understand')) {
      intents.push('analysis');
    }
    
    // Memory intents
    if (lower.includes('remember') || lower.includes('recall') || lower.includes('mentioned')) {
      intents.push('memory');
    }
    
    // Comparison intents
    if (lower.includes('compare') || lower.includes('difference') || lower.includes('vs')) {
      intents.push('comparison');
    }
    
    // Problem-solving intents
    if (lower.includes('solve') || lower.includes('calculate') || lower.includes('problem')) {
      intents.push('problem-solving');
    }
    
    // Conversation management
    if (lower.includes('summary') || lower.includes('summarize') || lower.includes('thread')) {
      intents.push('conversation-management');
    }

    // Media generation intents
    if (/(draw|make|generate).*(image|picture|logo|icon|poster|art)/.test(lower) || lower.includes('image of ')) {
      intents.push('image-generation');
    }
    if (lower.includes('gif') || lower.includes('reaction gif')) {
      intents.push('gif-search');
    }
    if (lower.includes('tts') || lower.includes('text to speech') || /\b(say|speak|read) this\b/.test(lower)) {
      intents.push('text-to-speech');
    }
    
    return intents.length > 0 ? intents : ['general'];
  }

  /**
   * Map advanced intent classification complexity to legacy complexity levels
   */
  private mapComplexityFromClassification(
    classificationComplexity: 'simple' | 'moderate' | 'complex' | 'expert', 
    analysis: Partial<UnifiedMessageAnalysis>
  ): UnifiedMessageAnalysis['complexity'] {
    // Start with classification complexity
    let mappedComplexity: UnifiedMessageAnalysis['complexity'];
    
    switch (classificationComplexity) {
      case 'expert':
        mappedComplexity = 'advanced';
        break;
      case 'complex':
        mappedComplexity = 'complex';
        break;
      case 'moderate':
        mappedComplexity = 'moderate';
        break;
      case 'simple':
      default:
        mappedComplexity = 'simple';
        break;
    }
    
    // Apply additional complexity factors from legacy analysis
    const additionalFactors = [
      (analysis.attachmentTypes?.length || 0) > 1,
      analysis.hasUrls,
      (analysis.intents?.length || 0) > 2,
      analysis.intents?.some(intent => ['comparison', 'problem-solving', 'analysis'].includes(intent))
    ].filter(Boolean).length;
    
    // Upgrade complexity if additional factors suggest higher complexity
    if (additionalFactors >= 3 && mappedComplexity !== 'advanced') {
      if (mappedComplexity === 'complex') mappedComplexity = 'advanced';
      else if (mappedComplexity === 'moderate') mappedComplexity = 'complex';
      else if (mappedComplexity === 'simple') mappedComplexity = 'moderate';
    }
    
    return mappedComplexity;
  }

  /**
   * Calculate complexity based on multiple factors
   */
  private calculateComplexity(content: string, analysis: Partial<UnifiedMessageAnalysis>): UnifiedMessageAnalysis['complexity'] {
    const complexityIndicators = [
      // Content-based indicators
      this.containsComplexKeywords(content),
      content.length > 500,
      
      // Attachment indicators
      (analysis.attachmentTypes?.length || 0) > 1,
      analysis.hasUrls,
      
      // Intent indicators
      (analysis.intents?.length || 0) > 2,
      analysis.intents?.some(intent => ['comparison', 'problem-solving'].includes(intent))
    ].filter(Boolean).length;

    if (complexityIndicators >= 4) return 'advanced';
    if (complexityIndicators >= 3) return 'complex';
    if (complexityIndicators >= 1) return 'moderate';
    return 'simple';
  }

  /**
   * Check for complex processing keywords
   */
  private containsComplexKeywords(content: string): boolean {
    const complexKeywords = [
      'analyze', 'compare', 'research', 'explain', 'calculate', 'solve',
      'pros and cons', 'advantages', 'disadvantages', 'step by step',
      'how to', 'what if', 'why', 'because', 'therefore', 'however'
    ];
    return complexKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Map intents to required processing tools
   */
  private mapIntentsToTools(intents: string[], attachmentTypes: string[], urls: string[]): string[] {
    const tools = new Set<string>(['memory']); // Always include memory
    
    // Intent-based tools
    if (intents.includes('search')) tools.add('web-search');
    if (intents.includes('analysis') || intents.includes('comparison')) tools.add('complex-reasoning');
    if (intents.includes('problem-solving')) tools.add('complex-reasoning');
    if (intents.includes('conversation-management')) tools.add('conversation-thread');

    // Media tools
    if (intents.includes('image-generation')) tools.add('image-generation');
    if (intents.includes('gif-search')) tools.add('gif-search');
    if (intents.includes('text-to-speech')) tools.add('text-to-speech');
    
    // Content-based tools
    if (attachmentTypes.length > 0) tools.add('multimodal');
    if (urls.length > 0) tools.add('url-processing');
    
    // Advanced tools for complex scenarios
    if (intents.includes('search') && intents.includes('analysis')) {
      tools.add('browser-automation');
    }
    
    return Array.from(tools);
  }

  /**
   * Perform enhanced analysis for advanced capabilities
   */
  private performEnhancedAnalysis(
    content: string, 
    analysis: UnifiedMessageAnalysis, 
    capabilities: UserCapabilities
  ): void {
    const lower = content.toLowerCase();
    
    // Persona analysis
    analysis.needsPersonaSwitch = this.analyzePersonaNeeds(lower);
    if (analysis.needsPersonaSwitch) {
      analysis.suggestedPersona = this.suggestPersona(lower);
    }
    
    // Admin features (permission-gated)
    if (capabilities.hasAnalytics || capabilities.hasAdminCommands) {
      const adminAnalysis = this.analyzeAdminNeeds(lower, capabilities);
      analysis.needsAdminFeatures = adminAnalysis.needed;
      analysis.adminCommands = adminAnalysis.commands;
    }
    
    // Conversation management
    analysis.needsConversationManagement = this.analyzeConversationNeeds(lower);
    if (analysis.needsConversationManagement) {
      analysis.conversationActions = this.identifyConversationActions(lower);
    }
    
    // Memory operations
    const memoryAnalysis = this.analyzeMemoryNeeds(lower);
    analysis.needsMemoryOperation = memoryAnalysis.needed;
    analysis.memoryActions = memoryAnalysis.actions;
    
    // MCP tool requirements (permission-gated)
    if (capabilities.hasAdvancedAI) {
      const mcpAnalysis = this.analyzeMCPNeeds(lower);
      analysis.needsMCPTools = mcpAnalysis.needed;
      analysis.mcpRequirements = mcpAnalysis.requirements;
    }
  }

  /**
   * Analyze persona switching needs
   */
  private analyzePersonaNeeds(content: string): boolean {
    const personaKeywords = [
      'technical', 'code', 'programming', 'api', 'development',
      'professional', 'business', 'formal', 'enterprise',
      'funny', 'joke', 'sarcastic', 'humor', 'comedy'
    ];
    return personaKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * Suggest appropriate persona
   */
  private suggestPersona(content: string): string {
    if (content.includes('technical') || content.includes('code') || content.includes('programming')) {
      return 'technical';
    } else if (content.includes('professional') || content.includes('business')) {
      return 'professional';
    } else if (content.includes('funny') || content.includes('humor')) {
      return 'sarcastic';
    }
    return 'friendly';
  }

  /**
   * Analyze admin feature requirements
   */
  private analyzeAdminNeeds(content: string, capabilities: UserCapabilities): { needed: boolean; commands: string[] } {
    const commands: string[] = [];

    if (capabilities.hasAnalytics && (content.includes('stats') || content.includes('analytics'))) {
      commands.push('stats');
    }
    if (capabilities.hasAdminCommands && content.includes('persona')) {
      commands.push('persona');
    }

    return { needed: commands.length > 0, commands };
  }

  /**
   * Analyze conversation management needs
   */
  private analyzeConversationNeeds(content: string): boolean {
    const conversationKeywords = ['summary', 'summarize', 'thread', 'topic', 'context'];
    return conversationKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * Identify conversation actions
   */
  private identifyConversationActions(content: string): string[] {
    const actions: string[] = [];
    if (content.includes('summary') || content.includes('summarize')) actions.push('summary');
    if (content.includes('thread') || content.includes('topic')) actions.push('thread');
    return actions;
  }

  /**
   * Analyze memory operation needs
   */
  private analyzeMemoryNeeds(content: string): { needed: boolean; actions: string[] } {
    const actions: string[] = [];

    if (content.includes('remember') || content.includes('forget') || content.includes('preferences')) {
      actions.push('update');
    }
    if (content.includes('what do you know about me') || content.includes('my information')) {
      actions.push('recall');
    }

    return { needed: actions.length > 0, actions };
  }

  /**
   * Analyze MCP tool requirements
   */
  private analyzeMCPNeeds(content: string): { needed: boolean; requirements: string[] } {
    const requirements: string[] = [];

    if (content.includes('search') || content.includes('look up') || content.includes('find information')) {
      requirements.push('webSearch');
    }
    if (content.includes('scrape') || content.includes('website') || content.includes('webpage')) {
      requirements.push('firecrawl');
    }
    if (content.includes('osrs') || content.includes('old school runescape')) {
      requirements.push('osrsData');
    }

    return { needed: requirements.length > 0, requirements };
  }

  /**
   * Analyze model capabilities needed for the request
   */
  private analyzeModelCapabilities(content: string, analysis: UnifiedMessageAnalysis): void {
    const lower = content.toLowerCase();
    
    // Coding capability detection
    analysis.modelCapabilities.needsCoding = /\b(code|program|function|class|api|debug|error|exception|typescript|javascript|python|java|css|html|sql)\b/.test(lower) 
      || /```/.test(content)
      || analysis.intents.includes('problem-solving') && lower.includes('programming');
    
    // Reasoning capability detection
    analysis.modelCapabilities.needsReasoning = /\b(analyze|compare|explain|why|because|reason|logic|think|understand|complex|detailed|elaborate)\b/.test(lower)
      || analysis.complexity === 'complex' || analysis.complexity === 'advanced'
      || analysis.intents.includes('analysis') || analysis.intents.includes('comparison');
    
    // Creativity capability detection
    analysis.modelCapabilities.needsCreativity = /\b(create|generate|write|story|poem|creative|imagine|brainstorm|original|artistic|design)\b/.test(lower)
      || analysis.intents.includes('image-generation');
    
    // Factuality capability detection
    analysis.modelCapabilities.needsFactuality = /\b(fact|facts|accurate|precise|research|study|statistics|data|evidence|truth|correct|verify)\b/.test(lower)
      || analysis.hasUrls && analysis.intents.includes('analysis');
    
    // Multimodal capability detection
    analysis.modelCapabilities.needsMultimodal = analysis.hasAttachments 
      || analysis.attachmentTypes.includes('image') 
      || analysis.attachmentTypes.includes('audio')
      || analysis.intents.includes('image-generation');
    
    // Tools capability detection
    analysis.modelCapabilities.needsTools = analysis.requiredTools.length > 1
      || analysis.needsMCPTools
      || analysis.intents.some(intent => ['search', 'analysis', 'problem-solving'].includes(intent));
  }

  /**
   * Analyze reasoning complexity level needed
   */
  private analyzeReasoningLevel(content: string, analysis: UnifiedMessageAnalysis): void {
    const lower = content.toLowerCase();
    let score = 0;
    
    // Basic reasoning indicators
    if (/\b(what|how|when|where)\b/.test(lower)) score += 1;
    
    // Intermediate reasoning indicators
    if (/\b(why|because|explain|compare|difference)\b/.test(lower)) score += 2;
    if (analysis.intents.includes('analysis') || analysis.intents.includes('comparison')) score += 2;
    
    // Advanced reasoning indicators
    if (/\b(complex|detailed|elaborate|comprehensive|thorough|in-depth)\b/.test(lower)) score += 3;
    if (analysis.complexity === 'complex') score += 2;
    
    // Expert reasoning indicators
    if (/\b(research|academic|scientific|technical|professional|expert|advanced)\b/.test(lower)) score += 4;
    if (analysis.complexity === 'advanced') score += 3;
    if (analysis.modelCapabilities.needsCoding && analysis.modelCapabilities.needsReasoning) score += 2;
    
    if (score >= 8) analysis.reasoningLevel = 'expert';
    else if (score >= 5) analysis.reasoningLevel = 'advanced';
    else if (score >= 3) analysis.reasoningLevel = 'intermediate';
    else analysis.reasoningLevel = 'basic';
  }

  /**
   * Analyze context window requirements
   */
  private analyzeContextRequirement(content: string, analysis: UnifiedMessageAnalysis): void {
    let score = 0;
    
    // Content length indicators
    if (content.length > 500) score += 1;
    if (content.length > 1500) score += 2;
    if (content.length > 3000) score += 3;
    
    // Attachment indicators
    score += analysis.attachmentTypes.length;
    
    // URL indicators
    score += Math.min(analysis.urls.length, 3);
    
    // Intent indicators
    if (analysis.intents.includes('analysis') || analysis.intents.includes('comparison')) score += 2;
    if (analysis.intents.includes('conversation-management')) score += 3;
    
    // Complexity indicators
    if (analysis.complexity === 'complex') score += 2;
    if (analysis.complexity === 'advanced') score += 4;
    
    if (score >= 10) analysis.contextRequirement = 'extra-long';
    else if (score >= 6) analysis.contextRequirement = 'long';
    else if (score >= 3) analysis.contextRequirement = 'medium';
    else analysis.contextRequirement = 'short';
  }

  /**
   * Analyze response speed preference
   */
  private analyzeResponseSpeed(content: string, analysis: UnifiedMessageAnalysis): void {
    const lower = content.toLowerCase();
    
    // Fast response indicators
    if (/\b(quick|fast|urgent|now|asap|immediately|hurry)\b/.test(lower)) {
      analysis.responseSpeed = 'fast';
      return;
    }
    
    // Thorough response indicators  
    if (/\b(detailed|comprehensive|thorough|complete|elaborate|in-depth|analyze|research)\b/.test(lower)) {
      analysis.responseSpeed = 'thorough';
      return;
    }
    
    // Complex requests default to thorough
    if (analysis.complexity === 'advanced' || analysis.reasoningLevel === 'expert') {
      analysis.responseSpeed = 'thorough';
      return;
    }
    
    // Simple requests default to fast
    if (analysis.complexity === 'simple' && analysis.reasoningLevel === 'basic') {
      analysis.responseSpeed = 'fast';
      return;
    }
    
    // Default balanced
    analysis.responseSpeed = 'balanced';
  }

  /**
   * Analyze which intelligence services should be activated
   */
  private analyzeIntelligenceServices(content: string, analysis: UnifiedMessageAnalysis): void {
    // Core intelligence is always active
    analysis.intelligenceServices.coreIntelligence = true;
    
    // Agentic intelligence for complex reasoning and problem-solving
    analysis.intelligenceServices.agenticIntelligence = 
      analysis.reasoningLevel === 'advanced' || analysis.reasoningLevel === 'expert'
      || analysis.modelCapabilities.needsReasoning && analysis.modelCapabilities.needsTools
      || analysis.intents.includes('problem-solving')
      || analysis.complexity === 'advanced';
    
    // Enhanced intelligence for personalization and advanced features
    analysis.intelligenceServices.enhancedIntelligence = 
      analysis.needsPersonaSwitch
      || analysis.needsConversationManagement 
      || analysis.needsMemoryOperation
      || analysis.responseSpeed === 'thorough'
      || analysis.contextRequirement === 'long' || analysis.contextRequirement === 'extra-long';
    
    // Advanced capabilities for specialized tools and features
    analysis.intelligenceServices.advancedCapabilities = 
      analysis.modelCapabilities.needsMultimodal && analysis.hasAttachments
      || analysis.intents.includes('image-generation')
      || analysis.intents.includes('text-to-speech')
      || analysis.requiredTools.length > 3;
    
    // MCP integration for external tool requirements
    analysis.intelligenceServices.mcpIntegration = 
      analysis.needsMCPTools
      || analysis.intents.includes('search')
      || analysis.hasUrls && analysis.intents.includes('analysis');
  }

  /**
   * Analyze urgency and user expertise level
   */
  private analyzeUrgencyAndExpertise(content: string, analysis: UnifiedMessageAnalysis): void {
    const lower = content.toLowerCase();
    
    // Urgency analysis
    if (/\b(emergency|urgent|critical|asap|now|immediately|help me)\b/.test(lower)) {
      analysis.urgency = 'urgent';
    } else if (/\b(soon|quickly|fast|hurry|priority)\b/.test(lower)) {
      analysis.urgency = 'high';
    } else if (/\b(whenever|no rush|take your time|later)\b/.test(lower)) {
      analysis.urgency = 'low';
    } else {
      analysis.urgency = 'normal';
    }
    
    // User expertise analysis
    if (/\b(beginner|new|learning|don't know|simple|basic|explain like|eli5)\b/.test(lower)) {
      analysis.userExpertise = 'beginner';
    } else if (/\b(advanced|expert|professional|detailed|technical|complex|in-depth)\b/.test(lower)) {
      analysis.userExpertise = 'expert';
    } else if (/\b(intermediate|some experience|familiar|understand)\b/.test(lower) || analysis.modelCapabilities.needsCoding) {
      analysis.userExpertise = 'advanced';
    } else {
      analysis.userExpertise = 'intermediate';
    }
  }

  /**
   * Generate processing recommendations based on analysis
   */
  private generateProcessingRecommendations(analysis: UnifiedMessageAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.complexity === 'advanced') {
      recommendations.push('Use parallel processing for multiple tools');
    }
    if (analysis.hasAttachments && analysis.hasUrls) {
      recommendations.push('Process attachments and URLs concurrently');
    }
    if (analysis.needsMCPTools && analysis.mcpRequirements.length > 2) {
      recommendations.push('Implement progressive tool execution with fallbacks');
    }
    if (analysis.confidence < 0.7) {
      recommendations.push('Request clarification from user');
    }

    return recommendations;
  }

  /**
   * Optimize search query with context
   */
  public optimizeSearchQuery(query: string, context: { results: Map<string, unknown> }): string {
    let optimized = query;
    
    const memoryResult = context.results.get('memory') as { success: boolean; data?: unknown } | undefined;
    if (memoryResult?.success && memoryResult.data && 
        typeof memoryResult.data === 'object' && 
        'userPreferences' in memoryResult.data) {
      // Add user context to search
      const data = memoryResult.data as { userPreferences: unknown };
      optimized += ` context:${JSON.stringify(data.userPreferences)}`;
    }
    
    return optimized;
  }
}

// Legacy convenience path: default singleton instance
export const unifiedMessageAnalysisService = new UnifiedMessageAnalysisService();
