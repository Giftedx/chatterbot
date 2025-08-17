/*
 * Unified Cognitive Pipeline
 * Academically-rigorous end-to-end pipeline that unifies:
 * - Feature extraction (message analysis)
 * - Decision/Options tree (input type x cognitive operation)
 * - Routing (feature routing matrix + model router)
 * - Memory (retrieve -> use -> extract/update)
 * - Reasoning and deliberation (self-critique refinement)
 * - Retrieval/Research (knowledge base; optional MCP/web)
 *
 * Design goals:
 * - Single orchestrator entry point with a stable “contract” (request/result)
 * - Deterministic options tree to compose modules based on context
 * - Reasoning trace for transparency and evaluation
 * - Minimal coupling: depends on existing services through imports
 */

import { unifiedMessageAnalysisService } from './core/message-analysis.service.js';
import { UserMemoryService } from '../memory/user-memory.service.js';
import { knowledgeBaseService } from './knowledge-base.service.js';
import { SelfCritiqueService } from './self-critique.service.js';
import type { ChatMessage } from './context-manager.js';
import { logger } from '../utils/logger.js';

// Optional dependencies (loaded lazily if present/needed)
type Optional<T> = T | undefined | null;

export type InputType = 'message' | 'task' | 'reply';
export type CognitiveOperation = 'processing' | 'reasoning' | 'understanding' | 'retrieval' | 'research';

export interface PipelineRequest {
  inputType: InputType;
  operation: CognitiveOperation;
  userId: string;
  guildId?: string | null;
  channelId?: string | null;
  prompt: string;
  attachments?: Array<{ name: string; url: string; contentType?: string }>;
  history?: ChatMessage[];
  systemPrompt?: string;
}

export interface PipelineDecisionNode {
  step: string;
  rationale: string;
  data?: any;
}

export interface PipelineResult {
  status: 'complete' | 'partial' | 'fallback' | 'error';
  content?: string;
  files?: Array<{ attachment: Buffer | string; name: string }>; // passthrough for Discord.js
  embeds?: any[];
  confidence: number; // 0..1 overall confidence
  provider?: string;
  model?: string;
  reasoningTrace: PipelineDecisionNode[];
  usedCapabilities: string[];
  memoryUpdated?: boolean;
}

interface OptionsTreeRule {
  id: string;
  when: (req: PipelineRequest) => boolean;
  compose: Array<keyof UnifiedCognitivePipeline['modules']>;
  rationale: string;
}

export class UnifiedCognitivePipeline {
  private memory = new UserMemoryService();
  private selfCritique = new SelfCritiqueService({ enabled: process.env.ENABLE_SELF_CRITIQUE === 'true' });

  // Modules available to the pipeline; each returns partial outputs and can append to trace
  public readonly modules = {
    featureExtraction: async (req: PipelineRequest, trace: PipelineDecisionNode[]) => {
      const analysis = await unifiedMessageAnalysisService.analyzeMessage(
        req.prompt,
        (req.attachments || []).map((a) => ({ name: a.name, url: a.url, contentType: a.contentType })),
        undefined
      );
      trace.push({ step: 'featureExtraction', rationale: 'Extract intents, complexity, capabilities', data: analysis });
      return { analysis };
    },

    retrieveMemory: async (req: PipelineRequest, trace: PipelineDecisionNode[]) => {
      const memoryCtx = await this.memory.getMemoryContext(req.userId, req.guildId ?? undefined);
      if (memoryCtx) trace.push({ step: 'retrieveMemory', rationale: 'Load user profile and preferences', data: memoryCtx });
      return { memoryCtx };
    },

    routeCapabilities: async (
      req: PipelineRequest,
      trace: PipelineDecisionNode[],
      deps: { analysis: any }
    ) => {
      // This is a placeholder for a real routing service.
      const routing = { confidence: 0.8, preferredProvider: 'default', capabilities: {} };
      trace.push({ step: 'routeCapabilities', rationale: 'Map analysis to services/provider/capabilities', data: routing });
      return { routing };
    },

    retrieveKnowledge: async (
      req: PipelineRequest,
      trace: PipelineDecisionNode[],
      _deps: { analysis: any }
    ) => {
      // Lightweight retrieval from KB; web/MCP is delegated to host service if needed
      const kb = await knowledgeBaseService.search({ query: req.prompt, guildId: req.guildId || undefined, limit: 5 });
      if (kb.length) trace.push({ step: 'retrieveKnowledge', rationale: 'Ground response with KB snippets', data: kb.map(k => ({ id: k.id, confidence: k.confidence })) });
      const contextBlock = kb.length ? `\n\nGrounded context:\n${kb.map((e) => `- ${e.content}`).join('\n')}` : '';
      return { kb, contextBlock };
    },

    generateDraft: async (
      req: PipelineRequest,
      trace: PipelineDecisionNode[],
      deps: { routing: any | null; memoryCtx?: any; contextBlock?: string; analysis?: any }
    ) => {
      const history = req.history || [];
      const system = [
        deps.memoryCtx?.contextPrompt ? `User context: ${deps.memoryCtx.contextPrompt}` : '',
        'Be accurate and concise. Cite known facts; flag uncertainty.',
      ]
        .filter(Boolean)
        .join('\n');

      const sysPrompt = req.systemPrompt ? `${system}\n${req.systemPrompt}` : system;
      const augmentedPrompt = deps.contextBlock ? `${req.prompt}${deps.contextBlock}` : req.prompt;

      // This is a placeholder for a real model router service.
      const draft = "This is a placeholder draft response.";
      trace.push({ step: 'generateDraft', rationale: 'Initial draft via model router', data: { length: draft?.length || 0, provider: 'default' } });
      return { draft };
    },

    deliberateRefine: async (
      req: PipelineRequest,
      trace: PipelineDecisionNode[],
      deps: { draft: string }
    ) => {
      const refined = await this.selfCritique.critiqueAndRefine(req.prompt, deps.draft, req.history || []);
      const changed = refined && refined.trim() !== (deps.draft || '').trim();
      trace.push({ step: 'deliberateRefine', rationale: 'Self-critique to improve truthfulness and clarity', data: { changed } });
      return { final: changed ? refined : deps.draft };
    },

    extractAndStoreMemory: async (
      req: PipelineRequest,
      trace: PipelineDecisionNode[],
      deps: { final: string }
    ) => {
      let updated = false;
      try {
        updated = await this.memory.processConversation({
          userId: req.userId,
          guildId: req.guildId ?? undefined,
          channelId: req.channelId ?? undefined,
          messageContent: req.prompt,
          responseContent: deps.final,
        });
      } catch {}
      if (updated) trace.push({ step: 'extractAndStoreMemory', rationale: 'Update episodic/user memory from exchange' });
      return { memoryUpdated: updated };
    },
  } as const;

