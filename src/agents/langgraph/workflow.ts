import { getEnvAsBoolean } from '../../utils/env.js';
import { StateGraph, END, START } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// TASK-020: Advanced LangGraph Agentic Workflows for Complex Reasoning

export interface ComplexAgentState {
  messages: BaseMessage[];
  query: string;
  intent?: string;
  reasoning_steps?: string[];
  research_results?: unknown[];
  analysis_results?: unknown[];
  final_answer?: string;
  confidence_score?: number;
  requires_human_review?: boolean;
  metadata?: Record<string, unknown>;
  iteration_count?: number;
  max_iterations?: number;
}

export interface ReasoningContext {
  domain: string;
  complexity: 'low' | 'medium' | 'high' | 'expert';
  requires_research: boolean;
  requires_analysis: boolean;
  requires_verification: boolean;
  time_sensitivity: 'immediate' | 'standard' | 'extended';
}

// Research Tool
const researchTool = new StructuredTool({
  name: 'research',
  description: 'Conduct comprehensive research on a topic',
  schema: z.object({
    query: z.string().describe('Research query'),
    sources: z.number().default(5).describe('Number of sources to search'),
    depth: z.enum(['surface', 'moderate', 'deep']).default('moderate')
  }),
  func: async (input) => {
    // Simulate research functionality
    return {
      results: [`Research result for: ${input.query}`],
      sources: Array.from({ length: input.sources }, (_, i) => `source_${i + 1}`),
      confidence: 0.85
    };
  }
});

// Analysis Tool
const analysisTool = new StructuredTool({
  name: 'analyze',
  description: 'Perform deep analysis on provided data',
  schema: z.object({
    data: z.string().describe('Data to analyze'),
    analysis_type: z.enum(['statistical', 'logical', 'technical', 'creative']),
    detail_level: z.enum(['summary', 'detailed', 'comprehensive']).default('detailed')
  }),
  func: async (input) => {
    return {
      analysis: `${input.analysis_type} analysis of: ${input.data}`,
      insights: ['Key insight 1', 'Key insight 2', 'Key insight 3'],
      confidence: 0.88,
      recommendations: ['Recommendation 1', 'Recommendation 2']
    };
  }
});

// Verification Tool
const verificationTool = new StructuredTool({
  name: 'verify',
  description: 'Verify facts and cross-reference information',
  schema: z.object({
    claims: z.array(z.string()).describe('Claims to verify'),
    sources: z.array(z.string()).optional().describe('Sources to check against')
  }),
  func: async (input) => {
    return {
      verified_claims: input.claims.map(claim => ({
        claim,
        verified: Math.random() > 0.3,
        confidence: Math.random() * 0.4 + 0.6,
        sources: ['verification_source_1', 'verification_source_2']
      })),
      overall_reliability: 0.82
    };
  }
});

export class AdvancedLangGraphWorkflow {
  private ready = false;
  private graph: Runnable | null = null;
  private tools: StructuredTool[] = [researchTool, analysisTool, verificationTool];

