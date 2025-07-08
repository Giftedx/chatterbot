/**
 * Memory Extraction Service
 * Intelligent extraction of user preferences and information from conversations
 */

import { MemoryExtractionResult, MemoryContext, ExtractionPattern, UserMemoryData, UserPreferences } from './types.js';
import { logger } from '../utils/logger.js';

/**
 * Service for extracting user memories and preferences from conversation content
 */
export class MemoryExtractionService {
  private readonly extractionPatterns: ExtractionPattern[];

  constructor() {
    this.extractionPatterns = this.initializeExtractionPatterns();
  }

  /**
   * Extract memories and preferences from conversation context
   */
  public extractFromConversation(context: MemoryContext): MemoryExtractionResult {
    const memories: UserMemoryData = {};
    const preferences: Partial<UserPreferences> = {};
    let totalConfidence = 0;
    let patternMatches = 0;

    const fullContent = `${context.messageContent} ${context.responseContent || ''}`;

    for (const pattern of this.extractionPatterns) {
      for (const regex of pattern.patterns) {
        const matches = fullContent.match(regex);
        if (matches) {
          try {
            const extracted = pattern.extractor(matches, fullContent);
            if (extracted !== null && extracted !== undefined) {
              if (pattern.type in { language: true, timezone: true, communicationStyle: true, topics: true, expertise: true, helpLevel: true, responseLength: true, includeExamples: true, preferredFormats: true }) {
                // It's a preference
                (preferences as Record<string, unknown>)[pattern.type] = extracted;
              } else {
                // It's a memory
                memories[pattern.type] = extracted;
              }
              totalConfidence += pattern.confidence;
              patternMatches++;
            }
          } catch (error) {
            logger.warn('Memory extraction pattern failed', {
              operation: 'memory-extraction',
              metadata: {
                pattern: pattern.type,
                error: String(error),
                userId: context.userId
              }
            });
          }
        }
      }
    }

    const averageConfidence = patternMatches > 0 ? totalConfidence / patternMatches : 0;

    logger.debug('Memory extraction completed', {
      operation: 'memory-extraction',
      userId: context.userId,
      metadata: {
        memoriesExtracted: Object.keys(memories).length,
        preferencesExtracted: Object.keys(preferences).length,
        confidence: averageConfidence,
        patternMatches
      }
    });

    return {
      memories,
      preferences,
      confidence: averageConfidence,
      extractedFrom: fullContent.substring(0, 100) + '...'
    };
  }

