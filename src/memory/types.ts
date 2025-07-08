/**
 * Personal User Memory System Types
 * Comprehensive type definitions for user memory management
 */

export interface UserMemoryData {
  [key: string]: string | number | boolean;
}

export interface UserPreferences {
  language?: string;
  timezone?: string;
  communicationStyle?: 'formal' | 'casual' | 'technical';
  topics?: string[];
  expertise?: string[];
  helpLevel?: 'beginner' | 'intermediate' | 'expert';
  responseLength?: 'short' | 'medium' | 'detailed';
  includeExamples?: boolean;
  preferredFormats?: string[];
}

export interface UserMemory {
  id?: number;
  userId: string;
  guildId?: string;
  memories: UserMemoryData;
  preferences?: UserPreferences;
  summary?: string;
  lastUpdated: Date;
  memoryCount: number;
  tokenCount: number;
  createdAt?: Date;
}

export interface MemoryExtractionResult {
  memories: UserMemoryData;
  preferences: Partial<UserPreferences>;
  confidence: number;
  extractedFrom: string;
}

export interface MemoryContext {
  userId: string;
  guildId?: string;
  channelId?: string;
  messageContent: string;
  responseContent?: string;
}

export interface MemorySummary {
  memoryCount: number;
  tokenCount: number;
  lastUpdated: Date;
  memoryTypes: string[];
  hasPreferences: boolean;
  summary: string;
}

export interface MemoryPromptContext {
  userProfile: string;
  preferences: UserPreferences;
  contextPrompt: string;
  lastUpdated: Date;
}

// Memory extraction patterns for different types of information
export interface ExtractionPattern {
  type: keyof UserMemoryData | keyof UserPreferences;
  patterns: RegExp[];
  extractor: (match: RegExpMatchArray, context: string) => string | number | boolean;
  confidence: number;
}

// Configuration for memory behavior
export interface MemoryConfig {
  maxMemoriesPerUser: number;
  maxTokensPerUser: number;
  retentionDays: number;
  autoExtractionEnabled: boolean;
  privacyMode: 'minimal' | 'standard' | 'detailed';
  summarizationThreshold: number;
}
