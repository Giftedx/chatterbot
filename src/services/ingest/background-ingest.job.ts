import { Client, TextChannel, Message } from 'discord.js';
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
      // Simple ingest: store URL text as content placeholder. Extend with fetch+scrape if needed.
      for (const url of urls) {
        await knowledgeBaseIngestService.addSource(msg.guildId || 'dm', `Shared link`, `URL: ${url}`, url);
      }
    });
  }
}