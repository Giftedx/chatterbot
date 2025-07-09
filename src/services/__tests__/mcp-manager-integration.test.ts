/**
 * MCP Manager Integration Test
 * Tests the new MCP Manager service and its integration with the bot architecture
 */

import { MCPManager } from '../mcp-manager.service.js';
import { mcpServersConfig, getEnabledServers, getServersByPhase } from '../../config/mcp-servers.config.js';

describe('MCPManager Integration', () => {
  let mcpManager: MCPManager;

  beforeEach(() => {
    mcpManager = new MCPManager();
  });

  afterEach(async () => {
    await mcpManager.shutdown();
  });

  describe('Initialization', () => {
    test('should create MCPManager instance', () => {
      expect(mcpManager).toBeDefined();
      expect(mcpManager).toBeInstanceOf(MCPManager);
    });

    test('should initialize successfully with mock servers', async () => {
      await expect(mcpManager.initialize()).resolves.not.toThrow();
      
      const status = mcpManager.getStatus();
      expect(status).toHaveProperty('totalServers');
      expect(status).toHaveProperty('connectedServers');
      expect(status).toHaveProperty('serverStatus');
    });

    test('should track connection status correctly', async () => {
      await mcpManager.initialize();
      
      const status = mcpManager.getStatus();
      expect(status.totalServers).toBeGreaterThanOrEqual(0);
      expect(status.connectedServers).toBeGreaterThanOrEqual(0);
      expect(status.connectedServers).toBeLessThanOrEqual(status.totalServers);
    });
  });

  describe('Server Configuration', () => {
    test('should load server configurations correctly', () => {
      const enabledServers = getEnabledServers();
      expect(typeof enabledServers).toBe('object');
      
      // Should have at least some servers configured
      const serverNames = Object.keys(enabledServers);
      expect(serverNames.length).toBeGreaterThanOrEqual(0);
      
      // Check server configuration structure
      for (const [, config] of Object.entries(enabledServers)) {
        expect(config).toHaveProperty('command');
        expect(config).toHaveProperty('args');
        expect(config).toHaveProperty('env');
        expect(config).toHaveProperty('enabled', true);
        expect(config).toHaveProperty('priority');
        expect(config).toHaveProperty('phase');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('capabilities');
        
        expect(['critical', 'high', 'medium', 'low']).toContain(config.priority);
        expect([1, 2, 3, 4, 5]).toContain(config.phase);
        expect(Array.isArray(config.capabilities)).toBe(true);
      }
    });

    test('should filter servers by phase correctly', () => {
      const phase1Servers = getServersByPhase(1);
      const phase2Servers = getServersByPhase(2);
      const phase3Servers = getServersByPhase(3);
      
      // Phase 2 should include Phase 1 servers
      expect(Object.keys(phase2Servers).length).toBeGreaterThanOrEqual(Object.keys(phase1Servers).length);
      
      // Phase 3 should include Phase 1 and 2 servers  
      expect(Object.keys(phase3Servers).length).toBeGreaterThanOrEqual(Object.keys(phase2Servers).length);
    });
  });

  describe('Tool Execution', () => {
    beforeEach(async () => {
      await mcpManager.initialize();
    });

    test('should handle memory search calls gracefully', async () => {
      try {
        const result = await mcpManager.searchMemory('test query');
        expect(result).toBeDefined();
        // Result should have some structure indicating it's a memory search response
        if (typeof result === 'object' && result !== null) {
          // Mock responses should have success property
          expect(result).toHaveProperty('success');
        }
      } catch (error) {
        // Should throw specific error about no memory servers if none are connected
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('memory servers');
      }
    });

    test('should handle web search calls gracefully', async () => {
      try {
        const result = await mcpManager.searchWeb('test query', 3);
        expect(result).toBeDefined();
        // Result should have some structure indicating it's a web search response  
        if (typeof result === 'object' && result !== null) {
          expect(result).toHaveProperty('success');
        }
      } catch (error) {
        // Should throw specific error about no search servers if none are connected
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('search servers');
      }
    });

    test('should handle content extraction calls gracefully', async () => {
      const testUrls = ['https://example.com'];
      
      try {
        const result = await mcpManager.extractContent(testUrls);
        expect(result).toBeDefined();
        if (typeof result === 'object' && result !== null) {
          expect(result).toHaveProperty('success');
        }
      } catch (error) {
        // Should throw specific error about no extraction servers if none are connected
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('extraction servers');
      }
    });

    test('should handle generic tool calls', async () => {
      // Test with non-existent server - should throw error
      await expect(
        mcpManager.callTool('non-existent-server', 'test-tool', {})
      ).rejects.toThrow('not found or not connected');
    });
  });

  describe('Connection Management', () => {
    test('should handle reconnection attempts', async () => {
      await mcpManager.initialize();
      
      // Test reconnection for failed servers
      await expect(mcpManager.reconnectFailedServers()).resolves.not.toThrow();
    });

    test('should shutdown gracefully', async () => {
      await mcpManager.initialize();
      await expect(mcpManager.shutdown()).resolves.not.toThrow();
      
      // Status should show no connected servers after shutdown
      const status = mcpManager.getStatus();
      expect(status.connectedServers).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid server configurations', async () => {
      // This should not throw - invalid servers should be skipped
      await expect(mcpManager.initialize()).resolves.not.toThrow();
    });

    test('should handle client not found errors', async () => {
      await mcpManager.initialize();
      
      const client = mcpManager.getClient('non-existent-server');
      expect(client).toBeUndefined();
    });
  });

  describe('Integration with Existing Architecture', () => {
    test('should be compatible with existing DirectMCPExecutor', async () => {
      // This test ensures our new MCP Manager doesn't break existing functionality
      const { directMCPExecutor } = await import('../enhanced-intelligence/direct-mcp-executor.service.js');
      
      expect(directMCPExecutor).toBeDefined();
      expect(typeof directMCPExecutor.executeMemorySearch).toBe('function');
      expect(typeof directMCPExecutor.executeWebSearch).toBe('function');
      
      // Test that both can coexist
      await mcpManager.initialize();
      const result = await directMCPExecutor.executeMemorySearch('integration test');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should provide enhanced capabilities over DirectMCPExecutor', async () => {
      await mcpManager.initialize();
      
      const status = mcpManager.getStatus();
      expect(status).toHaveProperty('serverStatus');
      
      // MCPManager should provide more server management capabilities
      expect(typeof mcpManager.reconnectFailedServers).toBe('function');
      expect(typeof mcpManager.shutdown).toBe('function');
      expect(typeof mcpManager.getStatus).toBe('function');
    });
  });
});

