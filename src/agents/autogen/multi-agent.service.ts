// ADVANCED AUTOGEN MULTI-AGENT FRAMEWORK INTEGRATION
// Implements Microsoft AutoGen for advanced multi-agent conversations and collaborative problem solving

import { EventEmitter } from 'events';
import { getEnvAsString } from '../../utils/env.js';
import { z } from 'zod';
import OpenAI from 'openai';

// AutoGen Agent Schemas
const AutoGenAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['assistant', 'user_proxy', 'function_caller', 'code_executor', 'critic', 'planner']),
  system_message: z.string(),
  llm_config: z.object({
    model: z.string(),
    temperature: z.number().default(0.7),
    max_tokens: z.number().default(2000),
    functions: z.array(z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.record(z.unknown())
    })).optional()
  }),
  human_input_mode: z.enum(['NEVER', 'TERMINATE', 'ALWAYS']).default('NEVER'),
  max_consecutive_auto_reply: z.number().default(10),
  code_execution_config: z.object({
    work_dir: z.string().optional(),
    use_docker: z.boolean().default(false),
    timeout: z.number().default(60)
  }).optional(),
  capabilities: z.array(z.string()).default([]),
  memory: z.object({
    type: z.enum(['none', 'short_term', 'long_term']).default('short_term'),
    max_messages: z.number().default(100)
  }).default({ type: 'short_term', max_messages: 100 })
});

const ConversationSchema = z.object({
  id: z.string(),
  participants: z.array(z.string()),
  task: z.string(),
  context: z.record(z.unknown()).optional(),
  max_rounds: z.number().default(20),
  termination_keywords: z.array(z.string()).default(['TERMINATE']),
  created_at: z.date().default(() => new Date()),
  status: z.enum(['active', 'completed', 'terminated', 'error']).default('active')
});

type AutoGenAgent = z.infer<typeof AutoGenAgentSchema>;
type Conversation = z.infer<typeof ConversationSchema>;

interface ConversationMessage {
  agent_id: string;
  content: string;
  role: 'assistant' | 'user' | 'system' | 'function';
  timestamp: Date;
  function_call?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  function_response?: {
    name: string;
    content: string;
  };
  metadata?: Record<string, unknown>;
}

interface AutoGenMetrics {
  total_conversations: number;
  active_conversations: number;
  average_conversation_length: number;
  success_rate: number;
  agent_utilization: Record<string, number>;
  collaboration_effectiveness: number;
}

class AutoGenMultiAgentService extends EventEmitter {
  private isInitialized = false;
  private agents: Map<string, AutoGenAgent> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private conversationHistory: Map<string, ConversationMessage[]> = new Map();
  private openaiClient: OpenAI | null = null;
  
  private metrics: AutoGenMetrics = {
    total_conversations: 0,
    active_conversations: 0,
    average_conversation_length: 0,
    success_rate: 0,
    agent_utilization: {},
    collaboration_effectiveness: 0.85
  };

  constructor() {
    super();
    this.setupDefaultAgents();
  }

  async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('🤖 Initializing AutoGen Multi-Agent Framework...');

      // Initialize OpenAI client
      const openaiApiKey = getEnvAsString('OPENAI_API_KEY');
      if (openaiApiKey) {
        this.openaiClient = new OpenAI({ apiKey: openaiApiKey });
      }

      // Validate agent configurations
      await this.validateAgentConfigurations();

      // Setup agent interactions
      this.setupAgentInteractions();

