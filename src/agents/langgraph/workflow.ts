// @ts-nocheck
import { getEnvAsBoolean } from '../../utils/env.js';

export interface AgentState {
  query: string;
  intent?: string;
  results?: unknown[];
}

export class LangGraphWorkflow {
  private ready = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private graph: any;

  async init(): Promise<boolean> {
    if (this.ready) return true;
    if (!getEnvAsBoolean('FEATURE_LANGGRAPH', false)) return false;
    try {
      const { StateGraph, END } = await import('@langchain/langgraph');
      // Minimal skeleton
      const workflow = new StateGraph({
        channels: {
          query: 'input',
          intent: 'memory',
          results: 'memory'
        }
      });
      workflow.addNode('analyze', async (state) => {
        return { ...state, intent: 'general' };
      });
      workflow.addEdge('analyze', END);
      this.graph = workflow.compile();
      this.ready = true;
      return true;
    } catch {
      return false;
    }
  }

  async run(state: AgentState): Promise<AgentState> {
    if (!(await this.init()) || !this.graph) return state;
    const out = await this.graph.invoke(state);
    return out as AgentState;
  }
}

export const langGraphWorkflow = new LangGraphWorkflow();