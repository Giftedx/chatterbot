/**
 * Crawl4AI Web Scraping Service
 * Intelligent web content extraction and scraping with AI-powered cleaning
 * Supports markdown extraction, media processing, and structured data extraction
 */

import { features } from '../config/feature-flags.js';
import { logger } from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface Crawl4AIOptions {
  url: string;
  extractMedia?: boolean;
  extractLinks?: boolean;
  extractText?: boolean;
  cssSelector?: string;
  wordCountThreshold?: number;
  excludeTags?: string[];
  onlyText?: boolean;
  removeUnwantedLines?: boolean;
  timeout?: number;
  userAgent?: string;
  headers?: Record<string, string>;
}

export interface Crawl4AIResult {
  success: boolean;
  url: string;
  title?: string;
  markdown?: string;
  html?: string;
  cleanedHtml?: string;
  media?: {
    images: string[];
    videos: string[];
    audios: string[];
  };
  links?: {
    internal: string[];
    external: string[];
  };
  metadata?: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishDate?: string;
    wordCount?: number;
    language?: string;
  };
  sessionId?: string;
  executionTime?: number;
  error?: string;
}

export interface AdvancedCrawlOptions extends Crawl4AIOptions {
  jsCode?: string;
  waitFor?: string;
  screenshot?: boolean;
  screenshotMode?: 'page' | 'element';
  pdfGeneration?: boolean;
  magicFilter?: boolean;
  removeForms?: boolean;
  onlyMainContent?: boolean;
  simulateUser?: boolean;
  overrideEncoding?: string;
  chunking?: {
    strategy: 'semantic' | 'fixed' | 'sentence' | 'regex';
    chunkSize?: number;
    overlap?: number;
    threshold?: number;
  };
}

export interface WebAccessibilityResult {
  url: string;
  content: string;
  structured: {
    headings: Array<{ level: number; text: string; id?: string }>;
    paragraphs: string[];
    lists: Array<{ type: 'ordered' | 'unordered'; items: string[] }>;
    tables: Array<{ headers: string[]; rows: string[][] }>;
    codeBlocks: Array<{ language?: string; code: string }>;
  };
  accessibility: {
    hasAltTags: boolean;
    hasHeadingStructure: boolean;
    hasFormLabels: boolean;
    colorContrastIssues: number;
    missingLandmarks: string[];
  };
  performance: {
    loadTime: number;
    contentSize: number;
    imageCount: number;
    linkCount: number;
  };
}

export class Crawl4AIWebService {
  private isEnabled: boolean;
  private isInitialized: boolean = false;
  private pythonPath: string;
  private crawl4aiPath: string;

  constructor() {
    this.isEnabled = features.crawl4aiWebAccess;
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.crawl4aiPath = process.env.CRAWL4AI_PATH || 'crawl4ai';
    
    if (this.isEnabled) {
      this.initializeService();
    }
  }

  private async initializeService(): Promise<void> {
    try {
      // Check if crawl4ai is installed
      await execAsync(`${this.pythonPath} -m pip show crawl4ai`);
      this.isInitialized = true;
      logger.info('Crawl4AI web service initialized successfully');
    } catch (error) {
      logger.warn('Crawl4AI not found, attempting installation...');
      await this.installCrawl4AI();
    }
  }

