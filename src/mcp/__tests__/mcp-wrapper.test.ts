
import {
  memorySearchNodes,
  braveWebSearch,
  contentScrape,
  sequentialThinking,
  playwrightNavigate
} from '../index.js';

describe('MCP wrapper module', () => {
  afterEach(() => {
    // Clean up any mocked globals after each test
    delete (globalThis as any).mcp_memory_search_nodes;
    delete (globalThis as any).mcp_brave_search_brave_web_search;
    delete (globalThis as any).mcp_firecrawl_firecrawl_scrape;
    delete (globalThis as any).mcp_sequentialthi_sequentialthinking;
    delete (globalThis as any).mcp_playwright_browser_navigate;
  });

  it('memorySearchNodes calls underlying global function', async () => {
    const mock = jest.fn().mockResolvedValue({ entities: [], relations: [], memories: [] });
    (globalThis as any).mcp_memory_search_nodes = mock;

    const result = await memorySearchNodes({ query: 'foo' });
    expect(mock).toHaveBeenCalledWith({ query: 'foo' });
    expect(result).toEqual({ entities: [], relations: [], memories: [] });
  });

  it('braveWebSearch calls underlying global function', async () => {
    const mock = jest.fn().mockResolvedValue({ results: [] });
    (globalThis as any).mcp_brave_search_brave_web_search = mock;

    const result = await braveWebSearch({ query: 'bar', count: 3 });
    expect(mock).toHaveBeenCalledWith({ query: 'bar', count: 3 });
    expect(result).toEqual({ results: [] });
  });

  it('contentScrape calls underlying global function', async () => {
    const mock = jest.fn().mockResolvedValue({ title: 't', content: 'c', success: true });
    (globalThis as any).mcp_firecrawl_firecrawl_scrape = mock;

    const result = await contentScrape({ url: 'https://example.com' });
    expect(mock).toHaveBeenCalledWith({ url: 'https://example.com' });
    expect(result).toEqual({ title: 't', content: 'c', success: true });
  });

  it('sequentialThinking calls underlying global function', async () => {
    const mock = jest.fn().mockResolvedValue({ steps: [], finalAnswer: 'x', completed: true });
    (globalThis as any).mcp_sequentialthi_sequentialthinking = mock;

    const result = await sequentialThinking({ thought: 'baz' });
    expect(mock).toHaveBeenCalledWith({ thought: 'baz' });
    expect(result).toEqual({ steps: [], finalAnswer: 'x', completed: true });
  });

  it('playwrightNavigate calls underlying global function', async () => {
    const mock = jest.fn().mockResolvedValue({ pageTitle: 'page', pageContent: '<html></html>' });
    (globalThis as any).mcp_playwright_browser_navigate = mock;

    const result = await playwrightNavigate({ url: 'https://example.com' });
    expect(mock).toHaveBeenCalledWith({ url: 'https://example.com' });
    expect(result).toEqual({ pageTitle: 'page', pageContent: '<html></html>' });
  });
});