      this.isInitialized = true;
      console.log('✅ AutoGen Multi-Agent Framework initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize AutoGen Multi-Agent Framework:', error);
      return false;
    }
  }

  private setupDefaultAgents(): void {
    // Primary Assistant Agent
    this.agents.set('primary_assistant', {
      id: 'primary_assistant',
      name: 'Primary Assistant',
      role: 'assistant',
      system_message: `You are a highly capable AI assistant specialized in problem-solving and collaboration. 
        You work with other agents to provide comprehensive solutions. Always be clear, helpful, and coordinate 
        effectively with team members.`,
      llm_config: {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000
      },
      human_input_mode: 'NEVER',
      max_consecutive_auto_reply: 10,
      capabilities: ['general_assistance', 'problem_solving', 'coordination']
    });

    // Code Executor Agent
    this.agents.set('code_executor', {
      id: 'code_executor',
      name: 'Code Executor',
      role: 'code_executor',
      system_message: `You are a code execution specialist. You can write, review, and execute code safely. 
        You focus on providing working implementations and debugging solutions. Always validate code before execution.`,
      llm_config: {
        model: 'gpt-4',
        temperature: 0.3,
        max_tokens: 2000,
        functions: [
          {
            name: 'execute_code',
            description: 'Execute Python code safely',
            parameters: {
              type: 'object',
              properties: {
                code: { type: 'string', description: 'Python code to execute' },
                timeout: { type: 'number', description: 'Execution timeout in seconds' }
              },
              required: ['code']
            }
          }
        ]
      },
      human_input_mode: 'NEVER',
      code_execution_config: {
        work_dir: '/tmp/autogen_code',
        use_docker: false,
        timeout: 60
      },
      capabilities: ['code_execution', 'debugging', 'implementation']
    });

    // Critic Agent
    this.agents.set('critic', {
      id: 'critic',
      name: 'Quality Critic',
      role: 'critic',
      system_message: `You are a quality assurance specialist who critically evaluates solutions, code, and responses. 
        Your role is to identify potential issues, suggest improvements, and ensure high-quality outputs. 
        Be constructive and specific in your feedback.`,
      llm_config: {
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 2000
      },
      human_input_mode: 'NEVER',
      capabilities: ['quality_assurance', 'code_review', 'solution_validation']
    });

    // Research Specialist
    this.agents.set('researcher', {
      id: 'researcher',
      name: 'Research Specialist',
      role: 'assistant',
      system_message: `You are a research specialist focused on gathering information, analyzing data, and providing 
        evidence-based insights. You excel at finding relevant sources and synthesizing complex information.`,
      llm_config: {
        model: 'gpt-4',
        temperature: 0.6,
        max_tokens: 2000
      },
      human_input_mode: 'NEVER',
      capabilities: ['research', 'data_analysis', 'information_synthesis']
    });

    // Planning Agent
    this.agents.set('planner', {
      id: 'planner',
      name: 'Strategic Planner',
      role: 'planner',
      system_message: `You are a strategic planning specialist who breaks down complex tasks into manageable steps, 
        coordinates team efforts, and ensures efficient problem-solving workflows. Focus on organization and efficiency.`,
      llm_config: {
        model: 'gpt-4',
        temperature: 0.4,
        max_tokens: 2000
      },
      human_input_mode: 'NEVER',
      capabilities: ['strategic_planning', 'task_decomposition', 'workflow_optimization']
    });
  }

  async startConversation(
    task: string, 
    participantIds: string[], 
    options: {
      max_rounds?: number;
      context?: Record<string, unknown>;
      termination_keywords?: string[];
    } = {}
  ): Promise<string> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const conversation: Conversation = {
      id: conversationId,
      participants: participantIds,
      task,
      context: options.context,
      max_rounds: options.max_rounds || 20,
      termination_keywords: options.termination_keywords || ['TERMINATE', 'TASK_COMPLETE'],
      created_at: new Date(),
      status: 'active'
    };

    this.conversations.set(conversationId, conversation);
    this.conversationHistory.set(conversationId, []);
    this.metrics.total_conversations++;
    this.metrics.active_conversations++;

    console.log(`🔄 Starting AutoGen conversation ${conversationId} with ${participantIds.length} agents`);
    
    // Initialize conversation with task description
    await this.addMessage(conversationId, 'system', `TASK: ${task}`, {
      context: options.context,
      participants: participantIds
    });

    this.emit('conversation_started', {
      conversation_id: conversationId,
      task,
      participants: participantIds
    });

    return conversationId;
  }

  async executeConversation(conversationId: string): Promise<{
    success: boolean;
    messages: ConversationMessage[];
    result?: string;
    error?: string;
  }> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    try {
      let roundCount = 0;
      let currentSpeakerIndex = 0;
      const participants = conversation.participants;

      while (roundCount < conversation.max_rounds && conversation.status === 'active') {
        const currentAgent = this.agents.get(participants[currentSpeakerIndex]);
        if (!currentAgent) {
          console.warn(`Agent ${participants[currentSpeakerIndex]} not found, skipping`);
          currentSpeakerIndex = (currentSpeakerIndex + 1) % participants.length;
          continue;
        }

        // Generate response from current agent
        const response = await this.generateAgentResponse(
          conversationId,
          currentAgent,
          conversation.task
        );

        if (response) {
          await this.addMessage(conversationId, currentAgent.id, response, {
            agent_name: currentAgent.name,
            agent_role: currentAgent.role,
            round: roundCount
          });

          // Check for termination keywords
          const shouldTerminate = conversation.termination_keywords.some(keyword =>
            response.toUpperCase().includes(keyword.toUpperCase())
          );

          if (shouldTerminate) {
            conversation.status = 'completed';
            console.log(`✅ Conversation ${conversationId} completed after ${roundCount + 1} rounds`);
            break;
          }
        }

        roundCount++;
        currentSpeakerIndex = (currentSpeakerIndex + 1) % participants.length;
      }

      if (roundCount >= conversation.max_rounds) {
        conversation.status = 'terminated';
        console.log(`⏰ Conversation ${conversationId} terminated due to max rounds limit`);
      }

      this.metrics.active_conversations--;
      this.updateMetrics(conversationId);

      const messages = this.conversationHistory.get(conversationId) || [];
      const finalResult = this.synthesizeConversationResult(messages);

      this.emit('conversation_completed', {
        conversation_id: conversationId,
        status: conversation.status,
        rounds: roundCount,
        result: finalResult
      });

      return {
        success: conversation.status === 'completed',
        messages,
        result: finalResult
      };

    } catch (error) {
      conversation.status = 'error';
      this.metrics.active_conversations--;
      
      console.error(`❌ Error in conversation ${conversationId}:`, error);
      
      return {
        success: false,
        messages: this.conversationHistory.get(conversationId) || [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async generateAgentResponse(
    conversationId: string,
    agent: AutoGenAgent,
    originalTask: string
  ): Promise<string | null> {
    if (!this.openaiClient) {
      console.warn('OpenAI client not available, using mock response');
      return `[${agent.name}] Working on the task: ${originalTask}`;
    }

    try {
      const conversationHistory = this.conversationHistory.get(conversationId) || [];
      const recentMessages = conversationHistory.slice(-5); // Last 5 messages for context

      const contextMessages = [
        {
          role: 'system' as const,
          content: agent.system_message
        },
        ...recentMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: `[${msg.agent_id}] ${msg.content}`
        }))
      ];

      const response = await this.openaiClient.chat.completions.create({
        model: agent.llm_config.model,
        messages: contextMessages,
        temperature: agent.llm_config.temperature,
        max_tokens: agent.llm_config.max_tokens
      });

      return response.choices[0]?.message?.content || null;

    } catch (error) {
      console.error(`Failed to generate response for agent ${agent.id}:`, error);
      return null;
    }
  }

  private async addMessage(
    conversationId: string,
    agentId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const message: ConversationMessage = {
      agent_id: agentId,
      content,
      role: agentId === 'system' ? 'system' : 'assistant',
      timestamp: new Date(),
      metadata
    };

    const history = this.conversationHistory.get(conversationId) || [];
    history.push(message);
    this.conversationHistory.set(conversationId, history);

    console.log(`💬 [${agentId}]: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
  }

  private synthesizeConversationResult(messages: ConversationMessage[]): string {
    const agentContributions = messages
      .filter(msg => msg.role === 'assistant' && msg.agent_id !== 'system')
      .map(msg => `${msg.agent_id}: ${msg.content}`)
      .join('\n\n');

    return `Collaborative Solution:\n\n${agentContributions}`;
  }

  private async validateAgentConfigurations(): Promise<void> {
    for (const [id, agent] of this.agents) {
      try {
        AutoGenAgentSchema.parse(agent);
      } catch (error) {
        console.warn(`Invalid configuration for agent ${id}:`, error);
      }
    }
  }

  private setupAgentInteractions(): void {
    // Setup event listeners for agent coordination
    this.on('conversation_started', (data) => {
      console.log(`🎯 AutoGen conversation initiated: ${data.task}`);
    });

    this.on('conversation_completed', (data) => {
      console.log(`🏆 AutoGen conversation completed with status: ${data.status}`);
    });
  }

  private updateMetrics(conversationId: string): void {
    const messages = this.conversationHistory.get(conversationId) || [];
    this.metrics.average_conversation_length = 
      (this.metrics.average_conversation_length + messages.length) / 2;

    // Update agent utilization
    messages.forEach(msg => {
      if (msg.agent_id !== 'system') {
        this.metrics.agent_utilization[msg.agent_id] = 
          (this.metrics.agent_utilization[msg.agent_id] || 0) + 1;
      }
    });

    // Calculate success rate
    const conversation = this.conversations.get(conversationId);
    if (conversation?.status === 'completed') {
      this.metrics.success_rate = 
        (this.metrics.success_rate + 1) / this.metrics.total_conversations;
    }
  }

  // Public API methods
  async createCustomAgent(config: Partial<AutoGenAgent>): Promise<string> {
    const agentId = config.id || `agent_${Date.now()}`;
    const agent = AutoGenAgentSchema.parse({
      id: agentId,
      name: config.name || 'Custom Agent',
      role: config.role || 'assistant',
      system_message: config.system_message || 'You are a helpful AI assistant.',
      llm_config: {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000,
        ...config.llm_config
      },
      ...config
    });

    this.agents.set(agentId, agent);
    console.log(`🤖 Created custom agent: ${agent.name} (${agentId})`);
    
    return agentId;
  }

  getAgents(): AutoGenAgent[] {
    return Array.from(this.agents.values());
  }

  getConversationHistory(conversationId: string): ConversationMessage[] | null {
    return this.conversationHistory.get(conversationId) || null;
  }

  getMetrics(): AutoGenMetrics {
    return { ...this.metrics };
  }

  async executeCollaborativeTask(task: string, requiredCapabilities: string[] = []): Promise<{
    success: boolean;
    result: string;
    conversation_id: string;
  }> {
    // Select agents based on required capabilities
    const suitableAgents = Array.from(this.agents.values())
      .filter(agent => 
        requiredCapabilities.length === 0 || 
        requiredCapabilities.some(cap => agent.capabilities.includes(cap))
      )
      .slice(0, 4) // Limit to 4 agents for manageable conversation
      .map(agent => agent.id);

    if (suitableAgents.length === 0) {
      suitableAgents.push('primary_assistant'); // Fallback
    }

    const conversationId = await this.startConversation(task, suitableAgents, {
      max_rounds: 15,
      context: { required_capabilities: requiredCapabilities }
    });

    const result = await this.executeConversation(conversationId);

    return {
      success: result.success,
      result: result.result || 'No result generated',
      conversation_id: conversationId
    };
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const autoGenMultiAgentService = new AutoGenMultiAgentService();