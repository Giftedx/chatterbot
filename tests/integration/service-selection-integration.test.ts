
import { CoreIntelligenceService, CoreIntelligenceConfig } from '../../src/services/core-intelligence.service';
import { ReasoningServiceSelector } from '../../src/services/reasoning-service-selector.service';
import { Message, TextBasedChannel, User } from 'discord.js';
import { unifiedMessageAnalysisService } from '../../src/services/core/message-analysis.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Mock dependencies
jest.mock('../../src/services/reasoning-service-selector.service');
jest.mock('../../src/services/core/message-analysis.service');
jest.mock('../../src/services/gemini.service');
jest.mock('../../src/services/unified-cognitive-pipeline.service.js', () => ({
  unifiedCognitivePipeline: {
    execute: jest.fn()
  }
}));

describe('CoreIntelligenceService Service Selection Integration', () => {
  let service: CoreIntelligenceService;
  let mockReasoningSelector: DeepMockProxy<ReasoningServiceSelector>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock reasoning selector
    mockReasoningSelector = mockDeep<ReasoningServiceSelector>();
    (ReasoningServiceSelector as jest.Mock).mockImplementation(() => mockReasoningSelector);

    // Default successful selection
    mockReasoningSelector.selectReasoningService.mockResolvedValue({
      serviceName: 'test-service',
      config: {} as any,
      parameters: {},
      confidence: 0.9,
      reasoning: 'test reasoning',
      fallbacks: []
    });

    // Setup config
    const config: CoreIntelligenceConfig = {
      enableAgenticFeatures: true,
      enablePersonalization: false,
    };

    service = new CoreIntelligenceService(config);
    // Inject the mock selector into the service instance (since it's private/protected we cast to any)
    (service as any).reasoningServiceSelector = mockReasoningSelector;

    // Mock message analysis
    (unifiedMessageAnalysisService.analyzeMessage as jest.Mock).mockResolvedValue({
      confidence: 0.8,
      complexity: 'simple',
      urgency: 'low',
      sentiment: 'neutral',
      topics: [],
      entities: [],
      intents: [],
      requiredTools: [],
      urls: [],
    });
  });

  it('should record successful service usage when processing completes successfully', async () => {
    // Arrange
    const mockMessage = {
      id: '123',
      content: 'test prompt',
      author: { id: 'user1' } as User,
      channelId: 'channel1',
      guildId: 'guild1',
      channel: {
        id: 'channel1',
        isTextBased: () => true,
        isThread: () => false,
        send: jest.fn(),
        sendTyping: jest.fn(),
      } as unknown as TextBasedChannel,
      attachments: new Map(),
      createdTimestamp: Date.now(),
      reply: jest.fn().mockResolvedValue({}),
      toString: () => 'test prompt',
      fetchReference: jest.fn(),
    } as unknown as Message;

    // Mock _processPromptAndGenerateResponse internal call logic
    // Since we want to test the integration inside _generateAgenticResponse which calls recordServiceResult
    // We can trigger handleMessage which calls _processPromptAndGenerateResponse

    // We need to ensure _generateAgenticResponse is reached.
    // We might need to mock some internal methods or ensure state is correct.

    // Mock user capabilities
    jest.spyOn((service as any), '_fetchUserCapabilities').mockResolvedValue({
      canChat: true,
      hasAdminCommands: false
    });

    // Mock user consent
    jest.spyOn((service as any).userConsentService, 'isUserOptedIn').mockResolvedValue(true);
    jest.spyOn((service as any), 'shouldRespond').mockResolvedValue({
        yes: true,
        reason: 'test',
        strategy: 'quick-reply',
        confidence: 1,
        flags: { isDM: false, mentionedBot: false, repliedToBot: false },
    });

    // Mock Gemini generation to succeed
    (service as any).geminiService.generateResponse.mockResolvedValue('Test response');

    // Act
    await service.handleMessage(mockMessage);

    // Assert
    // Check if recordServiceResult was called
    // Note: Since the code is commented out currently, this test is EXPECTED TO FAIL initially.
    expect(mockReasoningSelector.recordServiceResult).toHaveBeenCalledWith(
      'test-service',
      true, // success
      expect.any(Number), // execution time
      expect.any(Number)  // confidence
    );
  });
});
