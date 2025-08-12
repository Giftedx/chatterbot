// TASK-022: Enhanced multimodal capabilities with GPT-4o integration

import { getEnvAsBoolean, getEnvAsString } from '../utils/env.js';
import OpenAI from 'openai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

// Multimodal input schemas
const ImageInputSchema = z.object({
  type: z.literal('image'),
  data: z.string().describe('Base64 encoded image or image URL'),
  format: z.enum(['png', 'jpeg', 'gif', 'webp']).optional(),
  detail: z.enum(['low', 'high', 'auto']).default('auto'),
  max_tokens: z.number().optional().default(300)
});

const AudioInputSchema = z.object({
  type: z.literal('audio'),
  data: z.string().describe('Base64 encoded audio or audio file path'),
  format: z.enum(['mp3', 'wav', 'flac', 'm4a', 'webm']).optional(),
  transcription_model: z.enum(['whisper-1']).default('whisper-1'),
  language: z.string().optional(),
  prompt: z.string().optional()
});

const VideoInputSchema = z.object({
  type: z.literal('video'),
  data: z.string().describe('Video file path or URL'),
  format: z.enum(['mp4', 'avi', 'mov', 'webm']).optional(),
  frame_sampling: z.enum(['uniform', 'keyframes', 'smart']).default('smart'),
  max_frames: z.number().default(10),
  analysis_focus: z.array(z.enum(['objects', 'text', 'actions', 'scenes', 'emotions'])).default(['objects', 'actions'])
});

const DocumentInputSchema = z.object({
  type: z.literal('document'),
  data: z.string().describe('Document file path or text content'),
  format: z.enum(['pdf', 'docx', 'txt', 'markdown', 'html']).optional(),
  extraction_mode: z.enum(['text', 'structured', 'comprehensive']).default('comprehensive'),
  include_tables: z.boolean().default(true),
  include_images: z.boolean().default(true)
});

type MultimodalInput = z.infer<typeof ImageInputSchema> | 
                     z.infer<typeof AudioInputSchema> | 
                     z.infer<typeof VideoInputSchema> | 
                     z.infer<typeof DocumentInputSchema>;

const MultimodalAnalysisRequestSchema = z.object({
  inputs: z.array(z.union([ImageInputSchema, AudioInputSchema, VideoInputSchema, DocumentInputSchema])),
  task: z.enum([
    'describe',
    'analyze',
    'extract_text',
    'extract_data',
    'compare',
    'classify',
    'generate_summary',
    'answer_questions',
    'create_content',
    'translate',
    'transcribe'
  ]),
  context: z.string().optional(),
  custom_instructions: z.string().optional(),
  output_format: z.enum(['text', 'json', 'structured', 'detailed']).default('detailed'),
  quality_level: z.enum(['fast', 'balanced', 'high_quality']).default('balanced'),
  include_confidence: z.boolean().default(true),
  cross_modal_analysis: z.boolean().default(true)
});

type MultimodalAnalysisRequest = z.infer<typeof MultimodalAnalysisRequestSchema>;

interface MultimodalResult {
  id: string;
  timestamp: Date;
  request: MultimodalAnalysisRequest;
  results: {
    primary_analysis: string;
    detailed_findings: Record<string, unknown>;
    cross_modal_insights?: string[];
    extracted_data?: Record<string, unknown>;
    confidence_scores?: Record<string, number>;
    processing_metadata: {
      total_time_ms: number;
      model_used: string;
      input_processing_time: Record<string, number>;
      analysis_time: number;
    };
  };
  status: 'success' | 'partial_success' | 'failed';
  error_details?: string[];
}

interface VisionAnalysisResult {
  description: string;
  objects: Array<{
    name: string;
    confidence: number;
    bounding_box?: { x: number; y: number; width: number; height: number };
  }>;
  text_content?: string;
  scene_analysis: {
    setting: string;
    mood: string;
    lighting: string;
    composition: string;
  };
  people?: Array<{
    description: string;
    emotions?: string[];
    actions?: string[];
  }>;
  quality_assessment: {
    resolution: string;
    clarity: number;
    artistic_value?: number;
  };
}

