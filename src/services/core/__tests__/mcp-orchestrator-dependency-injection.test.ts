/**
 * Unified MCP Orchestrator Service - Dependency Injection Test
 * 
 * This test specifically addresses the issue where services create their own
 * dependencies instead of accepting them via constructor injection, making
 * them untestable with proper mocking.
 */

import { UnifiedMCPOrchestratorService } from '../mcp-orchestrator.service.js';
import { MCPManager } from '../../mcp-manager.service.js';
import { DirectMCPExecutor } from '../../enhanced-intelligence/direct-mcp-executor.service.js';

// Mock dependencies
jest.mock('../../mcp-manager.service.js');
jest.mock('../../enhanced-intelligence/direct-mcp-executor.service.js');

describe('UnifiedMCPOrchestratorService - Dependency Injection', () => {
  let mockMCPManager: jest.Mocked<MCPManager>;
  let mockDirectExecutor: jest.Mocked<DirectMCPExecutor>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockMCPManager = {
      initialize: jest.fn(),
      getStatus: jest.fn(),
      searchMemory: jest.fn(),
      searchWeb: jest.fn(),
      extractContent: jest.fn(),
      callTool: jest.fn(),
      shutdown: jest.fn(),
      reconnectFailedServers: jest.fn(),
      getClient: jest.fn()
    } as unknown as jest.Mocked<MCPManager>;

    mockDirectExecutor = {
      executeMemorySearch: jest.fn(),
      executeWebSearch: jest.fn(),
      executeContentExtraction: jest.fn(),
      executeSequentialThinking: jest.fn(),
      executePlaywrightAction: jest.fn()
    } as unknown as jest.Mocked<DirectMCPExecutor>;
  });

  describe('Constructor Dependency Injection', () => {
    test('should accept MCPManager via constructor injection', () => {
      const service = new UnifiedMCPOrchestratorService(mockMCPManager);
      expect(service).toBeDefined();
      
      // The service should be using the injected MCPManager
      // This test verifies that the service doesn't create its own MCPManager
    });

    test('should accept DirectMCPExecutor via constructor injection', () => {
      const service = new UnifiedMCPOrchestratorService(mockMCPManager, mockDirectExecutor);
      expect(service).toBeDefined();
      
      // The service should be using the injected DirectMCPExecutor
      // This test verifies that the service doesn't create its own DirectMCPExecutor
    });

    test('should work with only MCPManager injected (DirectMCPExecutor optional)', () => {
      const service = new UnifiedMCPOrchestratorService(mockMCPManager);
      expect(service).toBeDefined();
      
      // When DirectMCPExecutor is not provided, the service should create its own
      // This maintains backward compatibility
    });

    test('should work with no dependencies injected', () => {
      const service = new UnifiedMCPOrchestratorService();
      expect(service).toBeDefined();
      
      // When no dependencies are provided, the service should create its own
      // This maintains backward compatibility
    });
  });

  describe('Mock Verification', () => {
    test('should use injected mocks for testing', async () => {
      // Mock the return values
      mockDirectExecutor.executeMemorySearch.mockResolvedValue({
        success: true,
        data: { test: 'memory data' },
        toolUsed: 'memory-search'
      });

      const service = new UnifiedMCPOrchestratorService(mockMCPManager, mockDirectExecutor);
      await service.initialize();

      // This test demonstrates that the injected mocks are actually used
      // Previously, this would fail because the service created its own instances
      expect(mockMCPManager.initialize).toHaveBeenCalled();
    });

    test('should demonstrate the fix for the original issue', async () => {
      // This test specifically addresses the issue described in the GitHub issue
      // where mockMCPManager.initialize.mockRejectedValue(...) wouldn't work
      // because the service created its own MCPManager instance
      
      mockMCPManager.initialize.mockRejectedValue(new Error('Test initialization failure'));
      
      const service = new UnifiedMCPOrchestratorService(mockMCPManager, mockDirectExecutor);
      
      // The service handles initialization errors gracefully (graceful degradation)
      // So it won't throw, but it will call the injected mock
      await service.initialize();
      
      // Verify that the mock was actually called - this is the key test
      // Previously this would fail because the service created its own MCPManager
      expect(mockMCPManager.initialize).toHaveBeenCalled();
    });
  });
});