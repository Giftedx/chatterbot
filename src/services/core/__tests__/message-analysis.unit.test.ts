import { UnifiedMessageAnalysisService } from '../../core/message-analysis.service.js';

describe('UnifiedMessageAnalysisService - branches', () => {
  const svc = new UnifiedMessageAnalysisService();

  test('extracts URLs, detects intents, maps tools, and sets complexity', async () => {
    const input = 'Please analyze and compare these: https://example.com and https://example.org';
    const result = await svc.analyzeMessage(input, []);

    expect(result.hasUrls).toBe(true);
    expect(result.urls.length).toBeGreaterThanOrEqual(2);
    expect(result.intents).toEqual(expect.arrayContaining(['analysis', 'comparison']));
    expect(result.requiredTools).toEqual(expect.arrayContaining(['complex-reasoning', 'url-processing', 'memory']));
    expect(['moderate', 'complex', 'advanced']).toContain(result.complexity);
  });

  test('attachment types trigger multimodal and analysis', async () => {
    const attachments = [
      { name: 'diagram.png', url: 'https://cdn/diagram.png', contentType: 'image/png' },
      { name: 'notes.pdf', url: 'https://cdn/notes.pdf', contentType: 'application/pdf' },
    ];
    const input = 'summarize and analyze the attached files';
    const result = await svc.analyzeMessage(input, attachments);

    expect(result.hasAttachments).toBe(true);
    expect(new Set(result.attachmentTypes)).toEqual(new Set(['image', 'document']));
    expect(result.needsMultimodal).toBe(true);
    expect(result.requiredTools).toEqual(expect.arrayContaining(['multimodal', 'conversation-thread', 'memory']));
  });

  test('enhanced analysis sets persona/admin/memory/MCP flags when capabilities allow', async () => {
    const capabilities = {
      hasAnalytics: true,
      hasAdminCommands: true,
      hasAdvancedAI: true,
      hasMultimodal: true,
    } as any;
    const input = 'technical summary with analytics stats; please look up and scrape a website';
    const result = await svc.analyzeMessage(input, [], capabilities);

    expect(result.needsPersonaSwitch).toBe(true);
    expect(result.suggestedPersona).toBeDefined();
    expect(result.needsAdminFeatures).toBe(true);
    expect(result.adminCommands.length).toBeGreaterThan(0);
    expect(result.needsMemoryOperation).toBe(false);
    expect(result.needsMCPTools).toBe(true);
    expect(result.mcpRequirements).toEqual(expect.arrayContaining(['webSearch', 'firecrawl']));
  });
});
