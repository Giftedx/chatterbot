import fc from 'fast-check';
import { directMCPExecutor } from '../direct-mcp-executor.service';

// Reduce the number of generated cases per property and impose a global time limit
// so the suite finishes quickly in CI while still providing reasonable coverage.
fc.configureGlobal({ numRuns: 25, interruptAfterTimeLimit: 20000 });

describe('ContentExtraction property-based tests', () => {
  // Property 1: For any array of string inputs, executeContentExtraction should not throw and should return a valid MCPToolResult
  it('should not throw and should return valid MCPToolResult for any array of string inputs', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.string()), async (urls) => {
        let result: unknown;
        let threw = false;
        try {
          result = await directMCPExecutor.executeContentExtraction(urls);
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
          expect(mcpResult.data).toHaveProperty('results');
          expect(Array.isArray(mcpResult.data.results)).toBe(true);
        }
      })
    );
  });

  // Property 2: For empty array, the function should handle gracefully
  it('should handle empty array gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant([]), async (urls) => {
        const result = await directMCPExecutor.executeContentExtraction([...urls]);
        expect(result).toBeDefined();
        const mcpResult = result as any;
        expect(mcpResult).toHaveProperty('success');
        expect(mcpResult).toHaveProperty('toolUsed');
        expect(typeof mcpResult.toolUsed).toBe('string');
      })
    );
  });

  // Property 3: For arrays with empty or malformed URLs, the function should still return a valid result
  it('should handle arrays with empty or malformed URLs gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.constant(''),
            fc.constant('not-a-url'),
            fc.constant('ftp://invalid'),
            fc.constant('://missing-protocol'),
            fc.constant('http://'),
            fc.constant('https://')
          )
        ),
        async (urls) => {
          const result = await directMCPExecutor.executeContentExtraction(urls);
          expect(result).toBeDefined();
          const mcpResult = result as any;
          expect(mcpResult).toHaveProperty('success');
          expect(mcpResult).toHaveProperty('toolUsed');
          expect(typeof mcpResult.toolUsed).toBe('string');
        }
      )
    );
  });

  // Property 4: For arrays with very long URLs, the function should handle gracefully
  it('should handle arrays with very long URLs gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 100, maxLength: 1000 })),
        async (urls) => {
          const result = await directMCPExecutor.executeContentExtraction(urls);
          expect(result).toBeDefined();
          const mcpResult = result as any;
          expect(mcpResult).toHaveProperty('success');
          expect(mcpResult).toHaveProperty('toolUsed');
          expect(typeof mcpResult.toolUsed).toBe('string');
        }
      )
    );
  }, 120000);

  // Property 5: Tool used should be one of the expected values
  it('should use expected tool names', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.string({ minLength: 5, maxLength: 100 })), async (urls) => {
        const result = await directMCPExecutor.executeContentExtraction(urls);
        const mcpResult = result as any;
        const expectedTools = [
          'enhanced_content_extraction',
          'firecrawl_api',
          'mcp-firecrawl',
          'content_extraction',
          'content_extraction_fallback'
        ];
        expect(typeof mcpResult.toolUsed).toBe('string');
        expect(expectedTools).toContain(mcpResult.toolUsed);
      })
    );
  });

  // Property 6: Results array should always contain valid result objects when successful
  it('should return valid result objects in successful results', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.string({ minLength: 10, maxLength: 200 })), async (urls) => {
        const result = await directMCPExecutor.executeContentExtraction(urls);
        const mcpResult = result as any;
        if (mcpResult.success && mcpResult.data && Array.isArray(mcpResult.data.results)) {
          for (const entry of mcpResult.data.results) {
            expect(entry).toBeDefined();
            expect(typeof entry).toBe('object');
            expect(entry).toHaveProperty('url');
            expect(entry).toHaveProperty('title');
            expect(entry).toHaveProperty('content');
            expect(typeof entry.url).toBe('string');
            expect(typeof entry.title).toBe('string');
            expect(typeof entry.content).toBe('string');
          }
        }
      })
    );
  });
}); 