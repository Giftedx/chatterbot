/**
 * Multimodal AI Workflow for Complex Content Processing
 * Handles image, audio, video, and document analysis with AI enhancement
 */
import { 
  proxyActivities, 
  sleep,
  workflowInfo,
  defineSignal,
  setHandler
} from '@temporalio/workflow';

import type * as multimodalActivities from '../activities/multimodal.activities.js';
import type * as analysisActivities from '../activities/analysis.activities.js';
import type * as llmActivities from '../activities/llm.activities.js';
import type * as memoryActivities from '../activities/memory.activities.js';

// Activity proxies with enhanced timeouts for multimodal processing
const multimodal = proxyActivities<typeof multimodalActivities>({
  startToCloseTimeout: '10 minutes',
  retryPolicy: {
    initialInterval: '5s',
    maximumInterval: '1m',
    backoffCoefficient: 2,
    maximumAttempts: 2
  }
});

const analysis = proxyActivities<typeof analysisActivities>({
  startToCloseTimeout: '2 minutes',
  retryPolicy: {
    initialInterval: '2s',
    maximumInterval: '10s',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

const llm = proxyActivities<typeof llmActivities>({
  startToCloseTimeout: '3 minutes',
  retryPolicy: {
    initialInterval: '2s',
    maximumInterval: '15s',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

const memory = proxyActivities<typeof memoryActivities>({
  startToCloseTimeout: '1 minute',
  retryPolicy: {
    initialInterval: '1s',
    maximumInterval: '5s',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

export const multimodalProcessingCancel = defineSignal<string>('multimodalProcessingCancel');

export interface MultimodalWorkflowRequest {
  userId: string;
  contentItems: Array<{
    id: string;
    type: 'image' | 'audio' | 'video' | 'document';
    content: string | Buffer;
    contentUrl?: string;
    metadata?: Record<string, unknown>;
  }>;
  processingOptions: {
    analysisTypes: Array<'ocr' | 'object_detection' | 'sentiment' | 'transcription' | 'translation' | 'summary'>;
    enhanceContent?: boolean;
    generateDescription?: boolean;
    extractInsights?: boolean;
    storeInMemory?: boolean;
    qualityThreshold?: number;
  };
  outputFormat?: 'detailed' | 'summary' | 'insights_only';
}

export interface MultimodalWorkflowResult {
  processedItems: Array<{
    id: string;
    type: string;
    analysisResults: Record<string, any>;
    enhancedContent?: {
      type: string;
      content: string | Buffer;
      contentUrl?: string;
    };
    description?: string;
    insights?: Record<string, any>;
    confidence: number;
    processingTime: number;
  }>;
  overallInsights: {
    summary: string;
    keyFindings: string[];
    sentimentAnalysis?: Record<string, any>;
    topicAnalysis?: Record<string, any>;
    recommendations: string[];
  };
  memoryUpdates: string[];
  metadata: Record<string, unknown>;
}

/**
 * Advanced Multimodal Processing Workflow
 */
export async function multimodalProcessingWorkflow(
  request: MultimodalWorkflowRequest
): Promise<MultimodalWorkflowResult> {
  const startTime = Date.now();
  let cancelled = false;
  
  // Setup cancellation handler
  setHandler(multimodalProcessingCancel, (reason: string) => {
    cancelled = true;
  });

  const processedItems: MultimodalWorkflowResult['processedItems'] = [];
  const memoryUpdates: string[] = [];
  const allInsights: any[] = [];
  const allDescriptions: string[] = [];

  // Process each content item
  for (const item of request.contentItems) {
    if (cancelled) break;

    const itemStartTime = Date.now();
    
    try {
      // Step 1: Analyze content
      const analysisResults = await multimodal.processMultimodal({
        type: item.type,
        content: item.content,
        contentUrl: item.contentUrl,
        analysisTypes: request.processingOptions.analysisTypes,
        options: { qualityThreshold: request.processingOptions.qualityThreshold }
      });

      // Step 2: Enhanced content processing (if requested)
      let enhancedContent: { type: string; content: string | Buffer; contentUrl?: string } | undefined = undefined;
      if (request.processingOptions.enhanceContent && item.type === 'image') {
        const enhancement = await multimodal.enhanceMultimodal({
          contentType: `${item.type}/original`,
          content: item.content,
          enhancementType: 'upscale',
          options: { quality: 'high' }
        });
        enhancedContent = {
          type: `${item.type}/enhanced`,
          content: enhancement.enhancedContent,
          contentUrl: enhancement.enhancedContentUrl
        };
      }

      // Step 3: Generate AI description (if requested)
      let description: string | undefined;
      if (request.processingOptions.generateDescription) {
        const contentSummary = analysisResults
          .map(result => `${result.type}: ${JSON.stringify(result.results)}`)
          .join('\n');

        const descriptionResult = await llm.llmDraft({
          prompt: `Describe this ${item.type} content based on the analysis:\n${contentSummary}`,
          systemPrompt: 'Provide a comprehensive yet concise description of the content based on the analysis results.',
          maxTokens: 500,
          temperature: 0.7
        });

        description = descriptionResult.content;
        allDescriptions.push(description);
      }

      // Step 4: Extract insights (if requested)
      let insights: any = undefined;
      if (request.processingOptions.extractInsights) {
        // Combine analysis results for insight extraction
        const combinedContent = description || 
          analysisResults.map(r => JSON.stringify(r.results)).join(' ');

        if (combinedContent) {
          insights = await analysis.analyzeContent({
            type: 'topic',
            content: combinedContent,
            context: { contentType: item.type, itemId: item.id }
          });

          allInsights.push(insights);
        }
      }

      // Calculate overall confidence for this item
      const avgConfidence = analysisResults.length > 0
        ? analysisResults.reduce((sum, result) => sum + (result.confidence || 0), 0) / analysisResults.length
        : 0;

      const processedItem = {
        id: item.id,
        type: item.type,
        analysisResults: analysisResults.reduce((acc, result) => {
          acc[result.type] = result;
          return acc;
        }, {} as Record<string, any>),
        enhancedContent,
        description,
        insights,
        confidence: avgConfidence,
        processingTime: Math.max(0, Date.now() - itemStartTime)
      };

      processedItems.push(processedItem);

      // Step 5: Store in memory (if requested)
      if (request.processingOptions.storeInMemory) {
        const memoryContent = [
          `Processed ${item.type} content`,
          description ? `Description: ${description}` : '',
          insights ? `Key insights: ${JSON.stringify(insights.details)}` : ''
        ].filter(Boolean).join('\n');

        try {
          const memoryResult = await memory.storeMemory({
            userId: request.userId,
            content: memoryContent,
            type: 'episodic',
            metadata: {
              contentType: item.type,
              contentId: item.id,
              workflowId: workflowInfo().workflowId,
              analysisTypes: request.processingOptions.analysisTypes,
              confidence: avgConfidence,
              timestamp: Date.now()
            }
          });

          if (memoryResult.success) {
            memoryUpdates.push(memoryResult.memoryId);
          }
        } catch (error) {
          console.warn('Failed to store multimodal content in memory:', error);
        }
      }

      // Add processing delay for rate limiting
      await sleep(100);

    } catch (error) {
      console.error(`Failed to process item ${item.id}:`, error);
      
      // Add failed item with error information
      processedItems.push({
        id: item.id,
        type: item.type,
        analysisResults: { error: `Processing failed: ${error}` },
        confidence: 0,
        processingTime: Math.max(0, Date.now() - itemStartTime)
      });
    }
  }

  // Generate overall insights and summary
  const overallInsights = await generateOverallInsights(
    processedItems,
    allDescriptions,
    allInsights,
    request.outputFormat
  );

  return {
    processedItems,
    overallInsights,
    memoryUpdates,
    metadata: {
      totalProcessingTime: Math.max(0, Date.now() - startTime),
      workflowId: workflowInfo().workflowId,
      itemsProcessed: processedItems.length,
      itemsRequested: request.contentItems.length,
      cancelled,
      outputFormat: request.outputFormat || 'detailed',
      analysisTypes: request.processingOptions.analysisTypes
    }
  };
}

/**
 * Generate comprehensive insights from all processed items
 */
async function generateOverallInsights(
  processedItems: any[],
  descriptions: string[],
  insights: any[],
  outputFormat?: string
): Promise<MultimodalWorkflowResult['overallInsights']> {
  const successfulItems = processedItems.filter(item => item.confidence > 0);
  
  // Generate summary
  const summaryContent = descriptions.length > 0 
    ? descriptions.join('\n\n')
    : successfulItems.map(item => 
        `${item.type}: ${JSON.stringify(item.analysisResults)}`
      ).join('\n');

  let summary = 'No content could be processed successfully.';
  if (summaryContent) {
    const summaryResult = await llm.llmDraft({
      prompt: `Provide a comprehensive summary of this multimodal content analysis:\n\n${summaryContent}`,
      systemPrompt: 'Create a coherent summary that highlights key findings, patterns, and insights across all analyzed content.',
      maxTokens: 800,
      temperature: 0.6
    });
    summary = summaryResult.content;
  }

  // Extract key findings
  const keyFindings: string[] = [];
  
  // Analyze content types processed
  const contentTypes = [...new Set(successfulItems.map(item => item.type))];
  keyFindings.push(`Processed ${successfulItems.length} items across ${contentTypes.length} content types: ${contentTypes.join(', ')}`);

  // Analyze confidence levels
  const avgConfidence = successfulItems.reduce((sum, item) => sum + item.confidence, 0) / successfulItems.length;
  keyFindings.push(`Average processing confidence: ${(avgConfidence * 100).toFixed(1)}%`);

  // Extract specific findings from insights
  for (const insight of insights) {
    if (insight.details?.primaryTopics) {
      keyFindings.push(`Key topics identified: ${insight.details.primaryTopics.join(', ')}`);
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (avgConfidence < 0.7) {
    recommendations.push('Consider using higher quality content for better analysis results');
  }
  
  if (contentTypes.length === 1) {
    recommendations.push('Diversify content types for richer multimodal analysis');
  }
  
  if (descriptions.length > 0) {
    recommendations.push('Generated descriptions can be used for accessibility and search indexing');
  }

  const failedItems = processedItems.length - successfulItems.length;
  if (failedItems > 0) {
    recommendations.push(`${failedItems} items failed processing - review content format and size`);
  }

  return {
    summary,
    keyFindings,
    recommendations
  };
}