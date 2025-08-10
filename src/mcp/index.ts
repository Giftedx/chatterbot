// MCP Wrapper Module
// Provides safe typed wrappers around global MCP tool functions so that
// production code does not rely on global namespace pollution.
// Each wrapper checks for the existence of the corresponding global
// before calling it and throws a descriptive error if it is missing.
// This allows unit tests to mock the functions and keeps IDE type checking happy.

/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MemorySearchNodesParams {
  query: string;
}
export interface MemorySearchNodesResult {
  entities?: Array<{
    name: string;
    type: string;
    observations: string[];
  }>;
  relations?: Array<{
    from: string;
    to: string;
    type: string;
  }>;
  memories?: string[];
}

export async function memorySearchNodes(
  params: MemorySearchNodesParams
): Promise<MemorySearchNodesResult> {
  if (typeof (globalThis as any).mcp_memory_search_nodes === 'function') {
    return (globalThis as any).mcp_memory_search_nodes(params);
  }
  throw new Error('mcp_memory_search_nodes function not available in current environment');
}

export interface BraveWebSearchParams {
  query: string;
  count?: number;
}
export interface BraveWebSearchResult {
  results?: Array<{
    title: string;
    url: string;
    snippet: string;
    rank: number;
  }>;
}
export async function braveWebSearch(
  params: BraveWebSearchParams
): Promise<BraveWebSearchResult> {
  if (typeof (globalThis as any).mcp_brave_search_brave_web_search === 'function') {
    return (globalThis as any).mcp_brave_search_brave_web_search(params);
  }
  throw new Error('mcp_brave_search_brave_web_search function not available');
}

export interface ContentScrapeParams {
  url: string;
}
export interface ContentScrapeResult {
  title?: string;
  content?: string;
  success?: boolean;
}
export async function contentScrape(
  params: ContentScrapeParams
): Promise<ContentScrapeResult> {
  if (typeof (globalThis as any).mcp_firecrawl_firecrawl_scrape === 'function') {
    return (globalThis as any).mcp_firecrawl_firecrawl_scrape(params);
  }
  throw new Error('mcp_firecrawl_firecrawl_scrape function not available');
}

export interface SequentialThinkingParams {
  thought: string;
  nextThoughtNeeded?: boolean;
  thoughtNumber?: number;
  totalThoughts?: number;
}
export interface SequentialThinkingResult {
  steps?: Array<unknown>;
  finalAnswer?: string;
  completed?: boolean;
}
export async function sequentialThinking(
  params: SequentialThinkingParams
): Promise<SequentialThinkingResult> {
  if (typeof (globalThis as any).mcp_sequentialthi_sequentialthinking === 'function') {
    return (globalThis as any).mcp_sequentialthi_sequentialthinking(params);
  }
  throw new Error('mcp_sequentialthi_sequentialthinking function not available');
}

export interface PlaywrightNavigateParams {
  url: string;
}
export interface PlaywrightNavigateResult {
  actions?: Array<{ action: string; target: string; success: boolean; timestamp: string }>;
  screenshots?: string[];
  data?: { pageTitle: string; pageContent: string };
}
export async function playwrightNavigate(
  params: PlaywrightNavigateParams
): Promise<PlaywrightNavigateResult> {
  if (typeof (globalThis as any).mcp_playwright_browser_navigate === 'function') {
    return (globalThis as any).mcp_playwright_browser_navigate(params);
  }
  throw new Error('mcp_playwright_browser_navigate function not available');
}