interface AudioAnalysisResult {
  transcription: string;
  language_detected?: string;
  confidence: number;
  audio_quality: {
    clarity: number;
    noise_level: number;
    duration_seconds: number;
  };
  speaker_analysis?: {
    speaker_count: number;
    emotions?: string[];
    speaking_pace: 'slow' | 'normal' | 'fast';
  };
  content_analysis: {
    topics: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    key_phrases: string[];
  };
}

interface DocumentAnalysisResult {
  extracted_text: string;
  structure: {
    sections: Array<{
      title: string;
      content: string;
      level: number;
    }>;
    tables?: Array<{
      caption?: string;
      data: string[][];
    }>;
    images?: Array<{
      description: string;
      position: string;
    }>;
  };
  metadata: {
    page_count?: number;
    word_count: number;
    language: string;
    document_type: string;
  };
  content_analysis: {
    summary: string;
    key_topics: string[];
    entities: Array<{
      name: string;
      type: string;
      confidence: number;
    }>;
  };
}

export class GPT4oEnhancedMultimodalService {
  private openai: OpenAI;
  private isInitialized = false;
  private processingCache: Map<string, MultimodalResult> = new Map();

  constructor() {
    const apiKey = getEnvAsString('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }
    
    this.openai = new OpenAI({
      apiKey,
      timeout: 60000 // 1 minute timeout
    });
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test OpenAI connection
      await this.openai.models.list();
      this.isInitialized = true;
      console.log('🎯 GPT-4o Enhanced Multimodal Service initialized');
    } catch (error) {
      console.error('Failed to initialize GPT-4o service:', error);
      throw error;
    }
  }

