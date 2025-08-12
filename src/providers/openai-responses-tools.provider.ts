import OpenAI from 'openai';
import { DirectMCPExecutor } from '../services/enhanced-intelligence/direct-mcp-executor.service.js';

interface ChatMsg { role: 'user' | 'assistant' | 'system'; content: string }

export class OpenAIResponsesToolsProvider {
  private client: OpenAI;
  private model: string;
  private executor: DirectMCPExecutor;

  constructor(executor?: DirectMCPExecutor, apiKey?: string, model?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not configured');
    this.client = new OpenAI({ apiKey: key });
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
            properties: {
              query: { type: 'string', description: 'The search query' }
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
            properties: {
              query: { type: 'string' },
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
            properties: {
              thought: { type: 'string' }
            },
            required: ['thought']
          }
        }
      }
    ] as any[];
  }

  private async handleToolCall(name: string, input: any): Promise<string> {
    try {
      switch (name) {
        case 'memory_search': {
          const res = await this.executor.executeMemorySearch(String(input.query || ''));
          return JSON.stringify(res);
        }
        case 'web_search': {
          const res = await this.executor.executeWebSearch(String(input.query || ''), Number(input.count || 5));
          return JSON.stringify(res);
        }
        case 'content_extraction': {
          const urls = Array.isArray(input.urls) ? input.urls.map(String) : [];
          const res = await this.executor.executeContentExtraction(urls);
          return JSON.stringify(res);
        }
        case 'browser_automation': {
          const res = await this.executor.executeBrowserAutomation(String(input.url || ''));
          return JSON.stringify(res);
        }
        case 'sequential_thinking': {
          const res = await this.executor.executeSequentialThinking(String(input.thought || ''));
          return JSON.stringify(res);
        }
      }
      return JSON.stringify({ success: false, error: `Unknown tool: ${name}` });
    } catch (err) {
      return JSON.stringify({ success: false, error: String(err) });
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
    // Prepare a single input string combining roles (keeps it simple for Responses API)
    const lines: string[] = [];
    if (systemPrompt) lines.push(`SYSTEM: ${systemPrompt}`);
    for (const m of history) lines.push(`${m.role.toUpperCase()}: ${m.content}`);
    lines.push(`USER: ${prompt}`);

    // First call
    let response = await this.client.responses.create({
      model: overrideModel || this.model,
      input: lines.join('\n'),
      tools: this.getTools(),
    });

    // Tool-use loop
    let guard = 0;
    while (this.hasToolUse(response) && guard < 5) {
      const uses = this.extractToolUses(response);
      const tool_outputs: Array<{ tool_call_id: string; output: string }> = [];
      for (const u of uses) {
        const out = await this.handleToolCall(u.name, u.input);
        tool_outputs.push({ tool_call_id: u.id, output: out });
      }
      response = await this.client.responses.submitToolOutputs(response.id, { tool_outputs });
      guard++;
    }

    return this.extractText(response);
  }
}