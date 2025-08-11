/**
 * Speech Generation Service
 * 
 * Converts text to speech and generates audio files compatible with Discord.
 * Supports multiple TTS providers with voice customization and emotion.
 */

import { logger } from '../../utils/logger.js';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface SpeechGenerationRequest {
  text: string;
  voice: string;
  speed: number;
  emotion: string;
  userId: string;
  format?: 'mp3' | 'wav' | 'ogg';
  quality?: 'standard' | 'high';
}

export interface SpeechGenerationResult {
  success: boolean;
  audioUrl?: string;
  audioBuffer?: Buffer;
  metadata: {
    text: string;
    voice: string;
    emotion: string;
    duration: number;
    generationTime: number;
    provider: string;
    fileSize?: number;
  };
  error?: string;
}

export interface SpeechProvider {
  name: string;
  available: boolean;
  generateSpeech(request: SpeechGenerationRequest): Promise<SpeechGenerationResult>;
  getAvailableVoices(): Promise<string[]>;
}

export class SpeechGenerationService {
  private providers: SpeechProvider[] = [];
  private cache = new Map<string, SpeechGenerationResult>();
  private rateLimits = new Map<string, { count: number; resetTime: number }>();
  private tempDir = '/tmp/speech-generation';

  // Voice preferences by emotion
  private emotionVoices = {
    'happy': { mood: 'cheerful', pitch: '+20%', rate: '1.1' },
    'sad': { mood: 'sad', pitch: '-10%', rate: '0.9' },
    'angry': { mood: 'angry', pitch: '+10%', rate: '1.2' },
    'surprised': { mood: 'excited', pitch: '+30%', rate: '1.3' },
    'confused': { mood: 'uncertain', pitch: '0%', rate: '0.95' },
    'love': { mood: 'gentle', pitch: '+5%', rate: '0.95' },
    'neutral': { mood: 'neutral', pitch: '0%', rate: '1.0' }
  };

  constructor() {
    this.initializeTempDir();
    this.initializeProviders();
    logger.info('Speech Generation Service initialized with providers:', { 
      providers: this.providers.filter(p => p.available).map(p => p.name)
    });
  }