  async analyzeMultimodal(request: MultimodalAnalysisRequest): Promise<MultimodalResult> {
    await this.init();
    
    const startTime = Date.now();
    const resultId = `multimodal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Validate request
      const validatedRequest = MultimodalAnalysisRequestSchema.parse(request);
      
      console.log(`🔍 Starting multimodal analysis with ${validatedRequest.inputs.length} inputs`);

      // Process each input type
      const inputProcessingTimes: Record<string, number> = {};
      const processedInputs: Array<{ type: string; result: unknown; metadata: Record<string, unknown> }> = [];

      for (const input of validatedRequest.inputs) {
        const inputStartTime = Date.now();
        let processedInput;

        switch (input.type) {
          case 'image':
            processedInput = await this.processImageInput(input);
            break;
          case 'audio':
            processedInput = await this.processAudioInput(input);
            break;
          case 'video':
            processedInput = await this.processVideoInput(input);
            break;
          case 'document':
            processedInput = await this.processDocumentInput(input);
            break;
          default:
            throw new Error(`Unsupported input type: ${(input as any).type}`);
        }

        inputProcessingTimes[input.type] = Date.now() - inputStartTime;
        processedInputs.push({
          type: input.type,
          result: processedInput,
          metadata: { processing_time: inputProcessingTimes[input.type] }
        });
      }

      // Perform cross-modal analysis if enabled
      const analysisStartTime = Date.now();
      const crossModalInsights = validatedRequest.cross_modal_analysis ? 
        await this.performCrossModalAnalysis(processedInputs, validatedRequest) : [];

      // Generate primary analysis based on task
      const primaryAnalysis = await this.generatePrimaryAnalysis(
        processedInputs, 
        validatedRequest, 
        crossModalInsights
      );

      // Extract structured data if needed
      const extractedData = validatedRequest.output_format === 'structured' || validatedRequest.output_format === 'json' ?
        await this.extractStructuredData(processedInputs, validatedRequest) : undefined;

      // Calculate confidence scores
      const confidenceScores = validatedRequest.include_confidence ?
        this.calculateConfidenceScores(processedInputs, primaryAnalysis) : undefined;

      const totalTime = Date.now() - startTime;
      const analysisTime = Date.now() - analysisStartTime;

      const result: MultimodalResult = {
        id: resultId,
        timestamp: new Date(),
        request: validatedRequest,
        results: {
          primary_analysis: primaryAnalysis,
          detailed_findings: this.compileDetailedFindings(processedInputs),
          cross_modal_insights: crossModalInsights,
          extracted_data: extractedData,
          confidence_scores: confidenceScores,
          processing_metadata: {
            total_time_ms: totalTime,
            model_used: 'gpt-4o',
            input_processing_time: inputProcessingTimes,
            analysis_time: analysisTime
          }
        },
        status: 'success'
      };

      // Cache result
      this.processingCache.set(resultId, result);

      console.log(`✅ Multimodal analysis completed in ${totalTime}ms`);
      return result;

    } catch (error) {
      console.error('Multimodal analysis failed:', error);
      
      const failureResult: MultimodalResult = {
        id: resultId,
        timestamp: new Date(),
        request,
        results: {
          primary_analysis: 'Analysis failed due to processing error',
          detailed_findings: {},
          processing_metadata: {
            total_time_ms: Date.now() - startTime,
            model_used: 'gpt-4o',
            input_processing_time: {},
            analysis_time: 0
          }
        },
        status: 'failed',
        error_details: [error instanceof Error ? error.message : String(error)]
      };

      this.processingCache.set(resultId, failureResult);
      return failureResult;
    }
  }

  private async processImageInput(input: z.infer<typeof ImageInputSchema>): Promise<VisionAnalysisResult> {
    try {
      const imageData = await this.prepareImageData(input.data);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please analyze this image comprehensively. Provide:
1. Detailed description
2. Objects and their locations
3. Any text content
4. Scene analysis (setting, mood, lighting, composition)
5. People and their emotions/actions (if any)
6. Quality assessment

Format your response as a detailed analysis.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                  detail: input.detail
                }
              }
            ]
          }
        ],
        max_tokens: input.max_tokens,
        temperature: 0.1
      });

      const analysisText = response.choices[0]?.message?.content || '';
      
      // Parse the analysis into structured format
      return this.parseVisionAnalysis(analysisText);

    } catch (error) {
      console.error('Image processing failed:', error);
      throw new Error(`Image analysis failed: ${error}`);
    }
  }

  private async processAudioInput(input: z.infer<typeof AudioInputSchema>): Promise<AudioAnalysisResult> {
    try {
      const audioFile = await this.prepareAudioFile(input.data);
      
      // Transcribe audio
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile as any,
        model: input.transcription_model,
        language: input.language,
        prompt: input.prompt,
        response_format: 'verbose_json'
      });

      // Analyze transcription content
      const contentAnalysis = await this.analyzeAudioContent(transcription.text);
      
      return {
        transcription: transcription.text,
        language_detected: (transcription as any).language || input.language,
        confidence: 0.85, // Placeholder
        audio_quality: {
          clarity: 0.9, // Placeholder
          noise_level: 0.1, // Placeholder
          duration_seconds: (transcription as any).duration || 0
        },
        speaker_analysis: {
          speaker_count: 1, // Placeholder
          emotions: ['neutral'], // Placeholder
          speaking_pace: 'normal'
        },
        content_analysis: contentAnalysis
      };

    } catch (error) {
      console.error('Audio processing failed:', error);
      throw new Error(`Audio analysis failed: ${error}`);
    }
  }

  private async processVideoInput(input: z.infer<typeof VideoInputSchema>): Promise<Record<string, unknown>> {
    try {
      // For now, return a placeholder since video processing is complex
      // In a real implementation, this would extract frames and process them
      console.log('Video processing not fully implemented yet');
      
      return {
        video_analysis: 'Video processing placeholder',
        extracted_frames: [],
        scene_changes: [],
        object_tracking: [],
        audio_analysis: 'Audio extraction placeholder'
      };

    } catch (error) {
      console.error('Video processing failed:', error);
      throw new Error(`Video analysis failed: ${error}`);
    }
  }

  private async processDocumentInput(input: z.infer<typeof DocumentInputSchema>): Promise<DocumentAnalysisResult> {
    try {
      let textContent = '';
      
      if (input.data.startsWith('/') || input.data.startsWith('./')) {
        // File path
        textContent = await fs.readFile(input.data, 'utf-8');
      } else {
        // Direct text content
        textContent = input.data;
      }

      // Analyze document content
      const analysis = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `Please analyze this document comprehensively:

${textContent}

Provide:
1. Document structure (sections, headers)
2. Key topics and themes
3. Important entities (people, organizations, dates, etc.)
4. Summary of main points
5. Document metadata analysis

Format your response with clear sections.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      });

      const analysisText = analysis.choices[0]?.message?.content || '';
      
      return this.parseDocumentAnalysis(textContent, analysisText);

    } catch (error) {
      console.error('Document processing failed:', error);
      throw new Error(`Document analysis failed: ${error}`);
    }
  }

  private async performCrossModalAnalysis(
    processedInputs: Array<{ type: string; result: unknown; metadata: Record<string, unknown> }>,
    request: MultimodalAnalysisRequest
  ): Promise<string[]> {
    if (processedInputs.length < 2) return [];

    try {
      const insights: string[] = [];
      
      // Compare different modalities
      for (let i = 0; i < processedInputs.length; i++) {
        for (let j = i + 1; j < processedInputs.length; j++) {
          const input1 = processedInputs[i];
          const input2 = processedInputs[j];
          
          const comparisonPrompt = `Compare and find relationships between:
Input 1 (${input1.type}): ${JSON.stringify(input1.result, null, 2)}
Input 2 (${input2.type}): ${JSON.stringify(input2.result, null, 2)}

Find connections, contradictions, or complementary information.`;

          const comparison = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: comparisonPrompt }],
            max_tokens: 500,
            temperature: 0.2
          });

          const insight = comparison.choices[0]?.message?.content;
          if (insight) {
            insights.push(`${input1.type} ↔ ${input2.type}: ${insight}`);
          }
        }
      }

      return insights;

    } catch (error) {
      console.error('Cross-modal analysis failed:', error);
      return ['Cross-modal analysis encountered errors'];
    }
  }

  private async generatePrimaryAnalysis(
    processedInputs: Array<{ type: string; result: unknown; metadata: Record<string, unknown> }>,
    request: MultimodalAnalysisRequest,
    crossModalInsights: string[]
  ): Promise<string> {
    try {
      const inputSummary = processedInputs.map(input => 
        `${input.type}: ${JSON.stringify(input.result, null, 2)}`
      ).join('\n\n');

      const crossModalSummary = crossModalInsights.length > 0 ? 
        `\n\nCross-modal insights:\n${crossModalInsights.join('\n')}` : '';

      const analysisPrompt = `Task: ${request.task}
Context: ${request.context || 'No specific context provided'}
Custom Instructions: ${request.custom_instructions || 'None'}

Input Analysis:
${inputSummary}${crossModalSummary}

Please provide a comprehensive ${request.output_format} analysis based on the task and inputs.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 1500,
        temperature: request.quality_level === 'fast' ? 0.3 : 0.1
      });

      return response.choices[0]?.message?.content || 'Analysis generation failed';

    } catch (error) {
      console.error('Primary analysis generation failed:', error);
      return 'Analysis generation encountered errors';
    }
  }

  private async extractStructuredData(
    processedInputs: Array<{ type: string; result: unknown; metadata: Record<string, unknown> }>,
    request: MultimodalAnalysisRequest
  ): Promise<Record<string, unknown>> {
    try {
      const structurePrompt = `Extract structured data from the following analysis results in JSON format:

${JSON.stringify(processedInputs, null, 2)}

Focus on extracting:
- Key entities (names, dates, locations, organizations)
- Numerical data and measurements
- Categories and classifications
- Relationships and connections
- Actionable items or conclusions

Return as valid JSON.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: structurePrompt }],
        max_tokens: 1000,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        return JSON.parse(content);
      } catch {
        return { extracted_text: content };
      }

    } catch (error) {
      console.error('Structured data extraction failed:', error);
      return { error: 'Data extraction failed' };
    }
  }

  private calculateConfidenceScores(
    processedInputs: Array<{ type: string; result: unknown; metadata: Record<string, unknown> }>,
    primaryAnalysis: string
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    // Calculate confidence based on input processing success and analysis quality
    processedInputs.forEach(input => {
      // Base confidence from processing time (faster usually means more confident)
      const processingTime = input.metadata.processing_time as number || 1000;
      const timeScore = Math.max(0.5, 1 - (processingTime / 10000)); // Normalize to 0.5-1.0

      // Content quality score (placeholder logic)
      const contentScore = 0.85; // Would be calculated based on actual content analysis

      scores[input.type] = (timeScore + contentScore) / 2;
    });

    // Overall analysis confidence
    const analysisLength = primaryAnalysis.length;
    const lengthScore = Math.min(1.0, analysisLength / 1000); // Longer analysis often means more thorough
    scores.overall_analysis = (lengthScore + 0.8) / 2; // Base confidence of 0.8

    return scores;
  }

  private compileDetailedFindings(
    processedInputs: Array<{ type: string; result: unknown; metadata: Record<string, unknown> }>
  ): Record<string, unknown> {
    const findings: Record<string, unknown> = {};

    processedInputs.forEach((input, index) => {
      findings[`${input.type}_${index + 1}`] = {
        result: input.result,
        metadata: input.metadata,
        processing_notes: `Processed ${input.type} input successfully`
      };
    });

    return findings;
  }

  private async prepareImageData(data: string): Promise<string> {
    if (data.startsWith('http://') || data.startsWith('https://')) {
      return data; // URL
    } else if (data.startsWith('data:image/')) {
      return data; // Base64 data URL
    } else {
      // Assume file path
      const imageBuffer = await fs.readFile(data);
      const base64 = imageBuffer.toString('base64');
      const ext = path.extname(data).slice(1);
      return `data:image/${ext};base64,${base64}`;
    }
  }

  private async prepareAudioFile(data: string): Promise<Buffer> {
    if (data.startsWith('/') || data.startsWith('./')) {
      // File path
      return await fs.readFile(data);
    } else {
      // Base64 data
      return Buffer.from(data, 'base64');
    }
  }

  private parseVisionAnalysis(analysisText: string): VisionAnalysisResult {
    // This is a simplified parser - in a real implementation,
    // you'd use more sophisticated parsing or structured output
    return {
      description: analysisText.split('\n')[0] || analysisText.substring(0, 200),
      objects: [
        { name: 'detected_object', confidence: 0.85 }
      ],
      text_content: this.extractTextFromAnalysis(analysisText),
      scene_analysis: {
        setting: 'unknown',
        mood: 'neutral',
        lighting: 'natural',
        composition: 'standard'
      },
      people: [],
      quality_assessment: {
        resolution: 'high',
        clarity: 0.9
      }
    };
  }

  private async analyzeAudioContent(transcription: string): Promise<any> {
    // Analyze the transcribed content
    const words = transcription.split(/\s+/);
    const topics = ['general']; // Placeholder
    
    return {
      topics,
      sentiment: 'neutral',
      key_phrases: words.slice(0, 5) // Simple extraction
    };
  }

  private parseDocumentAnalysis(textContent: string, analysisText: string): DocumentAnalysisResult {
    const words = textContent.split(/\s+/).length;
    
    return {
      extracted_text: textContent,
      structure: {
        sections: [
          { title: 'Main Content', content: textContent, level: 1 }
        ]
      },
      metadata: {
        word_count: words,
        language: 'unknown',
        document_type: 'text'
      },
      content_analysis: {
        summary: analysisText.substring(0, 500),
        key_topics: ['general'],
        entities: []
      }
    };
  }

  private extractTextFromAnalysis(analysisText: string): string | undefined {
    // Extract any mentioned text content from the analysis
    const textMatch = analysisText.match(/text[:\s]+"([^"]+)"/i);
    return textMatch ? textMatch[1] : undefined;
  }

  async getProcessingResult(resultId: string): Promise<MultimodalResult | null> {
    return this.processingCache.get(resultId) || null;
  }

  async getProcessingHistory(limit: number = 10): Promise<MultimodalResult[]> {
    return Array.from(this.processingCache.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  clearCache(): void {
    this.processingCache.clear();
    console.log('🧹 Multimodal processing cache cleared');
  }
}

export const gpt4oEnhancedMultimodalService = new GPT4oEnhancedMultimodalService();