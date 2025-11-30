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

/**
 * Options for a standard crawl operation.
 */
export interface Crawl4AIOptions {
  /** The target URL to crawl. */
  url: string;
  /** Whether to extract media (images, video, audio). */
  extractMedia?: boolean;
  /** Whether to extract internal and external links. */
  extractLinks?: boolean;
  /** Whether to extract textual content. */
  extractText?: boolean;
  /** CSS selector to limit extraction scope. */
  cssSelector?: string;
  /** Minimum word count to consider content valid. */
  wordCountThreshold?: number;
  /** HTML tags to exclude from extraction. */
  excludeTags?: string[];
  /** If true, returns only text content without HTML. */
  onlyText?: boolean;
  /** Whether to remove noisy lines from output. */
  removeUnwantedLines?: boolean;
  /** Crawl timeout in milliseconds. */
  timeout?: number;
  /** Custom user agent string. */
  userAgent?: string;
  /** Custom HTTP headers. */
  headers?: Record<string, string>;
}

/**
 * The structured result of a crawl operation.
 */
export interface Crawl4AIResult {
  /** True if the crawl completed successfully. */
  success: boolean;
  /** The processed URL. */
  url: string;
  /** Extracted page title. */
  title?: string;
  /** Extracted content converted to Markdown. */
  markdown?: string;
  /** Raw HTML content. */
  html?: string;
  /** Sanitized HTML content. */
  cleanedHtml?: string;
  /** Extracted media resources. */
  media?: {
    images: string[];
    videos: string[];
    audios: string[];
  };
  /** Extracted hyperlinks. */
  links?: {
    internal: string[];
    external: string[];
  };
  /** Page metadata. */
  metadata?: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishDate?: string;
    wordCount?: number;
    language?: string;
  };
  /** Session ID for the crawl (if applicable). */
  sessionId?: string;
  /** Time taken to execute the crawl in ms. */
  executionTime?: number;
  /** Error message if the crawl failed. */
  error?: string;
}

/**
 * Extended options for advanced crawling scenarios involving dynamic content.
 */
export interface AdvancedCrawlOptions extends Crawl4AIOptions {
  /** Custom JavaScript code to execute on the page. */
  jsCode?: string;
  /** CSS selector or timeout to wait for before extraction. */
  waitFor?: string;
  /** Whether to capture a screenshot. */
  screenshot?: boolean;
  /** Screenshot capture mode. */
  screenshotMode?: 'page' | 'element';
  /** Whether to generate a PDF of the page. */
  pdfGeneration?: boolean;
  /** Use AI-based filtering to extract relevant content. */
  magicFilter?: boolean;
  /** Whether to remove form elements. */
  removeForms?: boolean;
  /** Whether to try extracting only the main article content. */
  onlyMainContent?: boolean;
  /** Whether to simulate user interactions (mouse moves, scrolls). */
  simulateUser?: boolean;
  /** Force a specific encoding. */
  overrideEncoding?: string;
  /** Configuration for splitting text into chunks. */
  chunking?: {
    strategy: 'semantic' | 'fixed' | 'sentence' | 'regex';
    chunkSize?: number;
    overlap?: number;
    threshold?: number;
  };
}

/**
 * Result of an accessibility and structure analysis.
 */
export interface WebAccessibilityResult {
  /** The analyzed URL. */
  url: string;
  /** The text content. */
  content: string;
  /** Hierarchical structure of the page. */
  structured: {
    headings: Array<{ level: number; text: string; id?: string }>;
    paragraphs: string[];
    lists: Array<{ type: 'ordered' | 'unordered'; items: string[] }>;
    tables: Array<{ headers: string[]; rows: string[][] }>;
    codeBlocks: Array<{ language?: string; code: string }>;
  };
  /** Accessibility compliance metrics. */
  accessibility: {
    hasAltTags: boolean;
    hasHeadingStructure: boolean;
    hasFormLabels: boolean;
    colorContrastIssues: number;
    missingLandmarks: string[];
  };
  /** Page performance metrics. */
  performance: {
    loadTime: number;
    contentSize: number;
    imageCount: number;
    linkCount: number;
  };
}

/**
 * Service for intelligent web scraping and content extraction.
 *
 * Leverages `crawl4ai` (Python) via child process execution to perform
 * advanced crawling tasks including:
 * - Dynamic JS rendering.
 * - AI-powered content cleaning and extraction.
 * - Accessibility analysis.
 * - Screenshot and PDF generation.
 */
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
   * Performs a basic crawl of a URL using standard settings.
   *
   * @param options - Basic crawl configuration.
   * @returns The crawl result including content and metadata.
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
   * Executes an advanced crawl with features like JS execution, screenshots, and AI filtering.
   *
   * @param options - Advanced configuration options.
   * @returns The comprehensive crawl result.
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
   * Analyzes a webpage for structured content and accessibility compliance.
   *
   * @param url - The URL to analyze.
   * @param options - Optional overrides for the underlying crawl.
   * @returns Structured content and accessibility metrics, or null on failure.
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
   * Crawls a list of URLs in batches to respect rate limits and resources.
   *
   * @param urls - List of URLs to process.
   * @param options - Common options applied to all URLs.
   * @returns Array of crawl results.
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
   * Performs a web search and crawls the top results.
   *
   * @param query - The search query string.
   * @param maxResults - Maximum number of search results to process.
   * @returns Array of crawl results from the found pages.
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
   * sanitizes and formats extracted text content.
   *
   * @param content - Raw text content.
   * @returns Normalized text with consistent spacing.
   */
  normalizeContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
      .trim();
  }

  /**
   * Uses regex patterns to identify structured data entities within text.
   *
   * @param content - The text to analyze.
   * @returns Object containing lists of found entities (emails, phones, etc.).
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
   * Reports the operational status of the service and its dependencies.
   * @returns Health status object.
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