  private initializeTempDir(): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      logger.warn('Failed to create temp directory for speech generation', { error: String(error) });
    }
  }

  private initializeProviders(): void {
    // Initialize ElevenLabs provider
    if (process.env.ELEVENLABS_API_KEY) {
      this.providers.push(new ElevenLabsProvider());
    }

    // Initialize Azure Speech provider
    if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
      this.providers.push(new AzureSpeechProvider());
    }

    // Initialize Google Text-to-Speech provider
    if (process.env.GOOGLE_TTS_API_KEY) {
      this.providers.push(new GoogleTTSProvider());
    }

    // Initialize OpenAI TTS provider
    if (process.env.OPENAI_API_KEY) {
      this.providers.push(new OpenAITTSProvider());
    }

    // Initialize fallback provider (system TTS or simple alternative)
    this.providers.push(new FallbackSpeechProvider());
  }

  async generateSpeech(request: SpeechGenerationRequest): Promise<SpeechGenerationResult> {
    const startTime = Date.now();
    
    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          metadata: {
            text: request.text,
            voice: request.voice,
            emotion: request.emotion,
            duration: 0,
            generationTime: Date.now() - startTime,
            provider: 'validation_failed'
          },
          error: validation.issues?.join(', ') || 'Invalid request'
        };
      }

      // Check cache first
      const cacheKey = this.getCacheKey(request);
      if (this.cache.has(cacheKey)) {
        logger.debug('Speech generation cache hit', { userId: request.userId, textLength: request.text.length });
        return this.cache.get(cacheKey)!;
      }

      // Check rate limits
      if (this.isRateLimited(request.userId)) {
        return {
          success: false,
          metadata: {
            text: request.text,
            voice: request.voice,
            emotion: request.emotion,
            duration: 0,
            generationTime: Date.now() - startTime,
            provider: 'rate_limited'
          },
          error: 'Rate limit exceeded. Please try again later.'
        };
      }

      // Enhance request with emotion-based voice settings
      const enhancedRequest = this.enhanceRequestWithEmotion(request);

      // Try providers in order of preference
      for (const provider of this.providers.filter(p => p.available)) {
        try {
          logger.debug(`Attempting speech generation with ${provider.name}`, {
            userId: request.userId,
            textLength: request.text.length,
            voice: request.voice,
            emotion: request.emotion
          });

          const result = await provider.generateSpeech(enhancedRequest);
          
          if (result.success) {
            // Cache successful result (but not the buffer to save memory)
            const cacheResult = { ...result };
            delete cacheResult.audioBuffer; // Don't cache large buffers
            this.cache.set(cacheKey, cacheResult);
            this.updateRateLimit(request.userId);
            
            logger.info('Speech generation successful', {
              provider: provider.name,
              userId: request.userId,
              duration: result.metadata.duration,
              generationTime: result.metadata.generationTime
            });

            return result;
          }
        } catch (error) {
          logger.warn(`Speech generation failed with ${provider.name}`, {
            error: String(error),
            userId: request.userId
          });
          continue;
        }
      }

      // All providers failed
      return {
        success: false,
        metadata: {
          text: request.text,
          voice: request.voice,
          emotion: request.emotion,
          duration: 0,
          generationTime: Date.now() - startTime,
          provider: 'failed'
        },
        error: 'Speech generation temporarily unavailable. Please try again later.'
      };

    } catch (error) {
      logger.error('Speech generation service error', {
        error: String(error),
        userId: request.userId,
        textLength: request.text.length
      });

      return {
        success: false,
        metadata: {
          text: request.text,
          voice: request.voice,
          emotion: request.emotion,
          duration: 0,
          generationTime: Date.now() - startTime,
          provider: 'error'
        },
        error: 'An unexpected error occurred during speech generation.'
      };
    }
  }

  private getCacheKey(request: SpeechGenerationRequest): string {
    const textHash = this.hashString(request.text);
    return `speech_${textHash}_${request.voice}_${request.emotion}_${request.speed}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isRateLimited(userId: string): boolean {
    const limit = this.rateLimits.get(userId);
    if (!limit) return false;
    
    if (Date.now() > limit.resetTime) {
      this.rateLimits.delete(userId);
      return false;
    }
    
    return limit.count >= 20; // 20 speech generations per hour
  }

  private updateRateLimit(userId: string): void {
    const now = Date.now();
    const hourFromNow = now + (60 * 60 * 1000);
    
    const current = this.rateLimits.get(userId);
    if (!current || now > current.resetTime) {
      this.rateLimits.set(userId, { count: 1, resetTime: hourFromNow });
    } else {
      this.rateLimits.set(userId, { count: current.count + 1, resetTime: current.resetTime });
    }
  }

  private enhanceRequestWithEmotion(request: SpeechGenerationRequest): SpeechGenerationRequest {
    const enhanced = { ...request };
    const emotionSettings = this.emotionVoices[request.emotion as keyof typeof this.emotionVoices];
    
    if (emotionSettings) {
      // Adjust speed based on emotion
      const baseSpeed = request.speed || 1.0;
      const emotionRate = parseFloat(emotionSettings.rate);
      enhanced.speed = baseSpeed * emotionRate;
    }

    return enhanced;
  }

  private validateRequest(request: SpeechGenerationRequest): { valid: boolean; issues?: string[] } {
    const issues: string[] = [];

    if (!request.text || request.text.trim().length === 0) {
      issues.push('Text is required');
    }

    if (request.text && request.text.length > 3000) {
      issues.push('Text must be less than 3000 characters');
    }

    if (request.speed && (request.speed < 0.25 || request.speed > 2.0)) {
      issues.push('Speed must be between 0.25 and 2.0');
    }

    return { valid: issues.length === 0, issues: issues.length > 0 ? issues : undefined };
  }

  /**
   * Estimates the duration of speech for given text
   */
  estimateDuration(text: string, speed: number = 1.0): number {
    // Average speaking rate is about 150-160 words per minute
    const wordsPerMinute = 155 * speed;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil((wordCount / wordsPerMinute) * 60); // Duration in seconds
  }

  /**
   * Cleans up temporary audio files
   */
  cleanupTempFiles(): void {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup temp files', { error: String(error) });
    }
  }
}

// ElevenLabs Provider
class ElevenLabsProvider implements SpeechProvider {
  name = 'ElevenLabs';
  available = !!process.env.ELEVENLABS_API_KEY;

  async generateSpeech(request: SpeechGenerationRequest): Promise<SpeechGenerationResult> {
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${request.voice || 'pNInz6obpgDQGcFmaJgB'}`,
        {
          text: request.text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.5,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      const audioBuffer = Buffer.from(response.data);
      const estimatedDuration = Math.ceil(request.text.length * 0.05); // Rough estimate

      return {
        success: true,
        audioBuffer,
        metadata: {
          text: request.text,
          voice: request.voice,
          emotion: request.emotion,
          duration: estimatedDuration,
          generationTime: Date.now() - startTime,
          provider: 'elevenlabs',
          fileSize: audioBuffer.length
        }
      };
    } catch (error: any) {
      throw new Error(`ElevenLabs API error: ${error.response?.data?.detail || error.message}`);
    }
  }

  async getAvailableVoices(): Promise<string[]> {
    try {
      const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
      });
      return response.data.voices.map((voice: any) => voice.voice_id);
    } catch (error) {
      return ['pNInz6obpgDQGcFmaJgB']; // Default voice
    }
  }
}

