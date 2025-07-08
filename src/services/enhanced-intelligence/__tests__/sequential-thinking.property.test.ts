import fc from 'fast-check';
import { directMCPExecutor } from '../direct-mcp-executor.service';

describe('SequentialThinking property-based tests', () => {
  // Property 1: For any string input, executeSequentialThinking should not throw and should return a valid MCPToolResult
  it('should not throw and should return valid MCPToolResult for any string input', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (thought) => {
        let result: unknown;
        let threw = false;
        try {
          result = await directMCPExecutor.executeSequentialThinking(thought);
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
        expect(mcpResult).toHaveProperty('data');
        expect(mcpResult).toHaveProperty('toolUsed');
        expect(mcpResult).toHaveProperty('requiresExternalMCP');
        // Only check for error if not success
        if (!mcpResult.success) {
          expect(mcpResult).toHaveProperty('error');
        }
        // Data should have steps, finalAnswer, metadata
        expect(mcpResult.data).toBeDefined();
        expect(mcpResult.data).toHaveProperty('steps');
        expect(mcpResult.data).toHaveProperty('finalAnswer');
        expect(mcpResult.data).toHaveProperty('metadata');
        expect(Array.isArray(mcpResult.data.steps)).toBe(true);
        expect(typeof mcpResult.data.finalAnswer).toBe('string');
        expect(typeof mcpResult.data.metadata).toBe('object');
      })
    );
  });

  // Property 2: For empty or very short inputs, the function should still return a valid result
  it('should handle empty and short inputs gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.string({ minLength: 1, maxLength: 5 }),
          fc.constant('a'),
          fc.constant('test')
        ),
        async (thought) => {
          const result = await directMCPExecutor.executeSequentialThinking(thought);
          expect(result).toBeDefined();
          const mcpResult = result as any;
          expect(mcpResult).toHaveProperty('success');
          expect(mcpResult).toHaveProperty('data');
          expect(mcpResult.data).toHaveProperty('metadata');
          expect(typeof mcpResult.data.metadata).toBe('object');
        }
      )
    );
  });

  // Property 3: For very long inputs, the function should handle gracefully
  it('should handle long inputs gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 100, maxLength: 1000 }),
        async (thought) => {
          const result = await directMCPExecutor.executeSequentialThinking(thought);
          expect(result).toBeDefined();
          const mcpResult = result as any;
          expect(mcpResult).toHaveProperty('success');
          expect(mcpResult).toHaveProperty('data');
          expect(mcpResult.data).toHaveProperty('metadata');
          expect(typeof mcpResult.data.metadata).toBe('object');
        }
      )
    );
  });

  // Property 4: Steps array should always contain valid step objects when successful
  it('should return valid step objects in successful results', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 10, maxLength: 200 }), async (thought) => {
        const result = await directMCPExecutor.executeSequentialThinking(thought);
        const mcpResult = result as any;
        if (mcpResult.success && mcpResult.data && Array.isArray(mcpResult.data.steps)) {
          for (const step of mcpResult.data.steps) {
            expect(step).toBeDefined();
            expect(typeof step).toBe('object');
            // Check for actual properties present in steps
            expect(step).toHaveProperty('stepNumber');
            expect(step).toHaveProperty('thought');
            expect(step).toHaveProperty('reasoning');
            expect(step).toHaveProperty('conclusion');
            expect(typeof step.stepNumber).toBe('number');
            expect(typeof step.thought).toBe('string');
            expect(typeof step.reasoning).toBe('string');
            expect(typeof step.conclusion).toBe('string');
          }
        }
      })
    );
  });

  // Property 5: Tool used should be one of the expected values
  it('should use expected tool names', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 5, maxLength: 100 }), async (thought) => {
        const result = await directMCPExecutor.executeSequentialThinking(thought);
        const mcpResult = result as any;
        const expectedTools = [
          'enhanced_sequential_thinking',
          'mcp-sequential-thinking',
          'gemini_sequential_thinking',
          'sequential_thinking_fallback'
        ];
        expect(typeof mcpResult.toolUsed).toBe('string');
        expect(expectedTools).toContain(mcpResult.toolUsed);
      })
    );
  });
}); 