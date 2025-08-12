// TASK-030: Introduce CrewAI specialists for domain-specific tasks

import { getEnvAsBoolean, getEnvAsString } from '../../utils/env.js';
import { z } from 'zod';
import OpenAI from 'openai';

// Agent role definitions
const AgentRoleSchema = z.object({
  role: z.string(),
  goal: z.string(),
  backstory: z.string(),
  skills: z.array(z.string()),
  tools: z.array(z.string()),
  delegation: z.boolean().default(false),
  verbose: z.boolean().default(true),
  max_iter: z.number().default(5),
  memory: z.boolean().default(true),
  step_callback: z.function().optional(),
  system_template: z.string().optional()
});

const TaskSchema = z.object({
  description: z.string(),
  expected_output: z.string(),
  agent: z.string().optional(),
  tools: z.array(z.string()).default([]),
  async_execution: z.boolean().default(false),
  context: z.array(z.string()).default([]),
  output_json: z.object({}).optional(),
  output_pydantic: z.object({}).optional(),
  callback: z.function().optional()
});

const CrewConfigSchema = z.object({
  agents: z.array(AgentRoleSchema),
  tasks: z.array(TaskSchema),
  process: z.enum(['sequential', 'hierarchical']).default('sequential'),
  verbose: z.number().min(0).max(2).default(1),
  manager_llm: z.string().optional(),
  function_calling_llm: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  max_rpm: z.number().optional(),
  language: z.string().default('en'),
  memory: z.boolean().default(false),
  cache: z.boolean().default(true),
  output_log_file: z.string().optional()
});

type AgentRole = z.infer<typeof AgentRoleSchema>;
type Task = z.infer<typeof TaskSchema>;
type CrewConfig = z.infer<typeof CrewConfigSchema>;

interface CrewResult {
  id: string;
  timestamp: Date;
  crew_config: CrewConfig;
  execution_results: {
    tasks_completed: number;
    total_tasks: number;
    execution_time_ms: number;
    outputs: Array<{
      task_description: string;
      agent_role: string;
      output: string;
      execution_time: number;
      tokens_used?: number;
    }>;
    final_output: string;
    success: boolean;
    error_details?: string[];
  };
  metrics: {
    efficiency_score: number;
    quality_score: number;
    collaboration_score: number;
    token_usage: Record<string, number>;
  };
}

interface SpecialistAgent {
  role: string;
  expertise: string[];
  capabilities: string[];
  limitations: string[];
  preferred_tasks: string[];
  collaboration_style: string;
}

export class CrewAIOrchestrationService {
  private openai: OpenAI;
  private isInitialized = false;
  private specialists: Map<string, SpecialistAgent> = new Map();
  private activeCrews: Map<string, CrewResult> = new Map();
  private executionHistory: CrewResult[] = [];