// Azure Speech Provider
class AzureSpeechProvider implements SpeechProvider {
  name = 'Azure Speech';
  available = !!(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);

  async generateSpeech(request: SpeechGenerationRequest): Promise<SpeechGenerationResult> {
    const startTime = Date.now();

    try {
      const ssml = this.buildSSML(request);
      const response = await axios.post(
        `https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
        ssml,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'riff-16khz-16bit-mono-pcm'
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      const audioBuffer = Buffer.from(response.data);
      const estimatedDuration = Math.ceil(request.text.length * 0.05);

      return {
        success: true,
        audioBuffer,
        metadata: {
          text: request.text,
          voice: request.voice,
          emotion: request.emotion,
          duration: estimatedDuration,
          generationTime: Date.now() - startTime,
          provider: 'azure',
          fileSize: audioBuffer.length
        }
      };
    } catch (error: any) {
      throw new Error(`Azure Speech API error: ${error.response?.data || error.message}`);
    }
  }

  private buildSSML(request: SpeechGenerationRequest): string {
    const voice = request.voice || 'en-US-JennyNeural';
    const rate = request.speed ? `${Math.round((request.speed - 1) * 100)}%` : '0%';
    
    return `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voice}">
          <prosody rate="${rate}">
            ${request.text}
          </prosody>
        </voice>
      </speak>
    `.trim();
  }

  async getAvailableVoices(): Promise<string[]> {
    return [
      'en-US-JennyNeural',
      'en-US-GuyNeural',
      'en-US-AriaNeural',
      'en-US-DavisNeural'
    ];
  }
}

// Google TTS Provider
class GoogleTTSProvider implements SpeechProvider {
  name = 'Google TTS';
  available = !!process.env.GOOGLE_TTS_API_KEY;

  async generateSpeech(request: SpeechGenerationRequest): Promise<SpeechGenerationResult> {
    // Placeholder implementation
    throw new Error('Google TTS integration not yet implemented');
  }

  async getAvailableVoices(): Promise<string[]> {
    return ['en-US-Wavenet-D', 'en-US-Wavenet-F'];
  }
}

// OpenAI TTS Provider
class OpenAITTSProvider implements SpeechProvider {
  name = 'OpenAI TTS';
  available = !!process.env.OPENAI_API_KEY;

  async generateSpeech(request: SpeechGenerationRequest): Promise<SpeechGenerationResult> {
    const startTime = Date.now();

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1',
          input: request.text,
          voice: request.voice || 'alloy',
          response_format: 'mp3',
          speed: request.speed || 1.0
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      const audioBuffer = Buffer.from(response.data);
      const estimatedDuration = Math.ceil(request.text.length * 0.05);

      return {
        success: true,
        audioBuffer,
        metadata: {
          text: request.text,
          voice: request.voice,
          emotion: request.emotion,
          duration: estimatedDuration,
          generationTime: Date.now() - startTime,
          provider: 'openai',
          fileSize: audioBuffer.length
        }
      };
    } catch (error: any) {
      throw new Error(`OpenAI TTS API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getAvailableVoices(): Promise<string[]> {
    return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  }
}

// Fallback Provider
class FallbackSpeechProvider implements SpeechProvider {
  name = 'Fallback';
  available = true;

  async generateSpeech(request: SpeechGenerationRequest): Promise<SpeechGenerationResult> {
    const startTime = Date.now();

    // For fallback, we'll return a simple text response indicating speech generation is unavailable
    return {
      success: false,
      metadata: {
        text: request.text,
        voice: request.voice,
        emotion: request.emotion,
        duration: 0,
        generationTime: Date.now() - startTime,
        provider: 'fallback'
      },
      error: '🔊 Speech generation temporarily unavailable. Here\'s the text instead: ' + request.text
    };
  }

  async getAvailableVoices(): Promise<string[]> {
    return ['text-only'];
  }
}