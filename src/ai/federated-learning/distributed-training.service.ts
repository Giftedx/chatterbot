// FEDERATED LEARNING FRAMEWORK SERVICE
// Implements privacy-preserving distributed machine learning
// Based on 2025 research in federated learning and edge AI

import { EventEmitter } from 'events';
import { getEnvAsString, getEnvAsBoolean } from '../../utils/env.js';

interface FederatedClient {
  id: string;
  name: string;
  type: 'edge_device' | 'server' | 'mobile' | 'iot' | 'browser';
  capabilities: {
    compute_power: 'low' | 'medium' | 'high';
    memory_mb: number;
    network_bandwidth: 'slow' | 'medium' | 'fast';
    privacy_level: 'public' | 'private' | 'confidential';
  };
  location: {
    region: string;
    timezone: string;
    latency_ms: number;
  };
  data_statistics: {
    sample_count: number;
    data_quality: number;
    label_distribution: Record<string, number>;
    last_contribution: Date;
  };
  model_version: string;
  status: 'active' | 'inactive' | 'training' | 'uploading';
  reputation_score: number;
}

interface FederatedModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'nlp' | 'computer_vision' | 'reinforcement_learning';
  architecture: {
    framework: 'tensorflow' | 'pytorch' | 'custom';
    layers: number;
    parameters: number;
    input_shape: number[];
    output_shape: number[];
  };
  global_version: number;
  performance_metrics: {
    accuracy: number;
    loss: number;
    convergence_rate: number;
    training_rounds: number;
  };
  privacy_settings: {
    differential_privacy: boolean;
    secure_aggregation: boolean;
    homomorphic_encryption: boolean;
    noise_level: number;
  };
  created_at: Date;
  last_updated: Date;
}

interface TrainingRound {
  id: string;
  model_id: string;
  round_number: number;
  participating_clients: string[];
  start_time: Date;
  end_time?: Date;
  status: 'starting' | 'training' | 'aggregating' | 'completed' | 'failed';
  performance_improvement: number;
  convergence_metric: number;
  privacy_budget_used: number;
}

interface FederatedTrainingResult {
  round_id: string;
  model_id: string;
  global_performance: {
    accuracy: number;
    loss: number;
    convergence: number;
    privacy_score: number;
  };
  client_contributions: Array<{
    client_id: string;
    local_performance: number;
    data_samples: number;
    training_time_ms: number;
    privacy_contribution: number;
  }>;
  aggregation_metadata: {
    aggregation_method: string;
    total_parameters_updated: number;
    privacy_preserving_techniques: string[];
    communication_overhead_mb: number;
  };
  next_round_recommendations: {
    client_selection_strategy: string;
    learning_rate_adjustment: number;
    privacy_budget_allocation: Record<string, number>;
  };
}

export class FederatedLearningService extends EventEmitter {
  private isInitialized = false;
  private clients: Map<string, FederatedClient> = new Map();
  private models: Map<string, FederatedModel> = new Map();
  private trainingRounds: Map<string, TrainingRound> = new Map();
  private activeTraining: Map<string, string> = new Map(); // model_id -> round_id

  // Federated learning configuration
  private config = {
    min_clients_per_round: 3,
    max_clients_per_round: 10,
    client_selection_strategy: 'random' as 'random' | 'reputation_based' | 'data_quality' | 'geographic',
    aggregation_method: 'federated_averaging' as 'federated_averaging' | 'weighted_average' | 'secure_aggregation',
    privacy_budget_per_round: 1.0,
    convergence_threshold: 0.001,
    max_training_rounds: 100,
    communication_compression: true,
    differential_privacy_enabled: true
  };

  constructor() {
    super();
    this.initializeSimulatedClients();
    this.initializeExampleModels();
  }

