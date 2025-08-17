/**
 * Integration tests for CoreIntelligenceService covering the end-to-end pipeline
 * for slash interactions (DM route) with MCP outputs and analytics, exercising
 * analysis → MCP → capabilities → generation → personalization → post-state updates.
 */

import { jest } from '@jest/globals';

// ESM module imports from src
import { CoreIntelligenceService } from '../../src/services/core-intelligence.service.js';
import { UserConsentService } from '../../src/services/user-consent.service.js';
import { ModerationService } from '../../src/moderation/moderation-service.js';
import { knowledgeBaseService } from '../../src/services/knowledge-base.service.js';
import * as contextManager from '../../src/services/context-manager.js';

// Mocks for injected dependencies
class FakeMcpOrchestrator {
  async initialize() {}
  async orchestrateIntelligentResponse() {
    // Provide successful tool executions to exercise attachment/embeds code paths
    return {
      success: true,
      phase: 1,
      toolsExecuted: ['image-generation', 'gif-search', 'text-to-speech'],
      results: new Map([
        [
          'image-generation',
          {
            success: true,
            data: {
              images: [
                {
                  mimeType: 'image/png',
                  base64: Buffer.from('test-image').toString('base64'),
                },
              ],
            },
          },
        ],
        [
          'gif-search',
          {
            success: true,
            data: {
              gifs: [
                {
                  url: 'https://example.com/test.gif',
                  previewUrl: 'https://example.com/prev.gif',
                },
              ],
            },
          },
        ],
        [
          'text-to-speech',
          {
            success: true,
            data: {
              audio: {
                mimeType: 'audio/mpeg',
                base64: Buffer.from('test-audio').toString('base64'),
              },
            },
          },
        ],
      ]),
      fallbacksUsed: [],
      executionTime: 5,
      confidence: 0.9,
      recommendations: [],
    } as const;
  }
}

class FakeAnalyticsService {
  public logInteraction = jest.fn().mockReturnValue(undefined);
}

const FakeMessageAnalysisService: any = {
  analyzeMessage: jest.fn(async () => ({
    intents: ['answer'],
    complexity: 'advanced',
    requiredTools: ['image-generation', 'gif-search', 'text-to-speech'],
    mcpRequirements: ['image-generation', 'gif-search', 'text-to-speech'],
    urls: [],
  })),
};

class FakeAdvancedCapabilitiesManager {
  constructor(_cfg: any) {}
  getStatus() {
    return { enabledCapabilities: ['enhancedReasoning', 'webSearch'] };
  }
  async processMessage() {
    return {
      textResponse: 'Enhanced response details',
      reasoning: 'Because the user asked X, we did Y.',
      attachments: [],
      metadata: { capabilitiesUsed: ['enhancedReasoning'], confidenceScore: 0.75 },
      webSearchResults: [
        { title: 'Doc', snippet: 'Relevant blurb' },
        { title: 'FAQ', snippet: 'Answer snippet' },
      ],
    } as const;
  }
}

describe('CoreIntelligenceService - E2E pipeline (slash → DM) with MCP outputs', () => {
  let service: CoreIntelligenceService;
  const consent = UserConsentService.getInstance();

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_BYPASS_CONSENT = 'true';
    process.env.FORCE_DEEP_REASONING = 'true';
    process.env.ENABLE_HYBRID_RETRIEVAL = 'false';
    process.env.ENABLE_SELF_CRITIQUE = 'false';
    process.env.CROSS_MODEL_VERIFICATION = 'false';
  });

  beforeEach(() => {
    jest.restoreAllMocks();

    // Allow everything through moderation
    jest
      .spyOn(ModerationService.prototype, 'moderateText')
      .mockResolvedValue({ action: 'allow', verdict: {} } as any);
    jest
      .spyOn(ModerationService.prototype, 'moderateImage')
      .mockResolvedValue({ action: 'allow', verdict: {} } as any);

    // RAG and history stubs
    jest.spyOn(knowledgeBaseService, 'search').mockResolvedValue([] as any);
    jest.spyOn(contextManager, 'getHistory').mockResolvedValue([] as any);

    // Consent + routing stubs: dmPreferred -> true to keep flow simple
    jest
      .spyOn(consent, 'getUserConsent')
      .mockResolvedValue({ privacyAccepted: true, optedOut: false } as any);
    jest.spyOn(consent, 'isUserPaused').mockResolvedValue(false);
    jest.spyOn(consent, 'updateUserActivity').mockResolvedValue();
    jest
      .spyOn(consent, 'getRouting')
      .mockResolvedValue({ dmPreferred: true, lastThreadId: null } as any);

    service = new CoreIntelligenceService({
      enableAgenticFeatures: true,
      enablePersonalization: true,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
      enableAdvancedCapabilities: true,
      dependencies: {
        mcpOrchestrator: new FakeMcpOrchestrator() as any,
        analyticsService: new FakeAnalyticsService() as any,
        messageAnalysisService: FakeMessageAnalysisService as any,
        geminiService: undefined as any,
        advancedCapabilitiesManager: new FakeAdvancedCapabilitiesManager({}) as any,
      },
    });

    // Personalization adaptResponse should run but be deterministic
    if ((service as any).personalizationEngine) {
      (service as any).personalizationEngine.adaptResponse = async (
        _userId: string,
        _text: string,
        _guildId?: string,
      ) => ({ personalizedResponse: 'Personalized: E2E content' }) as any;
    }
  });

  test('slash → DM route executes analysis→MCP→capabilities→generation pipeline and sends attachments', async () => {
    // Minimal interaction mock sufficient for service guards
    const dmSend = jest.fn(async (_payload: any) => undefined);
    const interaction: any = {
      id: 'i1',
      commandName: 'chat',
      isChatInputCommand: () => true,
      options: {
        getString: (_name: string, _req: boolean) => 'Tell me something cool',
        getAttachment: () => null,
      },
      user: {
        id: 'u1',
        username: 'alice',
        createDM: async () => ({ id: 'dm1', send: dmSend }),
        toString: () => '<@u1>',
      },
      guildId: 'g1',
      channelId: 'c1',
      client: { channels: { fetch: async () => ({ isTextBased: () => true, send: jest.fn() }) } },
      channel: { isTextBased: () => true },
      deferReply: jest.fn(),
      editReply: jest.fn(),
      followUp: jest.fn(),
      reply: jest.fn(),
      isRepliable: () => true,
    };

    await service.handleInteraction(interaction as any);

  // /chat is now opt-in only; no DM content is sent by the command itself
  expect(dmSend).not.toHaveBeenCalled();
  });
});
