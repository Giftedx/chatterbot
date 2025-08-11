import { knowledgeBaseService } from './knowledge-base.service.js';
import { braveWebSearch, contentScrape } from '../mcp/index.js';
import { logger } from '../utils/logger.js';

export interface RetrievalOptions {
  minLocalConfidence?: number;
  maxLocalDocs?: number;
  enableWeb?: boolean;
  webMaxResults?: number;
}

export interface RetrievalContext {
  groundedSnippets: string[];
  citations: Array<{ title?: string; url?: string }>;
  usedWeb: boolean;
}

export class HybridRetrievalService {
  private readonly options: Required<RetrievalOptions>;

  constructor(options: RetrievalOptions = {}) {
    this.options = {
      minLocalConfidence: options.minLocalConfidence ?? 0.6,
      maxLocalDocs: options.maxLocalDocs ?? 3,
      enableWeb: options.enableWeb ?? (process.env.ENABLE_WEB_GROUNDING !== 'false'),
      webMaxResults: options.webMaxResults ?? 3
    };
  }

  public async retrieve(query: string, channelId?: string): Promise<RetrievalContext> {
    // 1) Try local KB
    try {
      const local = await knowledgeBaseService.search({
        query,
        channelId,
        minConfidence: this.options.minLocalConfidence,
        limit: this.options.maxLocalDocs
      });
      if (local.length > 0) {
        return {
          groundedSnippets: local.map(e => `[${e.source}] ${e.content}`),
          citations: local.map(e => ({ title: e.source || 'kb', url: e.sourceUrl || undefined })),
          usedWeb: false
        };
      }
    } catch (err) {
      logger.warn('[HybridRetrieval] Local KB search failed', { error: String(err) });
    }

    // 2) Fallback to web
    if (!this.options.enableWeb) {
      return { groundedSnippets: [], citations: [], usedWeb: false };
    }

    try {
      const web = await braveWebSearch({ query, count: this.options.webMaxResults });
      const results = web.results || [];
      const snippets: string[] = [];
      const citations: Array<{ title?: string; url?: string }> = [];

      for (const r of results.slice(0, this.options.webMaxResults)) {
        try {
          const scraped = await contentScrape({ url: r.url });
          const text = (scraped.content || '').replace(/\s+/g, ' ').slice(0, 800);
          if (text.length > 120) {
            snippets.push(`[web:${r.title}] ${text}`);
            citations.push({ title: r.title, url: r.url });
          }
        } catch (e) {
          logger.debug('[HybridRetrieval] scrape failed, skipping', { url: r.url, error: String(e) });
        }
      }

      return { groundedSnippets: snippets, citations, usedWeb: true };
    } catch (err) {
      logger.warn('[HybridRetrieval] Web search failed', { error: String(err) });
      return { groundedSnippets: [], citations: [], usedWeb: false };
    }
  }
}