  private initializeSimulatedClients(): void {
    // Create simulated federated clients for demonstration
    const clientTypes = ['edge_device', 'mobile', 'iot', 'browser'] as const;
    const regions = ['us-east', 'eu-west', 'asia-pacific', 'us-west'];
    
    for (let i = 0; i < 8; i++) {
      const clientType = clientTypes[i % clientTypes.length];
      const region = regions[i % regions.length];
      
      this.clients.set(`client_${i}`, {
        id: `client_${i}`,
        name: `${clientType.replace('_', ' ')} ${i + 1}`,
        type: clientType,
        capabilities: {
          compute_power: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
          memory_mb: 512 + Math.floor(Math.random() * 2048),
          network_bandwidth: ['slow', 'medium', 'fast'][Math.floor(Math.random() * 3)] as any,
          privacy_level: ['private', 'confidential'][Math.floor(Math.random() * 2)] as any
        },
        location: {
          region,
          timezone: `GMT${Math.floor(Math.random() * 24) - 12}`,
          latency_ms: 50 + Math.floor(Math.random() * 200)
        },
        data_statistics: {
          sample_count: 100 + Math.floor(Math.random() * 1000),
          data_quality: 0.7 + Math.random() * 0.3,
          label_distribution: {
            'class_0': Math.random(),
            'class_1': Math.random(),
            'class_2': Math.random()
          },
          last_contribution: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        },
        model_version: '1.0.0',
        status: 'active',
        reputation_score: 0.5 + Math.random() * 0.5
      });
    }
  }

  private initializeExampleModels(): void {
    // Text Classification Model
    this.models.set('text_classifier', {
      id: 'text_classifier',
      name: 'Distributed Text Classification',
      type: 'nlp',
      architecture: {
        framework: 'tensorflow',
        layers: 12,
        parameters: 110000000,
        input_shape: [512],
        output_shape: [10]
      },
      global_version: 1,
      performance_metrics: {
        accuracy: 0.75,
        loss: 0.68,
        convergence_rate: 0.02,
        training_rounds: 0
      },
      privacy_settings: {
        differential_privacy: true,
        secure_aggregation: true,
        homomorphic_encryption: false,
        noise_level: 0.1
      },
      created_at: new Date(),
      last_updated: new Date()
    });

    // Image Classification Model
    this.models.set('image_classifier', {
      id: 'image_classifier',
      name: 'Federated Image Recognition',
      type: 'computer_vision',
      architecture: {
        framework: 'pytorch',
        layers: 50,
        parameters: 25000000,
        input_shape: [224, 224, 3],
        output_shape: [1000]
      },
      global_version: 1,
      performance_metrics: {
        accuracy: 0.82,
        loss: 0.45,
        convergence_rate: 0.015,
        training_rounds: 0
      },
      privacy_settings: {
        differential_privacy: true,
        secure_aggregation: true,
        homomorphic_encryption: true,
        noise_level: 0.05
      },
      created_at: new Date(),
      last_updated: new Date()
    });
  }

  async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('🌐 Initializing Federated Learning Framework...');
      
      // Validate client configurations
      let validClients = 0;
      for (const [id, client] of this.clients) {
        if (this.validateClient(client)) {
          validClients++;
        } else {
          console.warn(`⚠️ Invalid client configuration: ${id}`);
          this.clients.delete(id);
        }
      }

      // Validate models
      let validModels = 0;
      for (const [id, model] of this.models) {
        if (this.validateModel(model)) {
          validModels++;
        } else {
          console.warn(`⚠️ Invalid model configuration: ${id}`);
          this.models.delete(id);
        }
      }

      this.isInitialized = true;
      console.log(`✅ Federated Learning initialized with ${validClients} clients and ${validModels} models`);
      