  // Options tree: maps (inputType, operation) -> ordered module pipeline
  private readonly optionsTree: OptionsTreeRule[] = [
    {
      id: 'message-processing-default',
      when: (r) => r.inputType === 'message' && r.operation === 'processing',
      compose: ['featureExtraction', 'retrieveMemory', 'routeCapabilities', 'retrieveKnowledge', 'generateDraft', 'deliberateRefine', 'extractAndStoreMemory'],
      rationale: 'Standard conversational processing path'
    },
    {
      id: 'message-reasoning-deep',
      when: (r) => r.inputType === 'message' && r.operation === 'reasoning',
      compose: ['featureExtraction', 'retrieveMemory', 'routeCapabilities', 'retrieveKnowledge', 'generateDraft', 'deliberateRefine', 'extractAndStoreMemory'],
      rationale: 'Deep reasoning uses same modules with critique emphasis'
    },
    {
      id: 'task-retrieval-prioritized',
      when: (r) => r.inputType === 'task' && (r.operation === 'retrieval' || r.operation === 'research'),
      compose: ['featureExtraction', 'retrieveKnowledge', 'retrieveMemory', 'generateDraft', 'deliberateRefine', 'extractAndStoreMemory'],
      rationale: 'Prioritize grounded retrieval for tasks before generation'
    },
    {
      id: 'reply-understanding',
      when: (r) => r.inputType === 'reply' && r.operation === 'understanding',
      compose: ['featureExtraction', 'retrieveMemory', 'generateDraft', 'deliberateRefine', 'extractAndStoreMemory'],
      rationale: 'Summarize/understand context with light routing'
    },
  ];

  async execute(req: PipelineRequest): Promise<PipelineResult> {
    const trace: PipelineDecisionNode[] = [];
      let capabilities: string[] = [];
      let memoryCtx: any | null = null;
      let contextBlock: string | null = null;
      let analysis: any | null = null;
      let draft: string | null = null;
      let revised: string | null = null;
      let final: string | null = null;
      let verification: any | null = null;

    try {
      // Pick composition via options tree
      const rule = this.optionsTree.find((r) => r.when(req));
      const compose = rule?.compose || this.optionsTree[0].compose; // default to first
      trace.push({ step: 'selectOptions', rationale: rule?.rationale || 'Default path selected', data: { ruleId: rule?.id } });

      const outputs: Record<string, any> = {};
      const usedCapabilities: string[] = [];

      for (const mod of compose) {
        // Execute modules in order with dependency passing
        const out = await (this.modules as any)[mod](req, trace, { ...outputs });
        Object.assign(outputs, out);
      }

      final = outputs.final ?? outputs.draft ?? '';
      const confidence = this.estimateConfidence({ final: final || '', trace });

      return {
        status: 'complete',
        content: final ?? undefined,
        confidence,
        reasoningTrace: trace,
        usedCapabilities: capabilities,
      };
    } catch (error) {
      logger.warn('[UnifiedPipeline] Error in execution; falling back', { error: String(error) });
      trace.push({ step: 'error', rationale: 'Unhandled error in pipeline', data: { error: String(error) } });
      return { status: 'error', content: 'Sorry, I had trouble processing that.', confidence: 0.3, reasoningTrace: trace, usedCapabilities: [] };
    }
  }

  private estimateConfidence(input: { final: string; trace: PipelineDecisionNode[] }): number {
    // Placeholder confidence estimation
    return 0.9;
  }
}

export const unifiedCognitivePipeline = new UnifiedCognitivePipeline();
