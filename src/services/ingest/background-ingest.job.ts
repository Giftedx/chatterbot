import { Client, Message } from 'discord.js';
import { knowledgeBaseIngestService } from '../knowledge-base-ingest.service.js';
import { knowledgeBaseService } from '../knowledge-base.service.js';
import { logger } from '../../utils/logger.js';

export class BackgroundIngestJob {
  private client: Client;
  private channelId?: string;
  private consolidateTimer?: NodeJS.Timeout;

  constructor(client: Client, channelId?: string) {
    this.client = client;
    this.channelId = channelId || process.env.KB_INGEST_CHANNEL_ID;
  }

  start() {
    if (this.channelId) {
      this.client.on('messageCreate', async (msg: Message) => {
        if (msg.author.bot) return;
        if (msg.channelId !== this.channelId) return;
        const urls = (msg.content.match(/https?:\/\/[^\s]+/g) || []);
        if (urls.length === 0) return;
        for (const url of urls) {
          try {
            // Try Firecrawl MCP if available
            let content = `URL: ${url}`;
            try {
              const { contentScrape } = await import('../../mcp/index.js');
              const res = await contentScrape({ url });
              if (res?.content) content = res.content.substring(0, 100_000); // cap for safety
            } catch {}
            await knowledgeBaseIngestService.addSource(msg.guildId || 'dm', `Ingested: ${new URL(url).hostname}`, content, url);
          } catch (err) {
            logger.warn('Background ingest failed', { error: String(err) });
          }
        }
      });
    }

    // Memory consolidation scheduler (every 60 minutes by default)
    const intervalMs = Number(process.env.MEMORY_CONSOLIDATION_INTERVAL || 60 * 60 * 1000);
    this.consolidateTimer = setInterval(async () => {
      try {
        const { AdvancedMemoryManager } = await import('../advanced-memory/advanced-memory-manager.service.js');
        // If there is a central orchestrator/core instance to pull from, we could inject it here.
        // For now, this triggers vector cleanup placeholder and logs stats.
        logger.info('Running periodic memory consolidation');
        // Vector cleanup placeholder: in future, remove low-confidence entries or stale vectors
      } catch (err) {
        logger.warn('Consolidation scheduler error', { error: String(err) });
      }
    }, intervalMs).unref();
  }
}