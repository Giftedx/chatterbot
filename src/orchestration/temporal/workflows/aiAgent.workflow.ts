/**
 * Advanced AI Agent Workflow with Comprehensive Orchestration
 * Implements durable, multi-step AI operations with error handling and compensation
 */
import { 
  defineSignal, 
  setHandler, 
  proxyActivities, 
  sleep,
  condition,
  workflowInfo,
  continueAsNew 
} from '@temporalio/workflow';

// Import activity types
import type * as llmActivities from '../activities/llm.activities.js';
import type * as memoryActivities from '../activities/memory.activities.js';
import type * as multimodalActivities from '../activities/multimodal.activities.js';
import type * as analysisActivities from '../activities/analysis.activities.js';

// Create activity proxies with retry policies
const llm = proxyActivities<typeof llmActivities>({
  startToCloseTimeout: '2 minutes',
  retryPolicy: {
    initialInterval: '1s',
    maximumInterval: '10s',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

const memory = proxyActivities<typeof memoryActivities>({
  startToCloseTimeout: '30s',
  retryPolicy: {
    initialInterval: '1s',
    maximumInterval: '5s',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

const multimodal = proxyActivities<typeof multimodalActivities>({
  startToCloseTimeout: '5 minutes',
  retryPolicy: {
    initialInterval: '2s',
    maximumInterval: '30s',
    backoffCoefficient: 2,
    maximumAttempts: 2
  }
});

const analysis = proxyActivities<typeof analysisActivities>({
  startToCloseTimeout: '1 minute',
  retryPolicy: {
    initialInterval: '1s',
    maximumInterval: '5s',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

// Workflow signals for human-in-the-loop operations
export const humanApproval = defineSignal<boolean>('humanApproval');
export const workflowCancel = defineSignal<string>('workflowCancel');
export const workflowPause = defineSignal<boolean>('workflowPause');

// Workflow interfaces
export interface AIAgentRequest {
  userId: string;
  task: string;
  context?: Record<string, unknown>;
  options?: {
    requireHumanApproval?: boolean;
    maxSteps?: number;
    qualityThreshold?: number;
    includeMemorySearch?: boolean;
    multimodalEnabled?: boolean;
    analysisDepth?: 'basic' | 'comprehensive' | 'deep';
  };
}

export interface AIAgentResult {
  response: string;
  steps: Array<{
    step: string;
    result: string;
    duration: number;
    confidence: number;
  }>;
  memoryUpdates: string[];
  qualityScore: number;
  recommendations: string[];
  metadata: Record<string, unknown>;
}

/**
 * Main AI Agent Workflow - Orchestrates complex AI operations
 */
export async function aiAgentWorkflow(request: AIAgentRequest): Promise<AIAgentResult> {
  const startTime = Date.now();
  let approved = !request.options?.requireHumanApproval;
  let paused = false;
  let cancelled = false;
  
  const steps: AIAgentResult['steps'] = [];
  const memoryUpdates: string[] = [];
  
  // Setup signal handlers
  setHandler(humanApproval, (approval: boolean) => {
    approved = approval;
  });
  
  setHandler(workflowPause, (pause: boolean) => {
    paused = pause;
  });
  
  setHandler(workflowCancel, (reason: string) => {
    cancelled = true;
  });

  // Step 1: Initial task analysis
  const stepStartTime = Date.now();
  const taskAnalysis = await analysis.analyzeContent({
    type: 'intent',
    content: request.task,
    context: request.context
  });
  
  steps.push({
    step: 'Task Analysis',
    result: `Intent: ${taskAnalysis.details.primaryIntent}, Confidence: ${taskAnalysis.confidence}`,
    duration: Date.now() - stepStartTime,
    confidence: taskAnalysis.confidence
  });

  // Check for cancellation
  if (cancelled) {
    return {
      response: 'Workflow cancelled by user',
      steps,
      memoryUpdates,
      qualityScore: 0,
      recommendations: [],
      metadata: { cancelled: true, reason: 'User cancellation' }
    };
  }

  // Step 2: Memory retrieval (if enabled)
  let relevantMemories: any[] = [];
  if (request.options?.includeMemorySearch !== false) {
    const memoryStepStart = Date.now();
    
    try {
      relevantMemories = await memory.searchMemories({
        userId: request.userId,
        query: request.task,
        limit: 5,
        threshold: 0.7
      });
      
      steps.push({
        step: 'Memory Retrieval',
        result: `Found ${relevantMemories.length} relevant memories`,
        duration: Date.now() - memoryStepStart,
        confidence: relevantMemories.length > 0 ? 0.8 : 0.3
      });
    } catch (error) {
      steps.push({
        step: 'Memory Retrieval',
        result: 'Memory search failed, proceeding without context',
        duration: Date.now() - memoryStepStart,
        confidence: 0.1
      });
    }
  }

  // Wait for human approval if required
  if (request.options?.requireHumanApproval && !approved) {
    await condition(() => approved || cancelled, '5m'); // 5 minute timeout
    
    if (!approved && !cancelled) {
      return {
        response: 'Workflow timed out waiting for approval',
        steps,
        memoryUpdates,
        qualityScore: 0,
        recommendations: ['Enable auto-approval for non-sensitive tasks'],
        metadata: { timeout: true, reason: 'Approval timeout' }
      };
    }
  }

  // Handle pause signals
  while (paused && !cancelled) {
    await sleep('1s');
  }

  if (cancelled) {
    return {
      response: 'Workflow cancelled during execution',
      steps,
      memoryUpdates,
      qualityScore: 0,
      recommendations: [],
      metadata: { cancelled: true, reason: 'User cancellation during execution' }
    };
  }

  // Step 3: Generate initial response
  const responseStepStart = Date.now();
  const memoryContext = relevantMemories.map(m => m.content).join('\n');
  const systemPrompt = `You are an advanced AI assistant. Use the following context from previous interactions:
${memoryContext}

Current task analysis: ${JSON.stringify(taskAnalysis.details)}
Respond thoughtfully and comprehensively.`;

  const llmResult = await llm.llmDraft({
    prompt: request.task,
    systemPrompt,
    modelName: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000
  });

  steps.push({
    step: 'Initial Response Generation',
    result: `Generated ${llmResult.content.length} characters using ${llmResult.modelUsed}`,
    duration: Date.now() - responseStepStart,
    confidence: 0.8
  });

  // Step 4: Quality analysis and improvement
  const qualityStepStart = Date.now();
  const qualityAnalysis = await analysis.analyzeContent({
    type: 'quality',
    content: llmResult.content,
    context: request.context
  });

  let finalResponse = llmResult.content;
  let qualityScore = qualityAnalysis.score;

  // If quality is below threshold, attempt improvement
  if (qualityScore < (request.options?.qualityThreshold || 0.7)) {
    const improvementPrompt = `Improve the following response based on these issues: ${qualityAnalysis.details.issues?.join(', ')}

Original response: ${llmResult.content}

Please provide an improved version that addresses these concerns.`;

    const improvedResult = await llm.llmDraft({
      prompt: improvementPrompt,
      systemPrompt: 'You are an expert at improving AI responses for clarity, accuracy, and helpfulness.',
      modelName: 'gpt-4o',
      temperature: 0.5
    });

    // Re-analyze improved response
    const improvedQuality = await analysis.analyzeContent({
      type: 'quality',
      content: improvedResult.content
    });

    if (improvedQuality.score > qualityScore) {
      finalResponse = improvedResult.content;
      qualityScore = improvedQuality.score;
    }

    steps.push({
      step: 'Quality Improvement',
      result: `Quality improved from ${qualityAnalysis.score.toFixed(2)} to ${qualityScore.toFixed(2)}`,
      duration: Date.now() - qualityStepStart,
      confidence: qualityScore
    });
  } else {
    steps.push({
      step: 'Quality Analysis',
      result: `Quality score: ${qualityScore.toFixed(2)} (meets threshold)`,
      duration: Date.now() - qualityStepStart,
      confidence: qualityScore
    });
  }

  // Step 5: Store interaction in memory
  const memoryStoreStart = Date.now();
  try {
    const memoryResult = await memory.storeMemory({
      userId: request.userId,
      content: `Task: ${request.task}\nResponse: ${finalResponse}`,
      type: 'episodic',
      metadata: {
        workflowId: workflowInfo().workflowId,
        qualityScore,
        analysisResults: taskAnalysis.details,
        timestamp: new Date().toISOString()
      }
    });

    if (memoryResult.success) {
      memoryUpdates.push(memoryResult.memoryId);
    }

    steps.push({
      step: 'Memory Storage',
      result: `Stored interaction with ID: ${memoryResult.memoryId}`,
      duration: Date.now() - memoryStoreStart,
      confidence: memoryResult.success ? 1.0 : 0.0
    });
  } catch (error) {
    steps.push({
      step: 'Memory Storage',
      result: 'Failed to store interaction in memory',
      duration: Date.now() - memoryStoreStart,
      confidence: 0.0
    });
  }

  // Step 6: Generate recommendations for future improvements
  const recommendations: string[] = [];
  
  if (qualityScore < 0.8) {
    recommendations.push('Consider using more detailed prompts for higher quality responses');
  }
  
  if (relevantMemories.length === 0) {
    recommendations.push('Build more conversation history for better context');
  }
  
  if (taskAnalysis.confidence < 0.7) {
    recommendations.push('Request clarification for ambiguous tasks');
  }

  return {
    response: finalResponse,
    steps,
    memoryUpdates,
    qualityScore,
    recommendations,
    metadata: {
      totalDuration: Date.now() - startTime,
      workflowId: workflowInfo().workflowId,
      analysisDepth: request.options?.analysisDepth || 'basic',
      humanApprovalRequired: request.options?.requireHumanApproval || false,
      memorySearchEnabled: request.options?.includeMemorySearch !== false
    }
  };
}

/**
 * Legacy workflow function for backward compatibility
 */
export async function legacyAiAgentWorkflow(userId: string, task: string): Promise<string> {
  const result = await aiAgentWorkflow({
    userId,
    task,
    options: {
      requireHumanApproval: task.toLowerCase().includes('sensitive'),
      analysisDepth: 'basic'
    }
  });
  
  return result.response;
}