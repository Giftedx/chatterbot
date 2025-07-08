/**
 * Enhanced Intelligence Service Types
 * Common interfaces and types used across enhanced intelligence modules
 */

export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  toolUsed: string;
  requiresExternalMCP?: boolean;
  fallbackMode?: boolean;
}

export interface MessageAnalysis {
  hasAttachments: boolean;
  hasUrls: boolean;
  attachmentTypes: string[];
  urls: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  intents: string[];
  requiredTools: string[];
}

export interface ProcessingContext {
  userId: string;
  channelId: string;
  guildId: string | null;
  analysis: MessageAnalysis;
  results: Map<string, unknown>;
  errors: string[];
}

export interface MemoryEntry {
  userId: string;
  channelId: string;
  timestamp: Date;
  prompt: string;
  response: string;
  toolsUsed: string[];
  analysis: MessageAnalysis;
}

export interface AttachmentInfo {
  name: string;
  url: string;
  contentType?: string;
}

export interface PersonaInfo {
  systemPrompt: string;
  name?: string;
}
