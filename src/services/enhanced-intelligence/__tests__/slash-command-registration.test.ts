import { 
  EnhancedInvisibleIntelligenceService, 
  createEnhancedInvisibleIntelligenceService 
} from '../index.js';

// Ensure discord.js is mocked via manual __mocks__

describe('Enhanced Intelligence slash command registration', () => {
  it('creates slash command with expected description', () => {
    const service = createEnhancedInvisibleIntelligenceService();
    const cmd = service.createSlashCommand();

    expect(cmd.name).toBe('chat');
    expect(cmd.description).toBe('Opt into enhanced AI conversation with images, research and more');
  });
});
