import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getProviderStatuses, modelTelemetryStore } from '../services/advanced-capabilities/index.js';
import { knowledgeBaseService } from '../services/knowledge-base.service.js';

export const diagnosticsCommands = [
  {
    data: new SlashCommandBuilder()
      .setName('ai-status')
      .setDescription('Show AI provider availability, recent model usage, and knowledge base stats'),
    async execute(interaction: ChatInputCommandInteraction) {
      const providers = getProviderStatuses();
      const telemetry = modelTelemetryStore.snapshot(10);
      const kb = await knowledgeBaseService.getStats();
      const lines: string[] = [];
      lines.push('Providers:');
      for (const p of providers) lines.push(`- ${p.name}: ${p.available ? 'available' : 'not set'}`);
      lines.push('\nRecent model usage:');
      for (const t of telemetry) lines.push(`- ${t.provider}/${t.model} in ${Math.round(t.latencyMs)}ms ${t.success ? '✅' : '❌'}`);
      lines.push('\nKnowledge Base:');
      lines.push(`- Total entries: ${kb.totalEntries}`);
      lines.push(`- Avg confidence: ${kb.averageConfidence.toFixed(2)}`);
      lines.push(`- Recent additions (7d): ${kb.recentAdditions}`);
      await interaction.reply({ content: lines.join('\n'), ephemeral: true });
    }
  }
];