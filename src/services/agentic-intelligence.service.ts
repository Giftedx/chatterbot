export class AgenticIntelligenceService {
  private static instance: AgenticIntelligenceService | null = null;
  static getInstance(): AgenticIntelligenceService {
    if (!this.instance) this.instance = new AgenticIntelligenceService();
    return this.instance;
  }

  // Minimal surface so tests that mock this do not break
  async handleQuery(_input: unknown): Promise<unknown> {
    return {};
  }
}

export const agenticIntelligenceService = AgenticIntelligenceService.getInstance();