  async init(): Promise<boolean> {
    if (this.ready) return true;
    if (!getEnvAsBoolean('FEATURE_LANGGRAPH', false)) return false;

    try {
      const workflow = new StateGraph({
        channels: {
          messages: { value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y), default: () => [] },
          query: { value: null, default: () => '' },
          intent: { value: null, default: () => undefined },
          reasoning_steps: { value: (x: string[], y: string[]) => x.concat(y), default: () => [] },
          research_results: { value: (x: unknown[], y: unknown[]) => x.concat(y), default: () => [] },
          analysis_results: { value: (x: unknown[], y: unknown[]) => x.concat(y), default: () => [] },
          final_answer: { value: null, default: () => undefined },
          confidence_score: { value: null, default: () => 0 },
          requires_human_review: { value: null, default: () => false },
          metadata: { value: (x: Record<string, unknown>, y: Record<string, unknown>) => ({ ...x, ...y }), default: () => ({}) },
          iteration_count: { value: null, default: () => 0 },
          max_iterations: { value: null, default: () => 5 }
        }
      });

      // Intent Analysis Node
      workflow.addNode('analyze_intent', async (state: ComplexAgentState) => {
        const query = state.query.toLowerCase();
        
        // Advanced intent classification
        const intents = {
          research: /(research|investigate|find out|explore|study|examine)/.test(query),
          analysis: /(analyz|evaluat|assess|compar|review|critic)/.test(query),
          creative: /(creat|generat|design|brainstorm|innovat|imagin)/.test(query),
          technical: /(code|debug|implement|architect|deploy|optimi[sz])/.test(query),
          problem_solving: /(solv|fix|resolv|troubleshoot|debug|repair)/.test(query),
          explanation: /(explain|clarify|describe|tell me|what is|how does)/.test(query),
          synthesis: /(summari[sz]e|synthesiz|combin|integrat|consolid)/.test(query)
        };

        const detectedIntents = Object.entries(intents)
          .filter(([, matches]) => matches)
          .map(([intent]) => intent);

        const primaryIntent = detectedIntents[0] || 'general';
        
        const reasoning_steps = [
          `Analyzed query: "${state.query}"`,
          `Detected intents: ${detectedIntents.join(', ') || 'general'}`,
          `Primary intent classified as: ${primaryIntent}`
        ];

        return {
          ...state,
          intent: primaryIntent,
          reasoning_steps,
          iteration_count: (state.iteration_count || 0) + 1
        };
      });

      // Context Assessment Node
      workflow.addNode('assess_context', async (state: ComplexAgentState) => {
        const context: ReasoningContext = {
          domain: this.inferDomain(state.query),
          complexity: this.assessComplexity(state.query),
          requires_research: /(research|find|search|investigate)/.test(state.query.toLowerCase()),
          requires_analysis: /(analy|evaluat|assess|compar)/.test(state.query.toLowerCase()),
          requires_verification: /(verify|check|confirm|validat)/.test(state.query.toLowerCase()),
          time_sensitivity: this.assessTimeSensitivity(state.query)
        };

        const reasoning_steps = [
          `Domain assessed as: ${context.domain}`,
          `Complexity level: ${context.complexity}`,
          `Research required: ${context.requires_research}`,
          `Analysis required: ${context.requires_analysis}`,
          `Verification required: ${context.requires_verification}`,
          `Time sensitivity: ${context.time_sensitivity}`
        ];

        return {
          ...state,
          reasoning_steps: [...(state.reasoning_steps || []), ...reasoning_steps],
          metadata: { ...state.metadata, context },
          iteration_count: (state.iteration_count || 0) + 1
        };
      });

      // Research Node
      workflow.addNode('conduct_research', async (state: ComplexAgentState) => {
        if (!state.metadata?.context?.requires_research) {
          return state;
        }

        try {
          const researchResult = await researchTool.func({
            query: state.query,
            sources: 7,
            depth: 'deep'
          });

          const reasoning_steps = [
            'Initiated comprehensive research phase',
            `Conducted research with ${researchResult.sources.length} sources`,
            `Research confidence: ${researchResult.confidence}`
          ];

          return {
            ...state,
            research_results: [...(state.research_results || []), researchResult],
            reasoning_steps: [...(state.reasoning_steps || []), ...reasoning_steps],
            iteration_count: (state.iteration_count || 0) + 1
          };
        } catch (error) {
          return {
            ...state,
            reasoning_steps: [...(state.reasoning_steps || []), `Research failed: ${error}`],
            iteration_count: (state.iteration_count || 0) + 1
          };
        }
      });

      // Analysis Node
      workflow.addNode('perform_analysis', async (state: ComplexAgentState) => {
        if (!state.metadata?.context?.requires_analysis) {
          return state;
        }

        try {
          const analysisResult = await analysisTool.func({
            data: JSON.stringify({
              query: state.query,
              research: state.research_results,
              intent: state.intent
            }),
            analysis_type: 'logical',
            detail_level: 'comprehensive'
          });

          const reasoning_steps = [
            'Initiated deep analysis phase',
            `Analysis type: logical reasoning`,
            `Generated ${analysisResult.insights.length} key insights`,
            `Analysis confidence: ${analysisResult.confidence}`
          ];

          return {
            ...state,
            analysis_results: [...(state.analysis_results || []), analysisResult],
            reasoning_steps: [...(state.reasoning_steps || []), ...reasoning_steps],
            iteration_count: (state.iteration_count || 0) + 1
          };
        } catch (error) {
          return {
            ...state,
            reasoning_steps: [...(state.reasoning_steps || []), `Analysis failed: ${error}`],
            iteration_count: (state.iteration_count || 0) + 1
          };
        }
      });

      // Synthesis Node
      workflow.addNode('synthesize_response', async (state: ComplexAgentState) => {
        const hasResearch = (state.research_results || []).length > 0;
        const hasAnalysis = (state.analysis_results || []).length > 0;
        
        let final_answer = `Based on the query "${state.query}":`;
        
        if (hasResearch) {
          final_answer += '\n\nResearch Findings:\n';
          state.research_results?.forEach((result: any, i) => {
            final_answer += `- Research ${i + 1}: ${result.results?.[0] || 'No results'}\n`;
          });
        }

        if (hasAnalysis) {
          final_answer += '\n\nAnalysis Results:\n';
          state.analysis_results?.forEach((result: any, i) => {
            final_answer += `- Analysis ${i + 1}: ${result.analysis || 'No analysis'}\n`;
            if (result.insights) {
              final_answer += `  Insights: ${result.insights.join(', ')}\n`;
            }
          });
        }

        // Calculate confidence score
        const researchConfidence = hasResearch ? 
          (state.research_results?.reduce((acc: number, r: any) => acc + (r.confidence || 0), 0) || 0) / (state.research_results?.length || 1) : 0;
        const analysisConfidence = hasAnalysis ?
          (state.analysis_results?.reduce((acc: number, r: any) => acc + (r.confidence || 0), 0) || 0) / (state.analysis_results?.length || 1) : 0;
        
        const confidence_score = hasResearch && hasAnalysis ? 
          (researchConfidence + analysisConfidence) / 2 :
          hasResearch ? researchConfidence :
          hasAnalysis ? analysisConfidence : 0.5;

        const requires_human_review = confidence_score < 0.7 || 
          (state.metadata?.context?.complexity === 'expert');

        const reasoning_steps = [
          'Synthesizing comprehensive response',
          `Combined research and analysis results`,
          `Final confidence score: ${confidence_score.toFixed(2)}`,
          `Human review required: ${requires_human_review}`
        ];

        return {
          ...state,
          final_answer,
          confidence_score,
          requires_human_review,
          reasoning_steps: [...(state.reasoning_steps || []), ...reasoning_steps],
          iteration_count: (state.iteration_count || 0) + 1
        };
      });

      // Quality Check Node
      workflow.addNode('quality_check', async (state: ComplexAgentState) => {
        const issues: string[] = [];
        
        if (!state.final_answer || state.final_answer.length < 50) {
          issues.push('Response too brief');
        }
        
        if ((state.confidence_score || 0) < 0.6) {
          issues.push('Low confidence score');
        }
        
        if ((state.iteration_count || 0) > (state.max_iterations || 5)) {
          issues.push('Exceeded maximum iterations');
        }

        const quality_passed = issues.length === 0;
        
        const reasoning_steps = [
          'Performing quality assurance check',
          `Issues identified: ${issues.length > 0 ? issues.join(', ') : 'None'}`,
          `Quality check: ${quality_passed ? 'PASSED' : 'FAILED'}`
        ];

        return {
          ...state,
          reasoning_steps: [...(state.reasoning_steps || []), ...reasoning_steps],
          metadata: { 
            ...state.metadata, 
            quality_check: {
              passed: quality_passed,
              issues,
              timestamp: new Date().toISOString()
            }
          }
        };
      });

      // Add edges with conditional routing
      workflow.addEdge(START, 'analyze_intent');
      workflow.addEdge('analyze_intent', 'assess_context');
      
      workflow.addConditionalEdges(
        'assess_context',
        (state: ComplexAgentState) => {
          return state.metadata?.context?.requires_research ? 'research' : 'analysis';
        },
        {
          research: 'conduct_research',
          analysis: 'perform_analysis'
        }
      );
      
      workflow.addEdge('conduct_research', 'perform_analysis');
      workflow.addEdge('perform_analysis', 'synthesize_response');
      workflow.addEdge('synthesize_response', 'quality_check');
      
      workflow.addConditionalEdges(
        'quality_check',
        (state: ComplexAgentState) => {
          const qualityPassed = state.metadata?.quality_check?.passed;
          const iterations = state.iteration_count || 0;
          const maxIterations = state.max_iterations || 5;
          
          if (!qualityPassed && iterations < maxIterations) {
            return 'retry';
          }
          return 'end';
        },
        {
          retry: 'assess_context',
          end: END
        }
      );

      this.graph = workflow.compile();
      this.ready = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize advanced LangGraph workflow:', error);
      return false;
    }
  }

  private inferDomain(query: string): string {
    const domains = {
      technology: /(code|programming|software|tech|AI|ML|data|algorithm|system|architecture)/.test(query.toLowerCase()),
      science: /(research|study|experiment|hypothesis|theory|scientific|analysis)/.test(query.toLowerCase()),
      business: /(market|business|strategy|finance|revenue|profit|growth|competition)/.test(query.toLowerCase()),
      creative: /(design|art|creative|content|story|music|visual|brand)/.test(query.toLowerCase()),
      education: /(learn|teach|education|course|training|knowledge|skill)/.test(query.toLowerCase())
    };

    return Object.entries(domains).find(([, matches]) => matches)?.[0] || 'general';
  }

  private assessComplexity(query: string): 'low' | 'medium' | 'high' | 'expert' {
    const indicators = {
      expert: /(architect|design|implement|optimize|scale|enterprise|production|advanced)/.test(query.toLowerCase()),
      high: /(complex|comprehensive|detailed|thorough|in-depth|analysis|strategy)/.test(query.toLowerCase()),
      medium: /(explain|compare|evaluate|assess|review|analyze)/.test(query.toLowerCase()),
      low: /(what|how|when|where|simple|basic|quick)/.test(query.toLowerCase())
    };

    for (const [level, matches] of Object.entries(indicators)) {
      if (matches) return level as 'low' | 'medium' | 'high' | 'expert';
    }
    
    return 'medium';
  }

  private assessTimeSensitivity(query: string): 'immediate' | 'standard' | 'extended' {
    if (/(urgent|immediate|now|asap|emergency|critical)/.test(query.toLowerCase())) {
      return 'immediate';
    }
    if (/(comprehensive|thorough|detailed|research|study)/.test(query.toLowerCase())) {
      return 'extended';
    }
    return 'standard';
  }

  async execute(query: string, options?: Partial<ComplexAgentState>): Promise<ComplexAgentState> {
    if (!(await this.init()) || !this.graph) {
      throw new Error('LangGraph workflow not initialized');
    }

    const initialState: ComplexAgentState = {
      messages: [new HumanMessage(query)],
      query,
      max_iterations: 5,
      iteration_count: 0,
      ...options
    };

    try {
      const result = await this.graph.invoke(initialState);
      return result as ComplexAgentState;
    } catch (error) {
      console.error('LangGraph workflow execution failed:', error);
      throw error;
    }
  }

  async streamExecution(query: string, options?: Partial<ComplexAgentState>): Promise<AsyncIterable<ComplexAgentState>> {
    if (!(await this.init()) || !this.graph) {
      throw new Error('LangGraph workflow not initialized');
    }

    const initialState: ComplexAgentState = {
      messages: [new HumanMessage(query)],
      query,
      max_iterations: 5,
      iteration_count: 0,
      ...options
    };

    try {
      return this.graph.stream(initialState);
    } catch (error) {
      console.error('LangGraph workflow streaming failed:', error);
      throw error;
    }
  }

  getAvailableTools(): StructuredTool[] {
    return this.tools;
  }

  isReady(): boolean {
    return this.ready;
  }
}

// Legacy simple workflow for backward compatibility
export interface AgentState {
  query: string;
  intent?: string;
  results?: unknown[];
}

export class LangGraphWorkflow {
  private advancedWorkflow = new AdvancedLangGraphWorkflow();

  async init(): Promise<boolean> {
    return this.advancedWorkflow.init();
  }

  async run(state: AgentState): Promise<AgentState> {
    try {
      const result = await this.advancedWorkflow.execute(state.query);
      return {
        query: state.query,
        intent: result.intent,
        results: [result.final_answer]
      };
    } catch {
      return state;
    }
  }
}

export const langGraphWorkflow = new LangGraphWorkflow();
export const advancedLangGraphWorkflow = new AdvancedLangGraphWorkflow();