/**
 * Smart Context Orchestrator Service Test
 * Tests the advanced context building and orchestration capabilities
 */

import { SmartContextOrchestratorService } from '../smart-context-orchestrator.service.js';
import { MCPManager } from '../../mcp-manager.service.js';
import { PersonalizationEngine } from '../personalization-engine.service.js';
import { DirectMCPExecutor } from '../direct-mcp-executor.service.js';
import { UnifiedMessageAnalysis } from '../../core/message-analysis.service.js';
import { UserCapabilities } from '../../intelligence/permission.service.js';

// Mock dependencies
jest.mock('../../mcp-manager.service.js');
jest.mock('../personalization-engine.service.js');
jest.mock('../direct-mcp-executor.service.js');

describe('SmartContextOrchestratorService', () => {
  let orchestrator: SmartContextOrchestratorService;
  let mockMCPManager: jest.Mocked<MCPManager>;
  let mockPersonalizationEngine: jest.Mocked<PersonalizationEngine>;
  let mockDirectExecutor: jest.Mocked<DirectMCPExecutor>;

  beforeEach(() => {
    // Create mock MCP Manager
    mockMCPManager = {
      getStatus: jest.fn(),
      searchMemory: jest.fn(),
      searchWeb: jest.fn(),
      extractContent: jest.fn(),
      callTool: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
      reconnectFailedServers: jest.fn(),
      getClient: jest.fn()
    } as unknown as jest.Mocked<MCPManager>;

    // Mock MCP Manager status
    mockMCPManager.getStatus.mockReturnValue({
      connectedServers: 5,
      totalServers: 8,
      serverStatus: {
        'memory': { connected: true, phase: 1, priority: 'critical' },
        'brave-search': { connected: true, phase: 2, priority: 'high' },
        'firecrawl': { connected: true, phase: 2, priority: 'high' },
        'github': { connected: false, phase: 3, priority: 'medium' },
        'postgres': { connected: true, phase: 3, priority: 'medium' }
      }
    });

    // Create mock PersonalizationEngine
    mockPersonalizationEngine = {
      adaptResponse: jest.fn(),
      recordInteraction: jest.fn(),
      extractUserPatterns: jest.fn(),
      updateUserPreferences: jest.fn()
    } as unknown as jest.Mocked<PersonalizationEngine>;

    // Create mock DirectMCPExecutor
    mockDirectExecutor = {
      executeMemorySearch: jest.fn(),
      executeWebSearch: jest.fn(),
      executeContentExtraction: jest.fn(),
      executeSequentialThinking: jest.fn(),
      executeBrowserAutomation: jest.fn(),
      isRealMCPAvailable: jest.fn(),
      getAvailableRealMCPFunctions: jest.fn()
    } as unknown as jest.Mocked<DirectMCPExecutor>;

    orchestrator = new SmartContextOrchestratorService(
      mockMCPManager,
      mockPersonalizationEngine,
      mockDirectExecutor
    );
  });

  describe('Super Smart Context Building', () => {
    const mockMessage = {
      content: 'What are the latest developments in artificial intelligence?',
      author: { id: 'user123', username: 'testuser' },
      channelId: 'channel123',
      guildId: 'guild123',
      attachments: new Map(),
      member: null,
      channel: {},
      client: {}
    } as any;

    const mockAnalysis: UnifiedMessageAnalysis = {
      // Core analysis (required)
      hasAttachments: false,
      hasUrls: false,
      attachmentTypes: [],
      urls: [],
      complexity: 'moderate',
      intents: [],
      requiredTools: ['webSearch'],
      
      // Enhanced analysis capabilities
      needsPersonaSwitch: false,
      needsAdminFeatures: false,
      adminCommands: [],
      needsMultimodal: false,
      attachmentAnalysis: [],
      needsConversationManagement: false,
      conversationActions: [],
      needsMemoryOperation: true,
      memoryActions: ['search'],
      needsMCPTools: true,
      mcpRequirements: ['webSearch'],
      
      // Analysis metadata
      confidence: 0.8,
      processingRecommendations: []
    };

    const mockCapabilities: UserCapabilities = {
      hasBasicAI: true,
      hasMultimodal: true,
      hasAdvancedAI: true,
      hasAnalytics: false,
      hasAdminCommands: false
    };

    test('should build comprehensive smart context with multiple sources', async () => {
      // Mock memory search result
      mockMCPManager.searchMemory.mockResolvedValue({
        memories: ['Previous AI discussion about machine learning', 'User interested in technology'],
        entities: [],
        relations: []
      });

      // Mock personalization result
      mockPersonalizationEngine.adaptResponse.mockResolvedValue({
        originalResponse: 'Standard AI developments response',
        personalizedResponse: 'AI developments with focus on user\'s tech interests',
        adaptations: [
          {
            type: 'style',
            reason: 'User shows strong technical interest',
            basedOnPattern: 'technical-preference'
          }
        ],
        confidenceScore: 0.85
      });

      // Mock web search result
      mockDirectExecutor.executeWebSearch.mockResolvedValue({
        success: true,
        toolUsed: 'mcp-brave-search',
        data: {
          results: [
            {
              title: 'Latest AI Breakthroughs 2024',
              snippet: 'Recent advances in large language models and neural networks',
              url: 'https://example.com/ai-news'
            },
            {
              title: 'AI Research Trends',
              snippet: 'Current research directions in artificial intelligence',
              url: 'https://example.com/ai-research'
            }
          ]
        },
        requiresExternalMCP: false
      });

      // Mock sequential thinking result
      mockDirectExecutor.executeSequentialThinking.mockResolvedValue({
        success: true,
        toolUsed: 'mcp-sequential-thinking',
        data: {
          finalAnswer: 'Synthesized analysis of AI developments from multiple sources',
          steps: [],
          completed: true
        },
        requiresExternalMCP: false
      });

      const result = await orchestrator.buildSuperSmartContext(
        mockMessage,
        mockAnalysis,
        mockCapabilities
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.contextSources.length).toBeGreaterThan(2);
      expect(result.realTimeData).toBe(true);
      expect(result.personalizedInsights).toBe(true);
      expect(result.knowledgeDepth).toBe('expert');
      expect(result.contextMetadata.webSources).toBeGreaterThan(0);
      expect(result.contextMetadata.memoryEntries).toBeGreaterThan(0);
      expect(result.contextMetadata.personalizationFactors).toBeGreaterThan(0);

      // Verify that the enhanced prompt includes all context
      expect(result.enhancedPrompt).toContain('USER MEMORY CONTEXT');
      expect(result.enhancedPrompt).toContain('REAL-TIME INFORMATION');
      expect(result.enhancedPrompt).toContain('SYNTHESIZED CONTEXT');
    });

    test('should handle real-time information needs', async () => {
      const currentEventMessage = {
        ...mockMessage,
        content: 'What are the latest news about today\'s technology developments?'
      };

      mockDirectExecutor.executeWebSearch.mockResolvedValue({
        success: true,
        toolUsed: 'mcp-brave-search',
        data: {
          results: [
            {
              title: 'Breaking: New AI Model Released Today',
              snippet: 'Major tech company announces breakthrough AI model',
              url: 'https://example.com/breaking-ai'
            }
          ]
        },
        requiresExternalMCP: false
      });

      const result = await orchestrator.buildSuperSmartContext(
        currentEventMessage,
        mockAnalysis,
        mockCapabilities
      );

      expect(result.realTimeData).toBe(true);
      expect(result.contextSources).toContain("web-search:What are the latest news about today's technology developments");
      expect(result.contextMetadata.webSources).toBeGreaterThan(0);
    });

    test('should adapt context to user expertise level', async () => {
      mockPersonalizationEngine.adaptResponse.mockResolvedValue({
        originalResponse: 'Standard AI response',
        personalizedResponse: 'Technical AI response',
        adaptations: [
          {
            type: 'style',
            reason: 'User demonstrates expert-level technical knowledge',
            basedOnPattern: 'technical-expertise'
          }
        ],
        confidenceScore: 0.9
      });

      const result = await orchestrator.buildSuperSmartContext(
        mockMessage,
        mockAnalysis,
        mockCapabilities
      );

      expect(result.enhancedPrompt).toContain('USER EXPERTISE CONTEXT');
      expect(result.enhancedPrompt).toContain('beginner');
    });

    test('should handle content extraction for URLs', async () => {
      const urlMessage = {
        ...mockMessage,
        content: 'Analyze this article: https://example.com/ai-article and tell me what you think'
      };

      mockDirectExecutor.executeContentExtraction.mockResolvedValue({
        success: true,
        toolUsed: 'mcp-firecrawl',
        data: {
          results: [
            {
              content: 'Article content about AI developments and future implications...',
              title: 'The Future of AI',
              url: 'https://example.com/ai-article'
            }
          ]
        },
        requiresExternalMCP: false
      });

      const result = await orchestrator.buildSuperSmartContext(
        urlMessage,
        { ...mockAnalysis, complexity: 'complex' },
        mockCapabilities
      );

      expect(result.contextSources).toContain('content-extraction:https://example.com/ai-article');
      expect(result.contextMetadata.documentSources).toBeGreaterThan(0);
      expect(result.knowledgeDepth).toBe('surface');
    });

    test('should provide graceful fallback when MCP tools fail', async () => {
      // Mock all MCP calls to fail
      mockMCPManager.searchMemory.mockRejectedValue(new Error('Memory service unavailable'));
      mockDirectExecutor.executeWebSearch.mockRejectedValue(new Error('Web search failed'));
      mockDirectExecutor.executeContentExtraction.mockRejectedValue(new Error('Content extraction failed'));

      const result = await orchestrator.buildSuperSmartContext(
        mockMessage,
        mockAnalysis,
        mockCapabilities
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBe(0.5);
      expect(result.contextSources).not.toContain('fallback');
      expect(result.knowledgeDepth).toBe('surface');
      expect(result.enhancedPrompt).toBe(mockMessage.content);
    });

    test('should determine knowledge depth correctly', async () => {
      // Test expert level (4+ sources, high confidence)
      mockMCPManager.searchMemory.mockResolvedValue({ memories: ['context1'], entities: [], relations: [] });
      mockDirectExecutor.executeWebSearch.mockResolvedValue({
        success: true,
        toolUsed: 'web-search',
        data: { results: [{ title: 'test', snippet: 'test' }] },
        requiresExternalMCP: false
      });
      mockDirectExecutor.executeContentExtraction.mockResolvedValue({
        success: true,
        toolUsed: 'content-extraction',
        data: { results: [{ content: 'test content' }] },
        requiresExternalMCP: false
      });
      mockDirectExecutor.executeSequentialThinking.mockResolvedValue({
        success: true,
        toolUsed: 'sequential-thinking',
        data: { finalAnswer: 'synthesis' },
        requiresExternalMCP: false
      });

      mockPersonalizationEngine.adaptResponse.mockResolvedValue({
        originalResponse: 'Standard response',
        personalizedResponse: 'personalized',
        adaptations: [
          {
            type: 'style',
            reason: 'expert user',
            basedOnPattern: 'technical-expertise'
          }
        ],
        confidenceScore: 0.9
      });

      const result = await orchestrator.buildSuperSmartContext(
        { ...mockMessage, content: 'https://example.com/article Complex AI question?' },
        { ...mockAnalysis, complexity: 'complex' },
        mockCapabilities,
        {
          prioritizeRealTime: true,
          includePersonalHistory: true,
          deepWebResearch: true,
          crossReferenceMemory: true,
          synthesizeMultipleSources: true,
          adaptToUserExpertise: true,
          timeoutMs: 15000
        }
      );

      expect(result.knowledgeDepth).toBe('comprehensive');
      expect(result.confidence).toBe(1.0);
    });

    test('should handle processing timeout gracefully', async () => {
      // Mock a slow operation
      mockDirectExecutor.executeWebSearch.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 20000))
      );

      const result = await orchestrator.buildSuperSmartContext(
        mockMessage,
        mockAnalysis,
        mockCapabilities,
        {
          prioritizeRealTime: true,
          includePersonalHistory: false,
          deepWebResearch: false,
          crossReferenceMemory: false,
          synthesizeMultipleSources: false,
          adaptToUserExpertise: false,
          timeoutMs: 1000 // Very short timeout
        }
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.8);
    });
  });

  describe('Context Strategy Optimization', () => {
    test('should optimize strategy based on message complexity', async () => {
      const simpleMessage = {
        content: 'Hello!',
        author: { id: 'user123' }
      } as any;

      const complexMessage = {
        content: 'Analyze the implications of quantum computing on blockchain security and provide a comprehensive research report with citations',
        author: { id: 'user123' }
      } as any;

      const simpleAnalysis: UnifiedMessageAnalysis = {
        // Core analysis (required)
        hasAttachments: false,
        hasUrls: false,
        attachmentTypes: [],
        urls: [],
        complexity: 'simple',
        intents: ['greeting'],
        requiredTools: [],
        
        // Enhanced analysis capabilities
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
        
        // Analysis metadata
        confidence: 0.9,
        processingRecommendations: []
      };

      const complexAnalysis: UnifiedMessageAnalysis = {
        // Core analysis (required)
        hasAttachments: false,
        hasUrls: false,
        attachmentTypes: [],
        urls: [],
        complexity: 'complex',
        intents: ['research', 'analysis'],
        requiredTools: ['webSearch', 'memory'],
        
        // Enhanced analysis capabilities
        needsPersonaSwitch: false,
        needsAdminFeatures: false,
        adminCommands: [],
        needsMultimodal: false,
        attachmentAnalysis: [],
        needsConversationManagement: false,
        conversationActions: [],
        needsMemoryOperation: true,
        memoryActions: ['search'],
        needsMCPTools: true,
        mcpRequirements: ['webSearch'],
        
        // Analysis metadata
        confidence: 0.7,
        processingRecommendations: ['use-streaming', 'enable-citations']
      };

      const mockCapabilities: UserCapabilities = {
        hasBasicAI: true,
        hasMultimodal: true,
        hasAdvancedAI: true,
        hasAnalytics: false,
        hasAdminCommands: false
      };

      // Mock tool responses for the complex message
      mockMCPManager.searchMemory.mockResolvedValue({ memories: ['context1'], entities: [], relations: [] });
      mockDirectExecutor.executeWebSearch.mockResolvedValue({
        success: true,
        toolUsed: 'web-search',
        data: { results: [{ title: 'test', snippet: 'test' }] },
        requiresExternalMCP: false
      });
      mockPersonalizationEngine.adaptResponse.mockResolvedValue({
        originalResponse: 'Standard response',
        personalizedResponse: 'personalized',
        adaptations: [],
        confidenceScore: 0.9
      });


      // Test simple message - should have minimal context building
      const simpleResult = await orchestrator.buildSuperSmartContext(
        simpleMessage,
        simpleAnalysis,
        mockCapabilities
      );

      // Test complex message - should have comprehensive context building
      const complexResult = await orchestrator.buildSuperSmartContext(
        complexMessage,
        complexAnalysis,
        mockCapabilities
      );

      expect(simpleResult.knowledgeDepth).toBe('detailed');
      expect(['detailed', 'comprehensive', 'expert']).toContain(complexResult.knowledgeDepth);
      expect(complexResult.contextSources.length).toBeGreaterThan(simpleResult.contextSources.length);
    });
  });
});