      this.emit('initialized', { 
        client_count: validClients,
        model_count: validModels,
        privacy_enabled: this.config.differential_privacy_enabled
      });
      
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Federated Learning:', error);
      return false;
    }
  }

  private validateClient(client: FederatedClient): boolean {
    return (
      client.id &&
      client.name &&
      client.type &&
      client.capabilities &&
      client.location &&
      client.data_statistics &&
      client.reputation_score >= 0 &&
      client.reputation_score <= 1
    );
  }

  private validateModel(model: FederatedModel): boolean {
    return (
      model.id &&
      model.name &&
      model.type &&
      model.architecture &&
      model.architecture.parameters > 0 &&
      model.performance_metrics &&
      model.privacy_settings
    );
  }

  async startFederatedTraining(
    modelId: string,
    options: {
      max_rounds?: number;
      min_clients?: number;
      client_selection_strategy?: string;
      privacy_budget?: number;
      convergence_threshold?: number;
    } = {}
  ): Promise<string> {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      if (this.activeTraining.has(modelId)) {
        throw new Error(`Training already active for model: ${modelId}`);
      }

      const {
        max_rounds = this.config.max_training_rounds,
        min_clients = this.config.min_clients_per_round,
        client_selection_strategy = this.config.client_selection_strategy,
        privacy_budget = this.config.privacy_budget_per_round,
        convergence_threshold = this.config.convergence_threshold
      } = options;

      console.log(`🚀 Starting federated training for model: ${model.name}`);

      // Start first training round
      const roundId = await this.startTrainingRound(modelId, {
        min_clients,
        client_selection_strategy,
        privacy_budget
      });

      this.activeTraining.set(modelId, roundId);
      
      this.emit('training_started', {
        model_id: modelId,
        round_id: roundId,
        max_rounds,
        selected_clients: this.trainingRounds.get(roundId)?.participating_clients?.length || 0
      });

      return roundId;

    } catch (error) {
      console.error('❌ Failed to start federated training:', error);
      throw error;
    }
  }

  private async startTrainingRound(
    modelId: string,
    options: {
      min_clients: number;
      client_selection_strategy: string;
      privacy_budget: number;
    }
  ): Promise<string> {
    const model = this.models.get(modelId)!;
    const roundId = `round_${modelId}_${Date.now()}`;
    
    // Select clients for this round
    const selectedClients = this.selectClientsForRound(options.min_clients, options.client_selection_strategy);
    
    if (selectedClients.length < options.min_clients) {
      throw new Error(`Insufficient clients available: ${selectedClients.length} < ${options.min_clients}`);
    }

    const trainingRound: TrainingRound = {
      id: roundId,
      model_id: modelId,
      round_number: model.performance_metrics.training_rounds + 1,
      participating_clients: selectedClients.map(c => c.id),
      start_time: new Date(),
      status: 'starting',
      performance_improvement: 0,
      convergence_metric: 0,
      privacy_budget_used: 0
    };

    this.trainingRounds.set(roundId, trainingRound);

    // Update client statuses
    selectedClients.forEach(client => {
      client.status = 'training';
    });

    console.log(`📚 Training round ${trainingRound.round_number} started with ${selectedClients.length} clients`);

    // Simulate training process
    setTimeout(() => {
      this.completeTrainingRound(roundId);
    }, 5000 + Math.random() * 5000);

    return roundId;
  }

  private selectClientsForRound(
    minClients: number,
    strategy: string
  ): FederatedClient[] {
    const availableClients = Array.from(this.clients.values())
      .filter(client => client.status === 'active');

    if (availableClients.length < minClients) {
      return availableClients;
    }

    const maxClients = Math.min(this.config.max_clients_per_round, availableClients.length);
    const targetCount = Math.max(minClients, Math.min(maxClients, Math.floor(availableClients.length * 0.6)));

    let selectedClients: FederatedClient[] = [];

    switch (strategy) {
      case 'reputation_based':
        selectedClients = availableClients
          .sort((a, b) => b.reputation_score - a.reputation_score)
          .slice(0, targetCount);
        break;

      case 'data_quality':
        selectedClients = availableClients
          .sort((a, b) => b.data_statistics.data_quality - a.data_statistics.data_quality)
          .slice(0, targetCount);
        break;

      case 'geographic':
        // Distribute across regions
        const regions = [...new Set(availableClients.map(c => c.location.region))];
        const clientsPerRegion = Math.ceil(targetCount / regions.length);
        
        regions.forEach(region => {
          const regionClients = availableClients
            .filter(c => c.location.region === region)
            .slice(0, clientsPerRegion);
          selectedClients.push(...regionClients);
        });
        selectedClients = selectedClients.slice(0, targetCount);
        break;

      case 'random':
      default:
        // Random selection
        const shuffled = [...availableClients].sort(() => Math.random() - 0.5);
        selectedClients = shuffled.slice(0, targetCount);
        break;
    }

    return selectedClients;
  }

  private async completeTrainingRound(roundId: string): Promise<void> {
    try {
      const round = this.trainingRounds.get(roundId);
      if (!round) return;

      const model = this.models.get(round.model_id);
      if (!model) return;

      console.log(`🎯 Completing training round ${round.round_number} for ${model.name}`);

      round.status = 'aggregating';

      // Simulate client training results
      const clientContributions = round.participating_clients.map(clientId => {
        const client = this.clients.get(clientId)!;
        
        return {
          client_id: clientId,
          local_performance: 0.7 + Math.random() * 0.3,
          data_samples: client.data_statistics.sample_count,
          training_time_ms: 1000 + Math.random() * 5000,
          privacy_contribution: Math.random() * round.privacy_budget_used
        };
      });

      // Simulate federated aggregation
      const aggregatedPerformance = this.simulateFederatedAggregation(clientContributions, model);
      
      // Update model performance
      const performanceImprovement = aggregatedPerformance.accuracy - model.performance_metrics.accuracy;
      model.performance_metrics = aggregatedPerformance;
      model.performance_metrics.training_rounds = round.round_number;
      model.global_version += 1;
      model.last_updated = new Date();

      // Update round completion
      round.end_time = new Date();
      round.status = 'completed';
      round.performance_improvement = performanceImprovement;
      round.convergence_metric = Math.abs(performanceImprovement);
      round.privacy_budget_used = this.config.privacy_budget_per_round;

      // Update client statuses and reputation
      round.participating_clients.forEach(clientId => {
        const client = this.clients.get(clientId);
        if (client) {
          client.status = 'active';
          client.data_statistics.last_contribution = new Date();
          // Update reputation based on contribution quality
          const contribution = clientContributions.find(c => c.client_id === clientId);
          if (contribution) {
            client.reputation_score = Math.min(1, client.reputation_score + 
              (contribution.local_performance > 0.8 ? 0.05 : -0.02));
          }
        }
      });

      const result: FederatedTrainingResult = {
        round_id: roundId,
        model_id: round.model_id,
        global_performance: {
          accuracy: aggregatedPerformance.accuracy,
          loss: aggregatedPerformance.loss,
          convergence: round.convergence_metric,
          privacy_score: this.calculatePrivacyScore(model)
        },
        client_contributions: clientContributions,
        aggregation_metadata: {
          aggregation_method: this.config.aggregation_method,
          total_parameters_updated: model.architecture.parameters,
          privacy_preserving_techniques: this.getPrivacyTechniques(model),
          communication_overhead_mb: clientContributions.length * 2.5 // Simulated
        },
        next_round_recommendations: {
          client_selection_strategy: this.recommendNextStrategy(clientContributions),
          learning_rate_adjustment: performanceImprovement > 0.01 ? 0.9 : 1.1,
          privacy_budget_allocation: this.calculatePrivacyBudgetAllocation(clientContributions)
        }
      };

      console.log(`✅ Training round ${round.round_number} completed. Accuracy: ${aggregatedPerformance.accuracy.toFixed(3)}, Improvement: ${performanceImprovement.toFixed(4)}`);

      this.emit('round_completed', result);

      // Check if training should continue
      if (round.convergence_metric > this.config.convergence_threshold && 
          round.round_number < this.config.max_training_rounds) {
        
        // Start next round
        setTimeout(() => {
          this.startTrainingRound(round.model_id, {
            min_clients: this.config.min_clients_per_round,
            client_selection_strategy: result.next_round_recommendations.client_selection_strategy,
            privacy_budget: this.config.privacy_budget_per_round
          });
        }, 2000);
      } else {
        // Training completed
        this.activeTraining.delete(round.model_id);
        console.log(`🎉 Federated training completed for ${model.name} after ${round.round_number} rounds`);
        
        this.emit('training_completed', {
          model_id: round.model_id,
          final_accuracy: aggregatedPerformance.accuracy,
          total_rounds: round.round_number,
          convergence_achieved: round.convergence_metric <= this.config.convergence_threshold
        });
      }

    } catch (error) {
      console.error('❌ Error completing training round:', error);
      
      // Update round status to failed
      const round = this.trainingRounds.get(roundId);
      if (round) {
        round.status = 'failed';
        round.end_time = new Date();
        
        // Reset client statuses
        round.participating_clients.forEach(clientId => {
          const client = this.clients.get(clientId);
          if (client) {
            client.status = 'active';
          }
        });
      }
    }
  }

  private simulateFederatedAggregation(
    contributions: Array<{ local_performance: number; data_samples: number }>,
    model: FederatedModel
  ): FederatedModel['performance_metrics'] {
    // Weighted averaging based on data samples
    const totalSamples = contributions.reduce((sum, c) => sum + c.data_samples, 0);
    
    let weightedAccuracy = 0;
    contributions.forEach(contribution => {
      const weight = contribution.data_samples / totalSamples;
      weightedAccuracy += contribution.local_performance * weight;
    });

    // Add some noise for differential privacy
    if (model.privacy_settings.differential_privacy) {
      const noiseLevel = model.privacy_settings.noise_level;
      weightedAccuracy += (Math.random() - 0.5) * noiseLevel;
    }

    // Ensure accuracy is within valid range
    weightedAccuracy = Math.max(0, Math.min(1, weightedAccuracy));

    return {
      accuracy: weightedAccuracy,
      loss: Math.max(0, 1 - weightedAccuracy + Math.random() * 0.2),
      convergence_rate: Math.abs(weightedAccuracy - model.performance_metrics.accuracy),
      training_rounds: model.performance_metrics.training_rounds + 1
    };
  }

  private calculatePrivacyScore(model: FederatedModel): number {
    let score = 0.5; // Base score

    if (model.privacy_settings.differential_privacy) score += 0.2;
    if (model.privacy_settings.secure_aggregation) score += 0.2;
    if (model.privacy_settings.homomorphic_encryption) score += 0.1;
    
    // Adjust based on noise level
    score += model.privacy_settings.noise_level * 0.1;

    return Math.min(1, score);
  }

  private getPrivacyTechniques(model: FederatedModel): string[] {
    const techniques: string[] = [];
    
    if (model.privacy_settings.differential_privacy) techniques.push('differential_privacy');
    if (model.privacy_settings.secure_aggregation) techniques.push('secure_aggregation');
    if (model.privacy_settings.homomorphic_encryption) techniques.push('homomorphic_encryption');
    
    return techniques;
  }

  private recommendNextStrategy(
    contributions: Array<{ local_performance: number; data_samples: number }>
  ): string {
    const avgPerformance = contributions.reduce((sum, c) => sum + c.local_performance, 0) / contributions.length;
    const performanceVariance = contributions.reduce((sum, c) => 
      sum + Math.pow(c.local_performance - avgPerformance, 2), 0) / contributions.length;

    if (performanceVariance > 0.1) {
      return 'reputation_based'; // High variance, select better performers
    } else if (avgPerformance > 0.9) {
      return 'geographic'; // Good performance, ensure diversity
    } else {
      return 'data_quality'; // Focus on data quality
    }
  }

  private calculatePrivacyBudgetAllocation(
    contributions: Array<{ client_id: string; privacy_contribution: number }>
  ): Record<string, number> {
    const allocation: Record<string, number> = {};
    const totalBudget = this.config.privacy_budget_per_round;
    
    contributions.forEach(contribution => {
      // Allocate budget inversely proportional to previous contribution
      const baseAllocation = totalBudget / contributions.length;
      const adjustment = 1 - (contribution.privacy_contribution / totalBudget);
      allocation[contribution.client_id] = baseAllocation * (1 + adjustment * 0.5);
    });

    return allocation;
  }

  async addClient(client: Omit<FederatedClient, 'status' | 'reputation_score'>): Promise<boolean> {
    try {
      const fullClient: FederatedClient = {
        ...client,
        status: 'active',
        reputation_score: 0.5 // Start with neutral reputation
      };

      if (!this.validateClient(fullClient)) {
        throw new Error('Invalid client configuration');
      }

      this.clients.set(client.id, fullClient);
      console.log(`✅ Added federated client: ${client.name}`);
      
      this.emit('client_added', { client_id: client.id, client_name: client.name });
      return true;

    } catch (error) {
      console.error('❌ Failed to add client:', error);
      return false;
    }
  }

  async addModel(model: Omit<FederatedModel, 'global_version' | 'created_at' | 'last_updated'>): Promise<boolean> {
    try {
      const fullModel: FederatedModel = {
        ...model,
        global_version: 1,
        created_at: new Date(),
        last_updated: new Date()
      };

      if (!this.validateModel(fullModel)) {
        throw new Error('Invalid model configuration');
      }

      this.models.set(model.id, fullModel);
      console.log(`✅ Added federated model: ${model.name}`);
      
      this.emit('model_added', { model_id: model.id, model_name: model.name });
      return true;

    } catch (error) {
      console.error('❌ Failed to add model:', error);
      return false;
    }
  }

  async updateFederatedConfig(newConfig: Partial<typeof this.config>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Updated federated learning configuration:', this.config);
    this.emit('config_updated', this.config);
  }

  getTrainingStatus(modelId?: string): Array<{
    model_id: string;
    model_name: string;
    status: string;
    current_round: number;
    accuracy: number;
    participating_clients: number;
  }> {
    const status: Array<any> = [];

    if (modelId) {
      const model = this.models.get(modelId);
      if (model) {
        const activeRoundId = this.activeTraining.get(modelId);
        const activeRound = activeRoundId ? this.trainingRounds.get(activeRoundId) : null;
        
        status.push({
          model_id: modelId,
          model_name: model.name,
          status: activeRound ? activeRound.status : 'idle',
          current_round: model.performance_metrics.training_rounds,
          accuracy: model.performance_metrics.accuracy,
          participating_clients: activeRound ? activeRound.participating_clients.length : 0
        });
      }
    } else {
      // Return status for all models
      this.models.forEach((model, id) => {
        const activeRoundId = this.activeTraining.get(id);
        const activeRound = activeRoundId ? this.trainingRounds.get(activeRoundId) : null;
        
        status.push({
          model_id: id,
          model_name: model.name,
          status: activeRound ? activeRound.status : 'idle',
          current_round: model.performance_metrics.training_rounds,
          accuracy: model.performance_metrics.accuracy,
          participating_clients: activeRound ? activeRound.participating_clients.length : 0
        });
      });
    }

    return status;
  }

  getMetrics(): {
    total_clients: number;
    active_clients: number;
    total_models: number;
    active_training_sessions: number;
    completed_rounds: number;
    average_client_reputation: number;
    privacy_score: number;
    geographic_distribution: Record<string, number>;
  } {
    const activeClients = Array.from(this.clients.values()).filter(c => c.status === 'active').length;
    const completedRounds = Array.from(this.trainingRounds.values()).filter(r => r.status === 'completed').length;
    
    const reputations = Array.from(this.clients.values()).map(c => c.reputation_score);
    const avgReputation = reputations.length > 0 ? 
      reputations.reduce((sum, rep) => sum + rep, 0) / reputations.length : 0;

    const privacyScores = Array.from(this.models.values()).map(m => this.calculatePrivacyScore(m));
    const avgPrivacyScore = privacyScores.length > 0 ?
      privacyScores.reduce((sum, score) => sum + score, 0) / privacyScores.length : 0;

    const geoDistribution: Record<string, number> = {};
    this.clients.forEach(client => {
      geoDistribution[client.location.region] = (geoDistribution[client.location.region] || 0) + 1;
    });

    return {
      total_clients: this.clients.size,
      active_clients: activeClients,
      total_models: this.models.size,
      active_training_sessions: this.activeTraining.size,
      completed_rounds: completedRounds,
      average_client_reputation: avgReputation,
      privacy_score: avgPrivacyScore,
      geographic_distribution: geoDistribution
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    client_availability: number;
    model_performance: number;
    privacy_compliance: number;
    training_efficiency: number;
  }> {
    const metrics = this.getMetrics();
    const clientAvailability = metrics.total_clients > 0 ? metrics.active_clients / metrics.total_clients : 0;
    
    const modelPerformances = Array.from(this.models.values()).map(m => m.performance_metrics.accuracy);
    const avgModelPerformance = modelPerformances.length > 0 ?
      modelPerformances.reduce((sum, perf) => sum + perf, 0) / modelPerformances.length : 0;

    const privacyCompliance = metrics.privacy_score;
    
    const recentRounds = Array.from(this.trainingRounds.values())
      .filter(r => r.end_time && Date.now() - r.end_time.getTime() < 24 * 60 * 60 * 1000);
    const trainingEfficiency = recentRounds.length > 0 ?
      recentRounds.filter(r => r.status === 'completed').length / recentRounds.length : 1;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (clientAvailability >= 0.8 && avgModelPerformance >= 0.7 && privacyCompliance >= 0.7) {
      status = 'healthy';
    } else if (clientAvailability >= 0.6 && avgModelPerformance >= 0.5 && privacyCompliance >= 0.5) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      client_availability: clientAvailability,
      model_performance: avgModelPerformance,
      privacy_compliance: privacyCompliance,
      training_efficiency: trainingEfficiency
    };
  }

  async shutdown(): Promise<void> {
    try {
      console.log('🔌 Shutting down Federated Learning service...');
      
      // Stop all active training
      for (const [modelId, roundId] of this.activeTraining) {
        const round = this.trainingRounds.get(roundId);
        if (round && round.status !== 'completed') {
          round.status = 'failed';
          round.end_time = new Date();
          console.log(`⚠️ Terminated training round ${roundId} for model ${modelId}`);
        }
      }

      this.clients.clear();
      this.models.clear();
      this.trainingRounds.clear();
      this.activeTraining.clear();
      this.isInitialized = false;
      
      this.emit('shutdown');
      console.log('✅ Federated Learning service shutdown complete');
      
    } catch (error) {
      console.error('❌ Error during Federated Learning shutdown:', error);
    }
  }
}

export const federatedLearningService = new FederatedLearningService();