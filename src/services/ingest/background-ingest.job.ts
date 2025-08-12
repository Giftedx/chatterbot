import { Client, Message } from 'discord.js';
import { knowledgeBaseIngestService } from '../knowledge-base-ingest.service.js';

export class BackgroundIngestJob {
  private client: Client;
  private channelId?: string;
  constructor(client: Client, channelId?: string) {
    this.client = client;
    this.channelId = channelId || process.env.KB_INGEST_CHANNEL_ID;
  }
  start() {
    if (!this.channelId) return;
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
        } catch {}
      }
    });
  }
}