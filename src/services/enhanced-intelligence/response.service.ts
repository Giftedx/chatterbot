/**
 * Enhanced Response Generation Service
 * Handles AI response generation with enhanced context and tool integration
 */

import { GeminiService } from '../gemini.service.js';
import { getHistory } from '../context-manager.js';
import { getActivePersona } from '../persona-manager.js';
import { ProcessingContext, PersonaInfo, MCPToolResult } from './types.js';

export class EnhancedResponseService {
  
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * Generate enhanced response incorporating all tool results
   */
  async generateEnhancedResponse(originalPrompt: string, context: ProcessingContext): Promise<string> {
    try {
      // Call Gemini with only the user's message
      let response = await this.geminiService.generateResponse(
        originalPrompt, // Only the user's message
        [], // No history
        context.userId,
        context.guildId || 'default'
      );
      console.log('Raw Gemini API response (user message only):', response);
      if (!response || typeof response !== 'string' || response.trim() === '') {
        response = "Sorry, I couldn't generate a response. Please try again later.";
      }
      return response;
    } catch (error) {
      console.error('Enhanced response generation failed:', error);
      return 'I encountered an issue processing your request, but I\'m here to help! Could you try rephrasing your question?';
    }
  }

  /**
   * Construct enhanced prompt incorporating all tool results
   */
  private constructEnhancedPrompt(
    originalPrompt: string, 
    context: ProcessingContext, 
    persona: PersonaInfo
  ): string {
    let enhancedPrompt = `${persona?.systemPrompt || ''}\n\n`;
    
    // Add memory context
    const memoryResult = context.results.get('memory') as MCPToolResult | undefined;
    if (memoryResult?.success) {
      enhancedPrompt += `MEMORY CONTEXT:\n${JSON.stringify(memoryResult.data, null, 2)}\n\n`;
    }
    
    // Add multimodal analysis
    const multimodalResult = context.results.get('multimodal') as MCPToolResult | undefined;
    if (multimodalResult?.success) {
      enhancedPrompt += `MULTIMODAL ANALYSIS:\n${JSON.stringify(multimodalResult.data, null, 2)}\n\n`;
    }
    
    // Add web intelligence
    const webResult = context.results.get('web-search') as MCPToolResult | undefined;
    if (webResult?.success) {
      enhancedPrompt += `WEB RESEARCH:\n${JSON.stringify(webResult.data, null, 2)}\n\n`;
    }
    
    // Add URL content
    const urlResult = context.results.get('url-processing') as MCPToolResult | undefined;
    if (urlResult?.success) {
      enhancedPrompt += `URL CONTENT:\n${JSON.stringify(urlResult.data, null, 2)}\n\n`;
    }
    
    // Add reasoning results
    const reasoningResult = context.results.get('complex-reasoning') as MCPToolResult | undefined;
    if (reasoningResult?.success) {
      enhancedPrompt += `REASONING ANALYSIS:\n${JSON.stringify(reasoningResult.data, null, 2)}\n\n`;
    }
    
    // Add browser automation results
    const automationResult = context.results.get('browser-automation') as MCPToolResult | undefined;
    if (automationResult?.success) {
      enhancedPrompt += `AUTOMATION RESULTS:\n${JSON.stringify(automationResult.data, null, 2)}\n\n`;
    }
    
    // Add any processing errors as context
    if (context.errors.length > 0) {
      enhancedPrompt += `PROCESSING NOTES:\n${context.errors.join('\n')}\n\n`;
    }
    
    enhancedPrompt += `USER REQUEST: ${originalPrompt}`;
    
    return enhancedPrompt;
  }

  /**
   * Generate regenerated response with enhanced capabilities
   */
  async generateRegeneratedResponse(
    userId: string, 
    channelId: string, 
    guildId: string | null,
    enhancedPrompt: string
  ): Promise<string> {
    try {
      // Get conversation history
      const history = await getHistory(channelId);
      
      // Generate new response
      const response = await this.geminiService.generateResponse(
        enhancedPrompt,
        history,
        userId,
        guildId || 'default'
      );
      
      return response;
    } catch (error) {
      console.error('Enhanced regeneration failed:', error);
      return 'Failed to regenerate response. Please try your request again.';
    }
  }

  /**
   * Generate explanation of processing steps
   */
  generateProcessingExplanation(toolsUsed: string[], complexity: string): string {
    let explanation = '🔍 **How I processed your request:**\n\n';
    
    if (toolsUsed.includes('memory')) {
      explanation += '🧠 **Memory Search**: I searched through our conversation history and your preferences\n';
    }
    if (toolsUsed.includes('multimodal')) {
      explanation += '🖼️ **Multimodal Analysis**: I analyzed your images, audio, or documents\n';
    }
    if (toolsUsed.includes('web-search')) {
      explanation += '🌐 **Web Research**: I searched current information online\n';
    }
    if (toolsUsed.includes('url-processing')) {
      explanation += '🔗 **URL Processing**: I extracted and analyzed content from your links\n';
    }
    if (toolsUsed.includes('complex-reasoning')) {
      explanation += '🤔 **Complex Reasoning**: I used step-by-step logical analysis\n';
    }
    if (toolsUsed.includes('browser-automation')) {
      explanation += '🤖 **Browser Automation**: I performed automated web interactions\n';
    }

    explanation += `\n**Complexity Level**: ${complexity}\n`;
    explanation += `**Processing Tools**: ${toolsUsed.length} tools used\n`;
    
    return explanation;
  }
}
