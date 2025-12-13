
import { DirectMCPExecutor } from '../direct-mcp-executor.service';
import { knowledgeBaseService } from '../../knowledge-base.service';

jest.mock('../../knowledge-base.service', () => ({
  knowledgeBaseService: {
    search: jest.fn()
  }
}));

describe('DirectMCPExecutor Memory Search', () => {
  let executor: DirectMCPExecutor;

  beforeEach(() => {
    executor = new DirectMCPExecutor();
    jest.clearAllMocks();
  });

  it('should use knowledgeBaseService when MCP tool is not available', async () => {
    (knowledgeBaseService.search as jest.Mock).mockResolvedValue([
      {
        content: 'test content',
        source: 'test source',
        confidence: 0.9,
        updatedAt: new Date(),
        sourceId: '1',
        channelId: 'c1',
        authorId: 'a1',
        tags: []
      }
    ]);

    // Ensure global function is NOT defined
    if ((globalThis as any).mcp_memory_search_nodes) {
      delete (globalThis as any).mcp_memory_search_nodes;
    }

    const result = await executor.executeMemorySearch('test query');

    expect(knowledgeBaseService.search).toHaveBeenCalledWith({
      query: 'test query',
      minConfidence: 0.5,
      limit: 10
    });
    expect(result.success).toBe(true);
    expect(result.toolUsed).toBe('mcp-memory-search');
    expect(result.data).toBeDefined();
    // @ts-ignore
    expect(result.data.entities[0].type).toBe('test source');
  });

  it('should use real MCP tool when available', async () => {
    // Mock the global function
    const mockEntities = [{ name: 'Entity1', type: 'Type1', observations: ['Obs1'] }];
    (globalThis as any).mcp_memory_search_nodes = jest.fn().mockResolvedValue({
      entities: mockEntities,
      relations: [],
      memories: []
    });

    const result = await executor.executeMemorySearch('test query');

    expect((globalThis as any).mcp_memory_search_nodes).toHaveBeenCalledWith({ query: 'test query' });
    expect(result.success).toBe(true);
    // @ts-ignore
    expect(result.data.entities).toEqual(mockEntities);
    expect(result.data).toHaveProperty('searchMethod', 'mcp_tool');
    // knowledgeBaseService should NOT be called if MCP tool works
    expect(knowledgeBaseService.search).not.toHaveBeenCalled();

    // Clean up global
    delete (globalThis as any).mcp_memory_search_nodes;
  });
});