  private async installCrawl4AI(): Promise<void> {
    try {
      logger.info('Installing Crawl4AI...');
      await execAsync(`${this.pythonPath} -m pip install crawl4ai`);
      
      // Install playwright browsers
      await execAsync(`${this.pythonPath} -m playwright install`);
      
      this.isInitialized = true;
      logger.info('Crawl4AI installed successfully');
    } catch (error) {
      logger.error('Failed to install Crawl4AI:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Simple web scraping with basic options
   */
  async crawlUrl(options: Crawl4AIOptions): Promise<Crawl4AIResult> {
    if (!this.isEnabled || !this.isInitialized) {
      return {
        success: false,
        url: options.url,
        error: 'Crawl4AI service not enabled or initialized'
      };
    }

    const startTime = Date.now();

    try {
      const pythonScript = this.generateBasicCrawlScript(options);
      const { stdout, stderr } = await execAsync(`${this.pythonPath} -c "${pythonScript}"`);

      if (stderr && !stderr.includes('WARNING')) {
        throw new Error(stderr);
      }

      const result = JSON.parse(stdout);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        url: options.url,
        title: result.title,
        markdown: result.markdown,
        html: result.html,
        cleanedHtml: result.cleaned_html,
        media: result.media,
        links: result.links,
        metadata: result.metadata,
        executionTime
      };

    } catch (error) {
      logger.error(`Failed to crawl URL ${options.url}:`, error);
      return {
        success: false,
        url: options.url,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Advanced web scraping with AI-powered content extraction
   */
  async advancedCrawl(options: AdvancedCrawlOptions): Promise<Crawl4AIResult> {
    if (!this.isEnabled || !this.isInitialized) {
      return {
        success: false,
        url: options.url,
        error: 'Crawl4AI service not enabled or initialized'
      };
    }

    const startTime = Date.now();

    try {
      const pythonScript = this.generateAdvancedCrawlScript(options);
      const { stdout, stderr } = await execAsync(`${this.pythonPath} -c "${pythonScript}"`);

      if (stderr && !stderr.includes('WARNING')) {
        throw new Error(stderr);
      }

      const result = JSON.parse(stdout);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        url: options.url,
        title: result.title,
        markdown: result.markdown,
        html: result.html,
        cleanedHtml: result.cleaned_html,
        media: result.media,
        links: result.links,
        metadata: result.metadata,
        sessionId: result.session_id,
        executionTime
      };

    } catch (error) {
      logger.error(`Failed to perform advanced crawl for URL ${options.url}:`, error);
      return {
        success: false,
        url: options.url,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Extract structured content with accessibility analysis
   */
  async extractAccessibleContent(url: string, options?: Partial<Crawl4AIOptions>): Promise<WebAccessibilityResult | null> {
    if (!this.isEnabled || !this.isInitialized) {
      logger.error('Crawl4AI service not enabled or initialized');
      return null;
    }

    try {
      const crawlOptions: Crawl4AIOptions = {
        url,
        extractMedia: true,
        extractLinks: true,
        extractText: true,
        onlyText: false,
        removeUnwantedLines: true,
        ...options
      };

      const result = await this.crawlUrl(crawlOptions);
      
      if (!result.success || !result.html) {
        return null;
      }

      return {
        url,
        content: result.markdown || '',
        structured: this.parseStructuredContent(result.html),
        accessibility: this.analyzeAccessibility(result.html),
        performance: {
          loadTime: result.executionTime || 0,
          contentSize: (result.markdown || '').length,
          imageCount: result.media?.images.length || 0,
          linkCount: (result.links?.internal.length || 0) + (result.links?.external.length || 0)
        }
      };

    } catch (error) {
      logger.error(`Failed to extract accessible content from ${url}:`, error);
      return null;
    }
  }

  /**
   * Batch crawl multiple URLs
   */
  async batchCrawl(urls: string[], options?: Partial<Crawl4AIOptions>): Promise<Crawl4AIResult[]> {
    if (!this.isEnabled || !this.isInitialized) {
      return [];
    }

    const results: Crawl4AIResult[] = [];
    const batchSize = 5; // Process in batches to avoid overwhelming

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchPromises = batch.map(url => 
        this.crawlUrl({ url, ...options })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be respectful
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Search and crawl URLs from search results
   */
  async searchAndCrawl(query: string, maxResults: number = 5): Promise<Crawl4AIResult[]> {
    if (!this.isEnabled || !this.isInitialized) {
      return [];
    }

    try {
      // Use a simple search approach - could be enhanced with actual search APIs
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      const searchResult = await this.crawlUrl({
        url: searchUrl,
        cssSelector: 'h3 a',
        extractLinks: true
      });

      if (!searchResult.success || !searchResult.links) {
        return [];
      }

      const urls = searchResult.links.external
        .filter(url => !url.includes('google.com'))
        .slice(0, maxResults);

      return await this.batchCrawl(urls);

    } catch (error) {
      logger.error(`Failed to search and crawl for query "${query}":`, error);
      return [];
    }
  }

  private generateBasicCrawlScript(options: Crawl4AIOptions): string {
    return `
import json
import asyncio
from crawl4ai import AsyncWebCrawler

async def crawl():
    async with AsyncWebCrawler(verbose=True) as crawler:
        result = await crawler.arun(
            url="${options.url}",
            word_count_threshold=${options.wordCountThreshold || 1},
            extract_media=${options.extractMedia || false},
            extract_links=${options.extractLinks || false},
            css_selector="${options.cssSelector || ''}",
            exclude_tags=${JSON.stringify(options.excludeTags || [])},
            only_text=${options.onlyText || false},
            remove_unwanted_lines=${options.removeUnwantedLines || true}
        )
        
        output = {
            'title': result.metadata.get('title', ''),
            'markdown': result.markdown,
            'html': result.html,
            'cleaned_html': result.cleaned_html,
            'media': {
                'images': result.media.get('images', []),
                'videos': result.media.get('videos', []),
                'audios': result.media.get('audios', [])
            },
            'links': {
                'internal': result.links.get('internal', []),
                'external': result.links.get('external', [])
            },
            'metadata': {
                'description': result.metadata.get('description', ''),
                'keywords': result.metadata.get('keywords', []),
                'author': result.metadata.get('author', ''),
                'language': result.metadata.get('language', ''),
                'word_count': len(result.markdown.split()) if result.markdown else 0
            }
        }
        print(json.dumps(output))

asyncio.run(crawl())
`.replace(/\n/g, '\\n').replace(/"/g, '\\"');
  }

  private generateAdvancedCrawlScript(options: AdvancedCrawlOptions): string {
    return `
import json
import asyncio
from crawl4ai import AsyncWebCrawler
from crawl4ai.extraction_strategy import LLMExtractionStrategy

async def crawl():
    async with AsyncWebCrawler(verbose=True) as crawler:
        extraction_strategy = None
        if ${options.magicFilter || false}:
            extraction_strategy = LLMExtractionStrategy(
                provider="openai/gpt-4o-mini",
                api_token="${process.env.OPENAI_API_KEY || ''}",
                instruction="Extract main content and key information"
            )
        
        result = await crawler.arun(
            url="${options.url}",
            js_code="${options.jsCode || ''}",
            wait_for="${options.waitFor || ''}",
            screenshot=${options.screenshot || false},
            pdf=${options.pdfGeneration || false},
            magic_filter=${options.magicFilter || false},
            remove_forms=${options.removeForms || false},
            only_main_content=${options.onlyMainContent || false},
            simulate_user=${options.simulateUser || false},
            override_encoding="${options.overrideEncoding || ''}",
            extraction_strategy=extraction_strategy
        )
        
        output = {
            'title': result.metadata.get('title', ''),
            'markdown': result.markdown,
            'html': result.html,
            'cleaned_html': result.cleaned_html,
            'media': {
                'images': result.media.get('images', []),
                'videos': result.media.get('videos', []),
                'audios': result.media.get('audios', [])
            },
            'links': {
                'internal': result.links.get('internal', []),
                'external': result.links.get('external', [])
            },
            'metadata': result.metadata,
            'session_id': result.session_id
        }
        print(json.dumps(output))

asyncio.run(crawl())
`.replace(/\n/g, '\\n').replace(/"/g, '\\"');
  }

  private parseStructuredContent(html: string): WebAccessibilityResult['structured'] {
    // Basic HTML parsing for structured content
    const headings: Array<{ level: number; text: string; id?: string }> = [];
    const paragraphs: string[] = [];
    const lists: Array<{ type: 'ordered' | 'unordered'; items: string[] }> = [];
    const tables: Array<{ headers: string[]; rows: string[][] }> = [];
    const codeBlocks: Array<{ language?: string; code: string }> = [];

    // Extract headings (h1-h6)
    const headingRegex = /<h([1-6])[^>]*(?:id="([^"]*)")?[^>]*>(.*?)<\/h[1-6]>/gi;
    let headingMatch;
    while ((headingMatch = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(headingMatch[1]),
        text: headingMatch[3].replace(/<[^>]*>/g, ''),
        id: headingMatch[2]
      });
    }

    // Extract paragraphs
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
    let paragraphMatch;
    while ((paragraphMatch = paragraphRegex.exec(html)) !== null) {
      const text = paragraphMatch[1].replace(/<[^>]*>/g, '').trim();
      if (text.length > 0) {
        paragraphs.push(text);
      }
    }

    return {
      headings,
      paragraphs,
      lists,
      tables,
      codeBlocks
    };
  }

  private analyzeAccessibility(html: string): WebAccessibilityResult['accessibility'] {
    return {
      hasAltTags: /<img[^>]+alt=["'][^"']*["']/i.test(html),
      hasHeadingStructure: /<h[1-6]/i.test(html),
      hasFormLabels: /<label[^>]*for=["'][^"']*["']/i.test(html),
      colorContrastIssues: 0, // Would need more sophisticated analysis
      missingLandmarks: [] // Would need more sophisticated analysis
    };
  }

  /**
   * Clean and normalize extracted content
   */
  normalizeContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
      .trim();
  }

  /**
   * Extract key information using patterns
   */
  extractKeyInfo(content: string): {
    emails: string[];
    phones: string[];
    dates: string[];
    prices: string[];
    addresses: string[];
  } {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
    const dateRegex = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g;
    const priceRegex = /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;
    
    return {
      emails: content.match(emailRegex) || [],
      phones: content.match(phoneRegex) || [],
      dates: content.match(dateRegex) || [],
      prices: content.match(priceRegex) || [],
      addresses: [] // Would need more sophisticated analysis
    };
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    enabled: boolean;
    initialized: boolean;
    pythonPath: string;
  } {
    return {
      enabled: this.isEnabled,
      initialized: this.isInitialized,
      pythonPath: this.pythonPath
    };
  }
}

// Singleton instance
export const crawl4aiWebService = new Crawl4AIWebService();