  // Predefined specialist agents
  private defaultSpecialists: SpecialistAgent[] = [
    {
      role: 'Senior Software Engineer',
      expertise: ['software_development', 'architecture', 'code_review', 'debugging', 'optimization'],
      capabilities: ['code_generation', 'refactoring', 'testing', 'documentation', 'deployment'],
      limitations: ['ui_design', 'marketing', 'business_strategy'],
      preferred_tasks: ['implement_feature', 'debug_issue', 'optimize_performance', 'review_code'],
      collaboration_style: 'analytical_detailed'
    },
    {
      role: 'Data Scientist',
      expertise: ['machine_learning', 'statistics', 'data_analysis', 'predictive_modeling', 'visualization'],
      capabilities: ['data_preprocessing', 'model_training', 'feature_engineering', 'analysis_reporting'],
      limitations: ['web_development', 'infrastructure', 'legal_compliance'],
      preferred_tasks: ['analyze_data', 'build_model', 'create_insights', 'predict_trends'],
      collaboration_style: 'hypothesis_driven'
    },
    {
      role: 'Product Manager',
      expertise: ['product_strategy', 'user_research', 'market_analysis', 'feature_prioritization'],
      capabilities: ['roadmap_planning', 'stakeholder_management', 'requirements_gathering', 'metrics_analysis'],
      limitations: ['technical_implementation', 'detailed_coding', 'infrastructure'],
      preferred_tasks: ['define_requirements', 'prioritize_features', 'analyze_market', 'plan_roadmap'],
      collaboration_style: 'strategic_collaborative'
    },
    {
      role: 'DevOps Engineer',
      expertise: ['infrastructure', 'deployment', 'monitoring', 'security', 'automation'],
      capabilities: ['ci_cd_setup', 'container_orchestration', 'cloud_management', 'performance_tuning'],
      limitations: ['business_strategy', 'ui_design', 'content_creation'],
      preferred_tasks: ['setup_infrastructure', 'automate_deployment', 'monitor_systems', 'ensure_security'],
      collaboration_style: 'systematic_reliable'
    },
    {
      role: 'UX Designer',
      expertise: ['user_experience', 'interface_design', 'usability', 'user_research', 'prototyping'],
      capabilities: ['wireframing', 'user_journey_mapping', 'design_systems', 'accessibility_review'],
      limitations: ['backend_development', 'data_science', 'infrastructure'],
      preferred_tasks: ['design_interface', 'improve_usability', 'research_users', 'create_prototypes'],
      collaboration_style: 'user_centered_iterative'
    },
    {
      role: 'Research Analyst',
      expertise: ['research_methodology', 'information_synthesis', 'trend_analysis', 'competitive_intelligence'],
      capabilities: ['market_research', 'literature_review', 'data_collection', 'report_writing'],
      limitations: ['software_development', 'design_implementation', 'technical_architecture'],
      preferred_tasks: ['conduct_research', 'analyze_competition', 'synthesize_information', 'forecast_trends'],
      collaboration_style: 'thorough_evidence_based'
    },
    {
      role: 'Content Strategist',
      expertise: ['content_creation', 'storytelling', 'brand_voice', 'audience_engagement', 'seo'],
      capabilities: ['copywriting', 'content_planning', 'social_media_strategy', 'campaign_development'],
      limitations: ['technical_development', 'data_modeling', 'infrastructure'],
      preferred_tasks: ['create_content', 'develop_strategy', 'optimize_messaging', 'engage_audience'],
      collaboration_style: 'creative_adaptive'
    },
    {
      role: 'Security Specialist',
      expertise: ['cybersecurity', 'threat_analysis', 'compliance', 'risk_assessment', 'penetration_testing'],
      capabilities: ['security_auditing', 'vulnerability_assessment', 'incident_response', 'policy_development'],
      limitations: ['marketing', 'content_creation', 'ui_design'],
      preferred_tasks: ['assess_security', 'identify_vulnerabilities', 'develop_policies', 'respond_incidents'],
      collaboration_style: 'cautious_thorough'
    }
  ];

  constructor() {
    const apiKey = getEnvAsString('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }
    
    this.openai = new OpenAI({
      apiKey,
      timeout: 120000 // 2 minutes timeout for complex crew executions
    });
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize default specialists
      this.defaultSpecialists.forEach(specialist => {
        this.specialists.set(specialist.role, specialist);
      });

      console.log(`🚀 CrewAI Orchestration Service initialized with ${this.specialists.size} specialists`);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize CrewAI service:', error);
      throw error;
    }
  }

  async createCustomCrew(
    objective: string,
    domain: string,
    complexity: 'simple' | 'moderate' | 'complex' | 'enterprise' = 'moderate',
    timeframe?: string
  ): Promise<CrewConfig> {
    await this.init();

    try {
      // Select appropriate specialists based on domain and objective
      const selectedSpecialists = this.selectSpecialistsForObjective(objective, domain, complexity);
      
      // Create agents from specialists
      const agents: AgentRole[] = selectedSpecialists.map(specialist => ({
        role: specialist.role,
        goal: this.generateAgentGoal(specialist, objective),
        backstory: this.generateAgentBackstory(specialist),
        skills: specialist.expertise,
        tools: this.getToolsForSpecialist(specialist),
        delegation: complexity === 'enterprise',
        verbose: true,
        max_iter: complexity === 'simple' ? 3 : complexity === 'complex' ? 7 : 5,
        memory: true
      }));

      // Create tasks based on objective breakdown
      const tasks = await this.breakdownObjectiveIntoTasks(objective, selectedSpecialists, complexity);

      const crewConfig: CrewConfig = {
        agents,
        tasks,
        process: complexity === 'enterprise' ? 'hierarchical' : 'sequential',
        verbose: 1,
        language: 'en',
        memory: true,
        cache: true
      };

      console.log(`🎯 Created custom crew with ${agents.length} agents and ${tasks.length} tasks`);
      return crewConfig;

    } catch (error) {
      console.error('Failed to create custom crew:', error);
      throw error;
    }
  }