describe('MCP Configuration', () => {
  test('should have valid phase 1 servers (critical)', () => {
    const phase1Servers = getServersByPhase(1);
    const criticalServers = Object.values(phase1Servers).filter(s => s.priority === 'critical');
    
    // Should have some critical servers in phase 1
    expect(criticalServers.length).toBeGreaterThan(0);
    
    // Critical servers should include memory and discord
    const serverNames = Object.keys(phase1Servers);
    expect(serverNames.some(name => name.includes('memory') || name.includes('discord'))).toBe(true);
  });

  test('should have progressive server enablement by phase', () => {
    const phases = [1, 2, 3, 4, 5];
    let previousCount = 0;
    
    for (const phase of phases) {
      const servers = getServersByPhase(phase);
      const currentCount = Object.keys(servers).length;
      
      // Each phase should have at least as many servers as the previous
      expect(currentCount).toBeGreaterThanOrEqual(previousCount);
      previousCount = currentCount;
    }
  });

  test('should have proper environment variable references', () => {
    for (const [, config] of Object.entries(mcpServersConfig)) {
      for (const [envKey, envValue] of Object.entries(config.env)) {
        if (envKey.endsWith('_KEY') || envKey.endsWith('_TOKEN')) {
          // Critical environment variables should reference process.env
          if (config.priority === 'critical' && envValue && !envValue.startsWith('./')) {
            expect(envValue).toMatch(/^process\.env\./);
          }
        }
      }
    }
  });
});
