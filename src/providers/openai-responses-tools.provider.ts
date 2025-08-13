import OpenAI from 'openai';
import { DirectMCPExecutor } from '../services/enhanced-intelligence/direct-mcp-executor.service.js';

interface ChatMsg { role: 'user' | 'assistant' | 'system'; content: string }

type OpenAIClient = OpenAI;

export class OpenAIResponsesToolsProvider {
  private client: OpenAIClient;
  private model: string;
  private executor: DirectMCPExecutor;

  constructor(executor?: DirectMCPExecutor, apiKey?: string, model?: string, clientOverride?: OpenAIClient) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key && !clientOverride) throw new Error('OPENAI_API_KEY not configured');
    this.client = clientOverride || new OpenAI({ apiKey: key! });
    this.model = model || process.env.OPENAI_RESPONSES_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.executor = executor || new DirectMCPExecutor();
  }

  private getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'memory_search',
          description: 'Search persistent knowledge and memory for relevant information to ground answers.',
          parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              query: { type: 'string', minLength: 1, description: 'The search query' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for recent, factual information using Brave Search if available.',
          parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              query: { type: 'string', minLength: 1 },
              count: { type: 'integer', minimum: 1, maximum: 10, default: 5 }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'content_extraction',
          description: 'Extract content from one or more URLs (markdown if possible).',
          parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              urls: { type: 'array', items: { type: 'string', format: 'uri' }, minItems: 1, maxItems: 5 }
            },
            required: ['urls']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'browser_automation',
          description: 'Navigate to a URL and extract basic page info (links, title, description).',
          parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              url: { type: 'string', format: 'uri' }
            },
            required: ['url']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'sequential_thinking',
          description: 'Perform structured, step-by-step reasoning to solve complex problems.',
          parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              thought: { type: 'string', minLength: 1 }
            },
            required: ['thought']
          }
        }
      }
    ] as any[];
  }

  private validateInput(name: string, input: any): string | null {
    try {
      switch (name) {
        case 'memory_search':
          if (!input || typeof input.query !== 'string' || input.query.trim().length === 0) return 'Invalid input: query is required';
          return null;
        case 'web_search':
          if (!input || typeof input.query !== 'string' || input.query.trim().length === 0) return 'Invalid input: query is required';
          if (input.count !== undefined) {
            const c = Number(input.count);
            if (!Number.isInteger(c) || c < 1 || c > 10) return 'Invalid input: count must be integer 1..10';
          }
          return null;
        case 'content_extraction':
          if (!input || !Array.isArray(input.urls) || input.urls.length === 0) return 'Invalid input: urls array required';
          if (input.urls.length > 5) return 'Invalid input: max 5 urls';
          if (!input.urls.every((u: any) => typeof u === 'string' && /^https?:\/\//.test(u))) return 'Invalid input: urls must be http(s)';
          return null;
        case 'browser_automation':
          if (!input || typeof input.url !== 'string' || !/^https?:\/\//.test(input.url)) return 'Invalid input: url must be http(s)';
          return null;
        case 'sequential_thinking':
          if (!input || typeof input.thought !== 'string' || input.thought.trim().length === 0) return 'Invalid input: thought is required';
          return null;
        default:
          return 'Unknown tool';
      }
    } catch (e) {
      return 'Validation error';
    }
  }

  private async handleToolCall(name: string, input: any): Promise<{ summary: string; output: string }> {
    const err = this.validateInput(name, input);
    if (err) return { summary: `${name}: ${err}`, output: JSON.stringify({ success: false, error: err }) };
    try {
      switch (name) {
        case 'memory_search': {
          const res = await this.executor.executeMemorySearch(String(input.query || ''));
          const sum = res.success ? `memory_search ok (${(res as any).data?.totalResults ?? 0} results)` : 'memory_search failed';
          return { summary: sum, output: JSON.stringify(res) };
        }
        case 'web_search': {
          const res = await this.executor.executeWebSearch(String(input.query || ''), Number(input.count || 5));
          const count = (res as any).data?.results?.length ?? 0;
          const sum = res.success ? `web_search ok (${count} results)` : 'web_search failed';
          return { summary: sum, output: JSON.stringify(res) };
        }
        case 'content_extraction': {
          const urls = Array.isArray(input.urls) ? input.urls.map(String) : [];
          const res = await this.executor.executeContentExtraction(urls);
          const count = (res as any).data?.results?.length ?? 0;
          const sum = res.success ? `content_extraction ok (${count} urls)` : 'content_extraction failed';
          return { summary: sum, output: JSON.stringify(res) };
        }
        case 'browser_automation': {
          const res = await this.executor.executeBrowserAutomation(String(input.url || ''));
          const sum = res.success ? `browser_automation ok` : 'browser_automation failed';
          return { summary: sum, output: JSON.stringify(res) };
        }
        case 'sequential_thinking': {
          const res = await this.executor.executeSequentialThinking(String(input.thought || ''));
          const sum = res.success ? `sequential_thinking ok` : 'sequential_thinking failed';
          return { summary: sum, output: JSON.stringify(res) };
        }
      }
      return { summary: `${name}: Unknown tool`, output: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }) };
    } catch (err) {
      return { summary: `${name}: error`, output: JSON.stringify({ success: false, error: String(err) }) };
    }
  }

  private hasToolUse(resp: any): boolean {
    const items = (resp?.output?.[0]?.content || []) as any[];
    return items.some(i => i?.type === 'tool_use');
  }

  private extractToolUses(resp: any): Array<{ id: string; name: string; input: any }> {
    const items = (resp?.output?.[0]?.content || []) as any[];
    return items.filter(i => i?.type === 'tool_use').map(i => ({ id: i.id, name: i.name, input: i.input }));
  }

  private extractText(resp: any): string {
    const items = (resp?.output?.[0]?.content || []) as any[];
    const textPart = items.find(i => i?.type === 'output_text');
    return textPart?.text || '';
  }

  public async generate(
    prompt: string,
    history: ChatMsg[] = [],
    systemPrompt?: string,
    overrideModel?: string
  ): Promise<string> {
    const lines: string[] = [];
    if (systemPrompt) lines.push(`SYSTEM: ${systemPrompt}`);
    for (const m of history) lines.push(`${m.role.toUpperCase()}: ${m.content}`);
    lines.push(`USER: ${prompt}`);

    let response = await this.client.responses.create({
      model: overrideModel || this.model,
      input: lines.join('\n'),
      tools: this.getTools(),
    });

    const toolSummaries: string[] = [];

    let guard = 0;
    while (this.hasToolUse(response) && guard < 5) {
      const uses = this.extractToolUses(response);
      const tool_outputs: Array<{ tool_call_id: string; output: string }> = [];
      for (const u of uses) {
        const { summary, output } = await this.handleToolCall(u.name, u.input);
        toolSummaries.push(summary);
        tool_outputs.push({ tool_call_id: u.id, output });
      }
      response = await (this.client as any).responses.submitToolOutputs(response.id, { tool_outputs });
      guard++;
    }

    let text = this.extractText(response);
    if (process.env.FEATURE_TOOL_SUMMARY === 'true' && toolSummaries.length > 0) {
      text += `\n\n---\nTool summary: ${toolSummaries.join('; ')}`;
    }
    return text;
  }
}