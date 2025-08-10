/**
 * Enhanced Intelligence Activation Service Tests
 * Tests the activation and optimization of Enhanced Intelligence features
 */

import { EnhancedIntelligenceActivationService } from '../enhanced-intelligence-activation.service.js';
import { MCPManager } from '../mcp-manager.service.js';
import { DirectMCPExecutor } from '../enhanced-intelligence/direct-mcp-executor.service.js';

// Mock dependencies
jest.mock('../mcp-manager.service.js');
jest.mock('../enhanced-intelligence/personalization-engine.service.js');
jest.mock('../enhanced-intelligence/smart-context-orchestrator.service.js');
jest.mock('../enhanced-intelligence/direct-mcp-executor.service.js');

describe('Enhanced Intelligence Activation Service', () => {
  let service: EnhancedIntelligenceActivationService;
  let mockMCPManager: jest.Mocked<MCPManager>;
  // let mockPersonalizationEngine: jest.Mocked<PersonalizationEngine>; // Not used in tests
  // let mockContextOrchestrator: jest.Mocked<SmartContextOrchestratorService>; // Not used in tests
  let mockDirectExecutor: jest.Mocked<DirectMCPExecutor>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MCP Manager
    mockMCPManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue({
        connectedServers: 5,
        totalServers: 8,
        serverStatus: {
          'memory': { connected: true, phase: 1, priority: 'critical' },
          'brave-search': { connected: true, phase: 2, priority: 'high' },
          'firecrawl': { connected: true, phase: 2, priority: 'high' },
          'sequential-thinking': { connected: true, phase: 2, priority: 'medium' }
        }
      }),
      shutdown: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<MCPManager>;

    // Mock PersonalizationEngine (unused in this test)
    // const mockPersonalizationEngine = {} as jest.Mocked<PersonalizationEngine>;

    // Mock SmartContextOrchestratorService (unused in this test)
    // const mockContextOrchestrator = {} as jest.Mocked<SmartContextOrchestratorService>;

    // Mock DirectMCPExecutor
    mockDirectExecutor = {
      executeWebSearch: jest.fn().mockResolvedValue({ 
        success: true, 
        data: { results: [] }, 
        toolUsed: 'brave-search' 
      }),
      executeContentExtraction: jest.fn().mockResolvedValue({ 
        success: true, 
        data: { content: 'test' }, 
        toolUsed: 'firecrawl' 
      }),
      executeSequentialThinking: jest.fn().mockResolvedValue({ 
        success: true, 
        data: { finalAnswer: 'test' }, 
        toolUsed: 'sequential-thinking' 
      })
    } as unknown as jest.Mocked<DirectMCPExecutor>;

    // Create service instance
    service = new EnhancedIntelligenceActivationService({
      enableRealMCPAPIs: true,
      enablePersonalizationEngine: true,
      enableAdvancedContextOrchestration: true,
      enableProductionOptimizations: true,
      braveApiKey: 'test-brave-key',
      firecrawlApiKey: 'test-firecrawl-key'
    });
  });

  describe('Enhanced Intelligence Activation', () => {
    test('should activate all Enhanced Intelligence features successfully', async () => {
      const status = await service.activateEnhancedIntelligence();

      expect(status.activated).toBe(true);
      expect(status.mcpConnectionsActive).toBe(5);
      expect(status.availableFeatures).toContain('real-time-web-search');
      expect(status.availableFeatures).toContain('adaptive-user-patterns');
      expect(status.availableFeatures).toContain('multi-source-context');
      expect(status.availableFeatures).toContain('production-optimizations');
      expect(status.performanceOptimizationsActive).toBe(true);
      expect(status.lastActivationTime).toBeInstanceOf(Date);
    });

    test('should handle partial activation when some features are disabled', async () => {
      service = new EnhancedIntelligenceActivationService({
        enableRealMCPAPIs: true,
        enablePersonalizationEngine: false,
        enableAdvancedContextOrchestration: false,
        enableProductionOptimizations: false
      });

      const status = await service.activateEnhancedIntelligence();

      expect(status.activated).toBe(true);
      expect(status.availableFeatures).toContain('real-time-web-search');
      expect(status.availableFeatures).not.toContain('adaptive-user-patterns');
      expect(status.performanceOptimizationsActive).toBe(false);
    });

    test('should provide graceful fallback when MCP APIs fail', async () => {
      mockMCPManager.initialize.mockRejectedValue(new Error('MCP connection failed'));

      const status = await service.activateEnhancedIntelligence();

      expect(status.activated).toBe(true);
      expect(status.mcpConnectionsActive).toBe(0);
      // Should still activate other features
      expect(status.availableFeatures).toContain('adaptive-user-patterns');
    });
  });

  describe('MCP API Integration', () => {
    test('should validate real MCP API connections', async () => {
      const status = await service.activateEnhancedIntelligence();

      expect(mockDirectExecutor.executeWebSearch).toHaveBeenCalledWith('test query', 1);
      expect(mockDirectExecutor.executeContentExtraction).toHaveBeenCalledWith(['https://example.com']);
      expect(mockDirectExecutor.executeSequentialThinking).toHaveBeenCalledWith('test thought');
      
      expect(status.availableFeatures).toContain('real-time-web-search');
      expect(status.availableFeatures).toContain('advanced-content-extraction');
      expect(status.availableFeatures).toContain('advanced-reasoning');
    });

    test('should handle API validation failures gracefully', async () => {
      mockDirectExecutor.executeWebSearch.mockResolvedValue({ 
        success: false, 
        error: 'API key invalid', 
        toolUsed: 'brave-search' 
      });
      mockDirectExecutor.executeContentExtraction.mockResolvedValue({ 
        success: false, 
        error: 'API unavailable', 
        toolUsed: 'firecrawl' 
      });

      const status = await service.activateEnhancedIntelligence();

      expect(status.activated).toBe(true);
      expect(status.availableFeatures).not.toContain('real-time-web-search');
      expect(status.availableFeatures).not.toContain('advanced-content-extraction');
      // Should still have sequential thinking if it works
      expect(status.availableFeatures).toContain('advanced-reasoning');
    });
  });

  describe('Personalization Engine Optimization', () => {
    test('should activate and optimize personalization engine', async () => {
      const status = await service.activateEnhancedIntelligence();

      expect(status.availableFeatures).toContain('adaptive-user-patterns');
      expect(status.availableFeatures).toContain('intelligent-recommendations');
    });
  });

  describe('Advanced Context Orchestration', () => {
    test('should activate advanced context orchestration', async () => {
      const status = await service.activateEnhancedIntelligence();

      expect(status.availableFeatures).toContain('multi-source-context');
      expect(status.availableFeatures).toContain('intelligent-synthesis');
    });
  });

  describe('Production Optimizations', () => {
    test('should apply production-grade optimizations', async () => {
      const status = await service.activateEnhancedIntelligence();

      expect(status.performanceOptimizationsActive).toBe(true);
      expect(status.availableFeatures).toContain('production-optimizations');
    });

    test('should skip production optimizations when disabled', async () => {
      service = new EnhancedIntelligenceActivationService({
        enableRealMCPAPIs: false,
        enablePersonalizationEngine: false,
        enableAdvancedContextOrchestration: false,
        enableProductionOptimizations: false
      });

      const status = await service.activateEnhancedIntelligence();

      expect(status.performanceOptimizationsActive).toBe(false);
      expect(status.availableFeatures).not.toContain('production-optimizations');
    });
  });

  describe('Status and Monitoring', () => {
    test('should provide accurate status information', async () => {
      await service.activateEnhancedIntelligence();

      const status = service.getStatus();
      expect(status.activated).toBe(true);
      expect(typeof status.mcpConnectionsActive).toBe('number');
      expect(Array.isArray(status.availableFeatures)).toBe(true);
      expect(typeof status.performanceOptimizationsActive).toBe('boolean');
    });

    test('should return available features list', async () => {
      await service.activateEnhancedIntelligence();

      const features = service.getAvailableFeatures();
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
      expect(features).toContain('real-time-web-search');
    });

    test('should track activation state correctly', async () => {
      expect(service.isActivated()).toBe(false);

      await service.activateEnhancedIntelligence();
      expect(service.isActivated()).toBe(true);

      await service.shutdown();
      expect(service.isActivated()).toBe(false);
    });
  });

  describe('Graceful Shutdown', () => {
    test('should shutdown all services gracefully', async () => {
      await service.activateEnhancedIntelligence();
      expect(service.isActivated()).toBe(true);

      await service.shutdown();

      expect(mockMCPManager.shutdown).toHaveBeenCalled();
      expect(service.isActivated()).toBe(false);
      
      const status = service.getStatus();
      expect(status.activated).toBe(false);
      expect(status.mcpConnectionsActive).toBe(0);
    });

    test('should handle shutdown errors gracefully', async () => {
      await service.activateEnhancedIntelligence();
      mockMCPManager.shutdown.mockRejectedValue(new Error('Shutdown failed'));

      // Should not throw
      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle activation errors and provide meaningful feedback', async () => {
      mockMCPManager.initialize.mockRejectedValue(new Error('Critical MCP failure'));

      await expect(service.activateEnhancedIntelligence()).rejects.toThrow('Critical MCP failure');
    });

    test('should handle configuration validation', () => {
      const invalidService = new EnhancedIntelligenceActivationService({
        enableRealMCPAPIs: false,
        enablePersonalizationEngine: false,
        enableAdvancedContextOrchestration: false,
        enableProductionOptimizations: false
      });

      expect(invalidService).toBeInstanceOf(EnhancedIntelligenceActivationService);
    });
  });

  describe('Integration with Main Bot', () => {
    test('should integrate seamlessly with main bot startup sequence', async () => {
      // Test that the service can be started as part of main bot initialization
      const status = await service.activateEnhancedIntelligence();

      expect(status.activated).toBe(true);
      expect(status.lastActivationTime).toBeInstanceOf(Date);
      
      // Verify it works with graceful shutdown
      await service.shutdown();
      expect(service.isActivated()).toBe(false);
    });
  });
});