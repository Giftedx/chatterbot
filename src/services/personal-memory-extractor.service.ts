import { UserMemoryService } from '../memory/user-memory.service.js';
import { logger } from '../utils/logger.js';

export interface ExtractorOptions {
  enabled?: boolean;
  minConfidence?: number;
}

export class PersonalMemoryExtractorService {
  private readonly memory: UserMemoryService;
  private readonly options: Required<ExtractorOptions>;

  constructor(memoryService?: UserMemoryService, options: ExtractorOptions = {}) {
    this.memory = memoryService ?? new UserMemoryService();
    this.options = {
      enabled: options.enabled ?? (process.env.ENABLE_AUTO_MEMORY === 'true'),
      minConfidence: options.minConfidence ?? 0.6
    };
  }

  public async extractFromInteraction(
    userId: string,
    guildId: string | null,
    userPrompt: string,
    assistantResponse: string
  ): Promise<void> {
    if (!this.options.enabled) return;

    try {
      const candidates: Array<{ kind: 'PREF' | 'FACT' | 'RELATIONSHIP' | 'STYLE'; content: string; confidence: number }> = [];

      // Simple regex/heuristics; can be upgraded to LLM extraction later
      const nameMatch = userPrompt.match(/my name is ([A-Za-z][A-Za-z\-\s]{1,40})/i);
      if (nameMatch) candidates.push({ kind: 'FACT', content: `User name is ${nameMatch[1].trim()}.`, confidence: 0.9 });

      const pronounMatch = userPrompt.match(/my pronouns? (are|is) ([a-zA-Z/]{2,8})/i);
      if (pronounMatch) candidates.push({ kind: 'FACT', content: `User pronouns: ${pronounMatch[2].toLowerCase()}.`, confidence: 0.9 });

      const preferDm = /prefer (dm|direct messages)/i.test(userPrompt) || /talk in dm/i.test(userPrompt);
      if (preferDm) candidates.push({ kind: 'PREF', content: `Prefers DM for replies.`, confidence: 0.8 });

      const styleHint = assistantResponse.match(/I will keep replies (concise|detailed|casual|formal)/i);
      if (styleHint) candidates.push({ kind: 'STYLE', content: `Prefers ${styleHint[1].toLowerCase()} style.`, confidence: 0.7 });

      const projectMatch = userPrompt.match(/working on (a |the |my )?([\w\-\s]{3,60})/i);
      if (projectMatch) candidates.push({ kind: 'NOTE', content: `Current project: ${projectMatch[2].trim()}.`, confidence: 0.6 } as any);

      const filtered = candidates.filter(c => c.confidence >= this.options.minConfidence);
      if (filtered.length === 0) return;

      for (const c of filtered) {
        try {
          // Map to existing JSON-based memory structure
          const memories: any = {};
          if (c.kind === 'FACT' && c.content.toLowerCase().includes('user name is')) {
            memories.name = c.content.replace(/^User name is\s+/i, '').replace(/\.$/, '');
          } else if (c.kind === 'FACT' && c.content.toLowerCase().includes('pronouns:')) {
            memories.pronouns = c.content.split(':')[1]?.trim();
          } else if (c.kind === 'PREF' && /prefers dm/.test(c.content.toLowerCase())) {
            memories.dmPreferred = true;
          } else if (c.kind === 'STYLE') {
            memories.communicationStyle = c.content.replace(/^Prefers\s+/i, '').replace(/\s+style\.$/, '');
          } else if ((c as any).kind === 'NOTE') {
            memories.currentProject = c.content.replace(/^Current project:\s+/i, '').replace(/\.$/, '');
          }
          await this.memory.updateUserMemory(userId, memories, {}, guildId ?? undefined);

        } catch (e) {
          logger.debug('[PersonalMemoryExtractor] Skipped storing memory', { error: String(e), kind: c.kind });
        }
      }
    } catch (error) {
      logger.warn('[PersonalMemoryExtractor] Extraction failed', { error: String(error) });
    }
  }
}