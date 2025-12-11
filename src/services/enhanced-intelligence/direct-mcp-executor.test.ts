
import { DirectMCPExecutor } from './direct-mcp-executor.service.js';

// Mock dependencies
jest.mock('axios');
jest.mock('../knowledge-base.service.js', () => ({
  knowledgeBaseService: { search: jest.fn() }
}));

// We need to mock the Client from @modelcontextprotocol/sdk
const mockCallTool = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(undefined);

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      connect: mockConnect,
      callTool: mockCallTool,
      close: jest.fn(),
      listTools: jest.fn().mockResolvedValue({ tools: [] })
    }))
  };
});

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
  return {
    StdioClientTransport: jest.fn()
  };
});

describe('DirectMCPExecutor with Sequential Thinking', () => {
  let executor: DirectMCPExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    executor = new DirectMCPExecutor();

    // Mock genAI instance manually since we can't easily inject it
    (executor as any).genAI = {
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockImplementation(async (prompt: string) => {
          // Check specifically for Step 1 in the instruction part, not history
          if (prompt.includes('Step 1:')) {
            return {
              response: {
                text: () => JSON.stringify({
                  thought: "Step 1 thought",
                  nextThoughtNeeded: true,
                  thoughtNumber: 1,
                  totalThoughts: 2
                })
              }
            };
          } else {
             return {
              response: {
                text: () => JSON.stringify({
                  thought: "Step 2 thought",
                  nextThoughtNeeded: false,
                  thoughtNumber: 2,
                  totalThoughts: 2
                })
              }
            };
          }
        })
      })
    };
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('should use MCP tool if available and Gemini is present', async () => {
    const result = await executor.executeSequentialThinking('Test problem');

    expect(mockConnect).toHaveBeenCalled();
    expect(mockCallTool).toHaveBeenCalledTimes(2); // 2 steps mocked
    expect(mockCallTool).toHaveBeenCalledWith({
      name: 'sequentialthinking',
      arguments: expect.objectContaining({
        thought: 'Step 1 thought',
        thoughtNumber: 1
      })
    });

    expect(result.success).toBe(true);
    // Cast data to any to access properties for testing
    const data = result.data as any;
    expect(data.steps).toHaveLength(2);
    expect(data.metadata.reasoningMethod).toBe('mcp_sequential_thinking_loop');
    expect(result.requiresExternalMCP).toBe(true);
  });
});
