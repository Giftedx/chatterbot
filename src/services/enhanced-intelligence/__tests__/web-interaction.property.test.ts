import fc from 'fast-check';
import { directMCPExecutor } from '../direct-mcp-executor.service';

describe('WebInteraction property-based tests', () => {
  // Property 1: For any string input, executeBrowserAutomation should not throw and should return a valid MCPToolResult
  it('should not throw and should return valid MCPToolResult for any string input', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (url) => {
        let result: unknown;
        let threw = false;
        try {
          result = await directMCPExecutor.executeBrowserAutomation(url);
        } catch (error) {
          threw = true;
        }
        
        // Should not throw
        expect(threw).toBe(false);
        
        // Should return a valid structure
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        const mcpResult = result as any;
        expect(mcpResult).toHaveProperty('success');
        expect(mcpResult).toHaveProperty('toolUsed');
        expect(mcpResult).toHaveProperty('requiresExternalMCP');
        
        // Only check for error if not success
        if (!mcpResult.success) {
          expect(mcpResult).toHaveProperty('error');
        }
        
        // Should have valid data structure when successful
        if (mcpResult.success) {
          expect(mcpResult).toHaveProperty('data');
          expect(mcpResult.data).toBeDefined();
          expect(typeof mcpResult.data).toBe('object');
          expect(mcpResult.data).toHaveProperty('currentUrl');
          expect(mcpResult.data).toHaveProperty('pageTitle');
          expect(mcpResult.data).toHaveProperty('actions');
          expect(mcpResult.data).toHaveProperty('metadata');
          expect(Array.isArray(mcpResult.data.actions)).toBe(true);
          expect(typeof mcpResult.data.metadata).toBe('object');
        }
      })
    );
  });

  // Property 2: For valid URL formats, the function should handle gracefully
  it('should handle valid URL formats gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('https://example.com'),
          fc.constant('http://test.org'),
          fc.constant('https://www.google.com'),
          fc.constant('http://localhost:3000'),
          fc.constant('https://api.github.com/users/octocat')
        ),
        async (url) => {
          const result = await directMCPExecutor.executeBrowserAutomation(url);
          expect(result).toBeDefined();
          const mcpResult = result as any;
          expect(mcpResult).toHaveProperty('success');
          expect(mcpResult).toHaveProperty('toolUsed');
          expect(typeof mcpResult.toolUsed).toBe('string');
        }
      )
    );
  });

  // Property 3: For empty or malformed URLs, the function should still return a valid result
  it('should handle empty and malformed URLs gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('not-a-url'),
          fc.constant('ftp://invalid'),
          fc.constant('://missing-protocol'),
          fc.constant('http://'),
          fc.constant('https://')
        ),
        async (url) => {
          const result = await directMCPExecutor.executeBrowserAutomation(url);
          expect(result).toBeDefined();
          const mcpResult = result as any;
          expect(mcpResult).toHaveProperty('success');
          expect(mcpResult).toHaveProperty('toolUsed');
          expect(typeof mcpResult.toolUsed).toBe('string');
        }
      )
    );
  });

  // Property 4: For very long URLs, the function should handle gracefully
  it('should handle very long URLs gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 100, maxLength: 1000 }),
        async (url) => {
          const result = await directMCPExecutor.executeBrowserAutomation(url);
          expect(result).toBeDefined();
          const mcpResult = result as any;
          expect(mcpResult).toHaveProperty('success');
          expect(mcpResult).toHaveProperty('toolUsed');
          expect(typeof mcpResult.toolUsed).toBe('string');
        }
      )
    );
  });

  // Property 5: Tool used should be one of the expected values
  it('should use expected tool names', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 5, maxLength: 100 }), async (url) => {
        const result = await directMCPExecutor.executeBrowserAutomation(url);
        const mcpResult = result as any;
        
        const expectedTools = [
          'mcp-playwright', // Updated to canonical MCP tool name
          'browser_automation_fallback',
          'browser_automation'
        ];
        
        expect(typeof mcpResult.toolUsed).toBe('string');
        expect(expectedTools).toContain(mcpResult.toolUsed);
      })
    );
  });

  // Property 6: Actions array should always contain valid action objects when successful
  it('should return valid action objects in successful results', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 10, maxLength: 200 }), async (url) => {
        const result = await directMCPExecutor.executeBrowserAutomation(url);
        const mcpResult = result as any;
        
        if (mcpResult.success && mcpResult.data && Array.isArray(mcpResult.data.actions)) {
          for (const action of mcpResult.data.actions) {
            expect(action).toBeDefined();
            expect(typeof action).toBe('object');
            expect(action).toHaveProperty('action');
            expect(action).toHaveProperty('target');
            expect(action).toHaveProperty('success');
            expect(action).toHaveProperty('timestamp');
            expect(typeof action.action).toBe('string');
            expect(typeof action.target).toBe('string');
            expect(typeof action.success).toBe('boolean');
            expect(typeof action.timestamp).toBe('string');
          }
        }
      })
    );
  });

  // Property 7: Metadata should always contain expected fields when successful
  it('should return valid metadata in successful results', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 10, maxLength: 200 }), async (url) => {
        const result = await directMCPExecutor.executeBrowserAutomation(url);
        const mcpResult = result as any;
        
        if (mcpResult.success && mcpResult.data && mcpResult.data.metadata) {
          const metadata = mcpResult.data.metadata;
          expect(metadata).toHaveProperty('timestamp');
          expect(metadata).toHaveProperty('browserEngine');
          expect(typeof metadata.timestamp).toBe('string');
          expect(typeof metadata.browserEngine).toBe('string');
          
          // Check for optional fields that may be present
          if (metadata.loadTime !== undefined) {
            expect(typeof metadata.loadTime).toBe('string');
          }
          if (metadata.statusCode !== undefined) {
            expect(typeof metadata.statusCode).toBe('number');
          }
          if (metadata.contentType !== undefined) {
            expect(typeof metadata.contentType).toBe('string');
          }
        }
      })
    );
  });
}); 