  async executeCrew(crewConfig: CrewConfig): Promise<CrewResult> {
    await this.init();
    
    const executionId = `crew_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      console.log(`🚀 Starting crew execution with ${crewConfig.agents.length} agents`);

      const taskOutputs: Array<{
        task_description: string;
        agent_role: string;
        output: string;
        execution_time: number;
        tokens_used?: number;
      }> = [];

      let totalTokens = 0;

      // Execute tasks based on process type
      if (crewConfig.process === 'sequential') {
        for (let i = 0; i < crewConfig.tasks.length; i++) {
          const task = crewConfig.tasks[i];
          const agent = crewConfig.agents.find(a => a.role === task.agent) || crewConfig.agents[i % crewConfig.agents.length];
          
          const taskStartTime = Date.now();
          const output = await this.executeTask(task, agent, taskOutputs);
          const taskExecutionTime = Date.now() - taskStartTime;

          taskOutputs.push({
            task_description: task.description,
            agent_role: agent.role,
            output: output.content,
            execution_time: taskExecutionTime,
            tokens_used: output.tokens
          });

          totalTokens += output.tokens;
        }
      } else {
        // Hierarchical execution with manager coordination
        const managerAgent = crewConfig.agents[0]; // First agent acts as manager
        const subordinateAgents = crewConfig.agents.slice(1);

        for (const task of crewConfig.tasks) {
          const taskStartTime = Date.now();
          const output = await this.executeHierarchicalTask(task, managerAgent, subordinateAgents);
          const taskExecutionTime = Date.now() - taskStartTime;

          taskOutputs.push({
            task_description: task.description,
            agent_role: 'Hierarchical Team',
            output: output.content,
            execution_time: taskExecutionTime,
            tokens_used: output.tokens
          });

          totalTokens += output.tokens;
        }
      }

      // Generate final synthesis
      const finalOutput = await this.synthesizeFinalOutput(taskOutputs, crewConfig);
      
      const executionTime = Date.now() - startTime;
      const metrics = this.calculateCrewMetrics(taskOutputs, executionTime, totalTokens);

      const result: CrewResult = {
        id: executionId,
        timestamp: new Date(),
        crew_config: crewConfig,
        execution_results: {
          tasks_completed: taskOutputs.length,
          total_tasks: crewConfig.tasks.length,
          execution_time_ms: executionTime,
          outputs: taskOutputs,
          final_output: finalOutput,
          success: true
        },
        metrics
      };

      // Store results
      this.activeCrews.set(executionId, result);
      this.executionHistory.push(result);

      console.log(`✅ Crew execution completed in ${executionTime}ms with ${totalTokens} tokens used`);
      return result;

    } catch (error) {
      console.error('Crew execution failed:', error);
      
      const errorResult: CrewResult = {
        id: executionId,
        timestamp: new Date(),
        crew_config: crewConfig,
        execution_results: {
          tasks_completed: 0,
          total_tasks: crewConfig.tasks.length,
          execution_time_ms: Date.now() - startTime,
          outputs: [],
          final_output: 'Execution failed due to error',
          success: false,
          error_details: [error instanceof Error ? error.message : String(error)]
        },
        metrics: {
          efficiency_score: 0,
          quality_score: 0,
          collaboration_score: 0,
          token_usage: {}
        }
      };

      this.activeCrews.set(executionId, errorResult);
      return errorResult;
    }
  }

  private selectSpecialistsForObjective(
    objective: string, 
    domain: string, 
    complexity: 'simple' | 'moderate' | 'complex' | 'enterprise'
  ): SpecialistAgent[] {
    const objectiveLower = objective.toLowerCase();
    const domainLower = domain.toLowerCase();
    
    // Score specialists based on relevance
    const specialistScores = Array.from(this.specialists.values()).map(specialist => {
      let score = 0;
      
      // Domain relevance
      specialist.expertise.forEach(expertise => {
        if (domainLower.includes(expertise.replace('_', ' ')) || 
            objectiveLower.includes(expertise.replace('_', ' '))) {
          score += 2;
        }
      });

      // Capability relevance
      specialist.capabilities.forEach(capability => {
        if (objectiveLower.includes(capability.replace('_', ' '))) {
          score += 1;
        }
      });

      // Preferred task relevance
      specialist.preferred_tasks.forEach(task => {
        if (objectiveLower.includes(task.replace('_', ' '))) {
          score += 3;
        }
      });

      return { specialist, score };
    });

    // Sort by relevance and select appropriate number based on complexity
    const sortedSpecialists = specialistScores
      .sort((a, b) => b.score - a.score)
      .map(item => item.specialist);

    const teamSize = {
      simple: 2,
      moderate: 3,
      complex: 5,
      enterprise: 7
    }[complexity];

    return sortedSpecialists.slice(0, teamSize);
  }

  private generateAgentGoal(specialist: SpecialistAgent, objective: string): string {
    const roleGoals: Record<string, string> = {
      'Senior Software Engineer': `Architect and implement robust technical solutions for: ${objective}`,
      'Data Scientist': `Analyze data and build predictive models to support: ${objective}`,
      'Product Manager': `Define strategy and requirements to achieve: ${objective}`,
      'DevOps Engineer': `Ensure reliable infrastructure and deployment for: ${objective}`,
      'UX Designer': `Create intuitive user experiences that support: ${objective}`,
      'Research Analyst': `Conduct comprehensive research and analysis for: ${objective}`,
      'Content Strategist': `Develop compelling content and messaging for: ${objective}`,
      'Security Specialist': `Ensure security and compliance throughout: ${objective}`
    };

    return roleGoals[specialist.role] || `Apply ${specialist.role} expertise to achieve: ${objective}`;
  }

  private generateAgentBackstory(specialist: SpecialistAgent): string {
    const backstories: Record<string, string> = {
      'Senior Software Engineer': 'A seasoned software engineer with 10+ years of experience in designing and implementing scalable systems. Known for writing clean, maintainable code and mentoring junior developers.',
      'Data Scientist': 'An experienced data scientist with expertise in machine learning, statistical analysis, and predictive modeling. Passionate about extracting actionable insights from complex datasets.',
      'Product Manager': 'A strategic product manager with a track record of launching successful products. Expert in user research, market analysis, and feature prioritization.',
      'DevOps Engineer': 'A reliable DevOps engineer specializing in infrastructure automation, CI/CD pipelines, and system monitoring. Committed to ensuring high availability and performance.',
      'UX Designer': 'A user-centered designer with expertise in creating intuitive interfaces and conducting user research. Passionate about improving user experiences through design.',
      'Research Analyst': 'A thorough research analyst with expertise in market research, competitive analysis, and trend forecasting. Known for delivering comprehensive and actionable insights.',
      'Content Strategist': 'A creative content strategist with expertise in storytelling, brand voice, and audience engagement. Skilled at creating compelling content across multiple channels.',
      'Security Specialist': 'A security-focused professional with expertise in threat analysis, compliance, and risk assessment. Dedicated to protecting systems and data from security threats.'
    };

    return backstories[specialist.role] || `An expert ${specialist.role} with deep knowledge in their field and a collaborative approach to problem-solving.`;
  }

  private getToolsForSpecialist(specialist: SpecialistAgent): string[] {
    const toolMappings: Record<string, string[]> = {
      'Senior Software Engineer': ['code_analyzer', 'git_tools', 'testing_framework', 'documentation_generator'],
      'Data Scientist': ['data_processor', 'ml_framework', 'visualization_tool', 'statistical_analyzer'],
      'Product Manager': ['market_analyzer', 'user_research_tool', 'roadmap_planner', 'metrics_tracker'],
      'DevOps Engineer': ['infrastructure_manager', 'monitoring_tool', 'deployment_pipeline', 'security_scanner'],
      'UX Designer': ['design_tool', 'prototyping_software', 'user_testing_platform', 'accessibility_checker'],
      'Research Analyst': ['research_database', 'competitive_intelligence', 'trend_analyzer', 'report_generator'],
      'Content Strategist': ['content_planner', 'seo_analyzer', 'social_media_tool', 'brand_guidelines'],
      'Security Specialist': ['vulnerability_scanner', 'threat_analyzer', 'compliance_checker', 'incident_tracker']
    };

    return toolMappings[specialist.role] || ['general_tools'];
  }

  private async breakdownObjectiveIntoTasks(
    objective: string, 
    specialists: SpecialistAgent[], 
    complexity: 'simple' | 'moderate' | 'complex' | 'enterprise'
  ): Promise<Task[]> {
    try {
      const prompt = `Break down this objective into specific, actionable tasks for a team of specialists:

Objective: ${objective}
Team: ${specialists.map(s => s.role).join(', ')}
Complexity: ${complexity}

Generate ${complexity === 'simple' ? '2-3' : complexity === 'moderate' ? '3-5' : complexity === 'complex' ? '5-8' : '8-12'} specific tasks that:
1. Utilize each specialist's expertise
2. Build upon each other logically
3. Can be completed within reasonable timeframes
4. Have clear, measurable outputs

Format as JSON array of tasks with description and expected_output fields.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.2
      });

      const content = response.choices[0]?.message?.content || '[]';
      
      try {
        const tasksData = JSON.parse(content);
        return tasksData.map((task: any, index: number) => ({
          description: task.description || `Task ${index + 1} for ${objective}`,
          expected_output: task.expected_output || 'Detailed analysis and recommendations',
          agent: specialists[index % specialists.length]?.role,
          tools: this.getToolsForSpecialist(specialists[index % specialists.length]),
          async_execution: false,
          context: index > 0 ? [`Task ${index}`] : []
        }));
      } catch (parseError) {
        console.error('Failed to parse generated tasks, using fallback');
        return this.createFallbackTasks(objective, specialists);
      }

    } catch (error) {
      console.error('Failed to generate tasks, using fallback:', error);
      return this.createFallbackTasks(objective, specialists);
    }
  }

  private createFallbackTasks(objective: string, specialists: SpecialistAgent[]): Task[] {
    return specialists.map((specialist, index) => ({
      description: `Apply ${specialist.role} expertise to analyze and contribute to: ${objective}`,
      expected_output: `Detailed ${specialist.role.toLowerCase()} analysis, recommendations, and actionable items`,
      agent: specialist.role,
      tools: this.getToolsForSpecialist(specialist),
      async_execution: false,
      context: index > 0 ? [`Previous task output`] : []
    }));
  }

  private async executeTask(
    task: Task, 
    agent: AgentRole, 
    previousOutputs: Array<{ task_description: string; agent_role: string; output: string }>
  ): Promise<{ content: string; tokens: number }> {
    try {
      const context = previousOutputs.length > 0 ? 
        `Previous work:\n${previousOutputs.map(o => `${o.agent_role}: ${o.output}`).join('\n\n')}` : 
        'No previous context available.';

      const prompt = `You are a ${agent.role}. 

Your goal: ${agent.goal}
Your background: ${agent.backstory}
Your skills: ${agent.skills.join(', ')}
Available tools: ${agent.tools.join(', ')}

Task: ${task.description}
Expected output: ${task.expected_output}

Context from previous work:
${context}

Please complete this task with your expertise, providing detailed analysis and actionable recommendations. 
Be specific, practical, and align with your role's perspective.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || 'Task execution failed';
      const tokens = response.usage?.total_tokens || 0;

      return { content, tokens };

    } catch (error) {
      console.error(`Task execution failed for ${agent.role}:`, error);
      return { 
        content: `Task execution encountered an error: ${error}`, 
        tokens: 0 
      };
    }
  }

  private async executeHierarchicalTask(
    task: Task, 
    manager: AgentRole, 
    subordinates: AgentRole[]
  ): Promise<{ content: string; tokens: number }> {
    try {
      // Manager delegates and coordinates
      const delegationPrompt = `As ${manager.role}, coordinate this task with your team:

Task: ${task.description}
Team: ${subordinates.map(a => a.role).join(', ')}

1. Break down the task for each team member
2. Coordinate their efforts
3. Synthesize their contributions into a cohesive output

Expected output: ${task.expected_output}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: delegationPrompt }],
        max_tokens: 2000,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || 'Hierarchical task execution failed';
      const tokens = response.usage?.total_tokens || 0;

      return { content, tokens };

    } catch (error) {
      console.error('Hierarchical task execution failed:', error);
      return { 
        content: `Hierarchical execution encountered an error: ${error}`, 
        tokens: 0 
      };
    }
  }

  private async synthesizeFinalOutput(
    taskOutputs: Array<{ task_description: string; agent_role: string; output: string }>,
    crewConfig: CrewConfig
  ): Promise<string> {
    try {
      const synthesisPrompt = `Synthesize the following crew outputs into a comprehensive final result:

Team Outputs:
${taskOutputs.map(output => 
  `${output.agent_role} - ${output.task_description}:\n${output.output}`
).join('\n\n---\n\n')}

Please provide a cohesive synthesis that:
1. Integrates all team contributions
2. Highlights key insights and recommendations
3. Identifies any conflicting viewpoints and reconciles them
4. Provides clear next steps and action items
5. Maintains the perspective of each specialist while creating a unified vision`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: synthesisPrompt }],
        max_tokens: 2000,
        temperature: 0.2
      });

      return response.choices[0]?.message?.content || 'Synthesis generation failed';

    } catch (error) {
      console.error('Final output synthesis failed:', error);
      return 'Final synthesis encountered errors. Please review individual task outputs.';
    }
  }

  private calculateCrewMetrics(
    taskOutputs: Array<{ execution_time: number; tokens_used?: number }>,
    totalExecutionTime: number,
    totalTokens: number
  ): CrewResult['metrics'] {
    const avgTaskTime = taskOutputs.reduce((sum, task) => sum + task.execution_time, 0) / taskOutputs.length;
    const efficiencyScore = Math.max(0, 1 - (totalExecutionTime / (taskOutputs.length * 30000))); // 30s baseline per task

    const qualityScore = 0.85; // Placeholder - would be calculated based on output analysis
    const collaborationScore = taskOutputs.length > 1 ? 0.9 : 0.5; // Higher for multi-agent crews

    const tokenUsage: Record<string, number> = {};
    taskOutputs.forEach((task, index) => {
      tokenUsage[`task_${index + 1}`] = task.tokens_used || 0;
    });
    tokenUsage.total = totalTokens;

    return {
      efficiency_score: efficiencyScore,
      quality_score: qualityScore,
      collaboration_score: collaborationScore,
      token_usage: tokenUsage
    };
  }

  async getCrewResult(executionId: string): Promise<CrewResult | null> {
    return this.activeCrews.get(executionId) || null;
  }

  async getExecutionHistory(limit: number = 10): Promise<CrewResult[]> {
    return this.executionHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getAvailableSpecialists(): SpecialistAgent[] {
    return Array.from(this.specialists.values());
  }

  addCustomSpecialist(specialist: SpecialistAgent): void {
    this.specialists.set(specialist.role, specialist);
    console.log(`➕ Added custom specialist: ${specialist.role}`);
  }

  removeSpecialist(role: string): boolean {
    const removed = this.specialists.delete(role);
    if (removed) {
      console.log(`➖ Removed specialist: ${role}`);
    }
    return removed;
  }
}

export const crewAIOrchestrationService = new CrewAIOrchestrationService();