  /**
   * Initialize extraction patterns for different types of user information
   */
  private initializeExtractionPatterns(): ExtractionPattern[] {
    return [
      // Name extraction
      {
        type: 'name',
        patterns: [
          /(?:my name is|i'm|i am|call me|known as)\s+([a-zA-Z]+)/i,
          /(?:^|\s)([A-Z][a-z]+)(?:\s+speaking|here|$)/
        ],
        extractor: (match) => match[1],
        confidence: 0.8
      },

      // Programming languages and technologies
      {
        type: 'programmingLanguages',
        patterns: [
          /(?:i (?:use|work with|code in|program in|develop with|know))\s+([^.!?]+?)(?:\s+(?:language|programming|development)|[.!?]|$)/i,
          /(?:i'?m? (?:working on|building|developing))\s+(?:a\s+)?([^.!?]+?)(?:\s+(?:project|application|app|website|system)|[.!?]|$)/i,
          /(?:expert in|good at|experienced with|familiar with)\s+([^.!?]+?)(?:\s+(?:programming|development)|[.!?]|$)/i
        ],
        extractor: (match) => match[1].trim(),
        confidence: 0.7
      },

      // Location/Timezone
      {
        type: 'location',
        patterns: [
          /(?:i'm (?:from|in|located in|based in|living in))\s+([^.!?]+)/i,
          /(?:my (?:timezone|time zone) is)\s+([^.!?]+)/i
        ],
        extractor: (match) => match[1].trim(),
        confidence: 0.9
      },

      // Communication style preferences
      {
        type: 'communicationStyle',
        patterns: [
          /(?:i prefer|i like|please be|can you be)\s+(?:more\s+)?(formal|casual|technical|simple|detailed|brief|concise)/i,
          /(?:explain (?:things\s+)?(?:in a\s+)?(simple|technical|detailed|basic)\s+way)/i
        ],
        extractor: (match) => {
          const style = match[1].toLowerCase();
          if (['formal'].includes(style)) return 'formal';
          if (['technical', 'detailed'].includes(style)) return 'technical';
          if (['simple', 'basic', 'casual'].includes(style)) return 'casual';
          return style as 'formal' | 'casual' | 'technical';
        },
        confidence: 0.6
      },

      // Expertise level
      {
        type: 'helpLevel',
        patterns: [
          /(?:i'm (?:a\s+)?(?:complete\s+)?(beginner|novice|intermediate|advanced|expert))/i,
          /(?:i (?:have|am)\s+(?:a\s+)?(beginner|basic|intermediate|advanced|expert)\s+(?:level|understanding|knowledge))/i,
          /(?:please explain (?:like|as if)\s+i'm\s+(?:a\s+)?(beginner|novice|expert))/i
        ],
        extractor: (match) => {
          const level = match[1].toLowerCase();
          if (['beginner', 'novice', 'basic'].includes(level)) return 'beginner';
          if (['intermediate'].includes(level)) return 'intermediate';
          if (['advanced', 'expert'].includes(level)) return 'expert';
          return 'intermediate';
        },
        confidence: 0.7
      },

      // Response length preference
      {
        type: 'responseLength',
        patterns: [
          /(?:keep (?:it|responses?|answers?)\s+)(short|brief|concise|detailed|long|comprehensive)/i,
          /(?:i (?:prefer|like|want)\s+)(short|brief|detailed|long|comprehensive)\s+(?:answers?|responses?|explanations?)/i,
          /(?:prefer\s+)(short|brief|detailed|long|comprehensive)\s+(?:answers?|responses?|explanations?)/i
        ],
        extractor: (match) => {
          const length = match[1].toLowerCase();
          if (['short', 'brief', 'concise'].includes(length)) return 'short';
          if (['detailed', 'long', 'comprehensive'].includes(length)) return 'detailed';
          return 'medium';
        },
        confidence: 0.6
      },

      // Current project or work
      {
        type: 'currentProject',
        patterns: [
          /(?:i'm (?:working on|building|developing|creating))\s+([^.!?]+)/i,
          /(?:my (?:current\s+)?project is)\s+([^.!?]+)/i
        ],
        extractor: (match) => match[1].trim(),
        confidence: 0.5
      },

      // Learning interests
      {
        type: 'learningGoals',
        patterns: [
          /(?:i'm (?:trying to\s+learn|learning|studying))\s+([^.!?]+)/i,
          /(?:i want to\s+(?:learn|understand|get better at))\s+([^.!?]+)/i
        ],
        extractor: (match) => match[1].trim(),
        confidence: 0.6
      },

      // Company or role
      {
        type: 'role',
        patterns: [
          /(?:i'm (?:a\s+)?(?:working as\s+a\s+)?)(developer|engineer|programmer|designer|student|teacher|manager|analyst)/i,
          /(?:i work (?:as\s+(?:a\s+)?)?)(developer|engineer|programmer|designer|student|teacher|manager|analyst)/i
        ],
        extractor: (match) => match[1],
        confidence: 0.7
      }
    ];
  }

  /**
   * Extract specific memory type from text using custom patterns
   */
  public extractSpecific(text: string, memoryType: string): string | null {
    const pattern = this.extractionPatterns.find(p => p.type === memoryType);
    if (!pattern) return null;

    for (const regex of pattern.patterns) {
      const match = text.match(regex);
      if (match) {
        try {
          return String(pattern.extractor(match, text));
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Get extraction confidence for a given text
   */
  public getExtractionConfidence(text: string): number {
    let totalConfidence = 0;
    let matches = 0;

    for (const pattern of this.extractionPatterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(text)) {
          totalConfidence += pattern.confidence;
          matches++;
        }
      }
    }

    return matches > 0 ? totalConfidence / matches : 0;
  }
}
