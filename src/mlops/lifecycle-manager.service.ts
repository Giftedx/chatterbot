// TASK-040: Add MLOps lifecycle management

import { getEnvAsBoolean, getEnvAsString, getEnvAsNumber } from '../utils/env.js';
import { z } from 'zod';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import cron from 'node-cron';

// MLOps schemas and types
const ModelMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  type: z.enum(['llm', 'embedding', 'classification', 'regression', 'clustering', 'multimodal']),
  framework: z.enum(['transformers', 'openai', 'anthropic', 'google', 'custom']),
  provider: z.string(),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
  status: z.enum(['training', 'deployed', 'deprecated', 'failed', 'archived']),
  metrics: z.record(z.number()).default({}),
  hyperparameters: z.record(z.unknown()).default({}),
  training_data: z.object({
    dataset_id: z.string().optional(),
    size: z.number().optional(),
    features: z.array(z.string()).default([]),
    target: z.string().optional()
  }).optional(),
  deployment: z.object({
    endpoint: z.string().optional(),
    environment: z.enum(['development', 'staging', 'production']),
    replicas: z.number().default(1),
    resources: z.object({
      cpu: z.string().optional(),
      memory: z.string().optional(),
      gpu: z.string().optional()
    }).optional()
  }).optional(),
  monitoring: z.object({
    enabled: z.boolean().default(true),
    alerts: z.array(z.string()).default([]),
    thresholds: z.record(z.number()).default({})
  }).default({})
});

const ExperimentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  model_id: z.string(),
  created_at: z.date().default(() => new Date()),
  completed_at: z.date().optional(),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']),
  parameters: z.record(z.unknown()).default({}),
  metrics: z.record(z.number()).default({}),
  artifacts: z.array(z.object({
    name: z.string(),
    path: z.string(),
    type: z.string(),
    size: z.number()
  })).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional()
});

const DeploymentSchema = z.object({
  id: z.string(),
  model_id: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  version: z.string(),
  deployed_at: z.date().default(() => new Date()),
  status: z.enum(['deploying', 'active', 'inactive', 'failed', 'rolling_back']),
  endpoint: z.string().optional(),
  configuration: z.record(z.unknown()).default({}),
  health_check: z.object({
    url: z.string().optional(),
    interval_seconds: z.number().default(30),
    timeout_seconds: z.number().default(10),
    healthy_threshold: z.number().default(2),
    unhealthy_threshold: z.number().default(3)
  }).optional(),
  scaling: z.object({
    min_replicas: z.number().default(1),
    max_replicas: z.number().default(10),
    target_cpu_percent: z.number().default(70),
    target_memory_percent: z.number().default(80)
  }).optional(),
  traffic_split: z.number().min(0).max(100).default(100) // Percentage of traffic
});

const PerformanceMetricsSchema = z.object({
  timestamp: z.date().default(() => new Date()),
  model_id: z.string(),
  deployment_id: z.string().optional(),
  metrics: z.object({
    latency_p50: z.number().optional(),
    latency_p95: z.number().optional(),
    latency_p99: z.number().optional(),
    throughput: z.number().optional(),
    error_rate: z.number().optional(),
    accuracy: z.number().optional(),
    precision: z.number().optional(),
    recall: z.number().optional(),
    f1_score: z.number().optional(),
    auc_roc: z.number().optional(),
    prediction_drift: z.number().optional(),
    data_drift: z.number().optional()
  }),
  resource_usage: z.object({
    cpu_percent: z.number().optional(),
    memory_percent: z.number().optional(),
    gpu_percent: z.number().optional(),
    disk_usage_percent: z.number().optional()
  }).optional(),
  business_metrics: z.object({
    user_satisfaction: z.number().optional(),
    conversion_rate: z.number().optional(),
    revenue_impact: z.number().optional()
  }).optional()
});

type ModelMetadata = z.infer<typeof ModelMetadataSchema>;
type Experiment = z.infer<typeof ExperimentSchema>;
type Deployment = z.infer<typeof DeploymentSchema>;
type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

interface MLOpsConfig {
  model_registry: {
    enabled: boolean;
    storage_path: string;
    retention_days: number;
  };
  experiment_tracking: {
    enabled: boolean;
    auto_logging: boolean;
    artifacts_path: string;
  };
  monitoring: {
    enabled: boolean;
    metrics_interval_seconds: number;
    alert_thresholds: Record<string, number>;
    drift_detection: boolean;
  };
  deployment: {
    auto_scaling: boolean;
    canary_deployments: boolean;
    rollback_on_failure: boolean;
    blue_green_deployments: boolean;
  };
  data_pipeline: {
    validation_enabled: boolean;
    preprocessing_enabled: boolean;
    feature_store_enabled: boolean;
  };
}

interface ModelRegistry {
  models: Map<string, ModelMetadata>;
  experiments: Map<string, Experiment>;
  deployments: Map<string, Deployment>;
  metrics: PerformanceMetrics[];
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'ne';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notification_channels: string[];
  cooldown_minutes: number;
  last_triggered?: Date;
}

export class MLOpsLifecycleManager extends EventEmitter {
  private isInitialized = false;
  private config: MLOpsConfig;
  private registry: ModelRegistry;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeMonitoring: Map<string, NodeJS.Timeout> = new Map();

  // Metrics collection
  private metricsBuffer: PerformanceMetrics[] = [];
  private readonly METRICS_BUFFER_SIZE = 1000;

  constructor() {
    super();

    this.config = {
      model_registry: {
        enabled: getEnvAsBoolean('MLOPS_MODEL_REGISTRY', true),
        storage_path: getEnvAsString('MLOPS_STORAGE_PATH', './mlops_data'),
        retention_days: getEnvAsNumber('MLOPS_RETENTION_DAYS', 90)
      },
      experiment_tracking: {
        enabled: getEnvAsBoolean('MLOPS_EXPERIMENT_TRACKING', true),
        auto_logging: getEnvAsBoolean('MLOPS_AUTO_LOGGING', true),
        artifacts_path: getEnvAsString('MLOPS_ARTIFACTS_PATH', './mlops_artifacts')
      },
      monitoring: {
        enabled: getEnvAsBoolean('MLOPS_MONITORING', true),
        metrics_interval_seconds: getEnvAsNumber('MLOPS_METRICS_INTERVAL', 60),
        alert_thresholds: {
          error_rate: 0.05,
          latency_p95: 5000,
          cpu_percent: 80,
          memory_percent: 85
        },
        drift_detection: getEnvAsBoolean('MLOPS_DRIFT_DETECTION', true)
      },
      deployment: {
        auto_scaling: getEnvAsBoolean('MLOPS_AUTO_SCALING', true),
        canary_deployments: getEnvAsBoolean('MLOPS_CANARY_DEPLOYMENTS', true),
        rollback_on_failure: getEnvAsBoolean('MLOPS_AUTO_ROLLBACK', true),
        blue_green_deployments: getEnvAsBoolean('MLOPS_BLUE_GREEN', false)
      },
      data_pipeline: {
        validation_enabled: getEnvAsBoolean('MLOPS_DATA_VALIDATION', true),
        preprocessing_enabled: getEnvAsBoolean('MLOPS_PREPROCESSING', true),
        feature_store_enabled: getEnvAsBoolean('MLOPS_FEATURE_STORE', false)
      }
    };

    this.registry = {
      models: new Map(),
      experiments: new Map(),
      deployments: new Map(),
      metrics: []
    };
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create storage directories
      await this.createStorageDirectories();

      // Load existing data
      await this.loadRegistryData();

      // Setup default alert rules
      this.setupDefaultAlertRules();

      // Start monitoring if enabled
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }

      // Setup cleanup tasks
      this.setupMaintenanceTasks();

      this.isInitialized = true;
      console.log('🤖 MLOps Lifecycle Manager initialized');

    } catch (error) {
      console.error('Failed to initialize MLOps manager:', error);
      throw error;
    }
  }

  // Model Registry Management
  async registerModel(modelData: Omit<ModelMetadata, 'id' | 'created_at' | 'updated_at'>): Promise<ModelMetadata> {
    await this.init();

    try {
      const modelId = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const model: ModelMetadata = ModelMetadataSchema.parse({
        id: modelId,
        ...modelData,
        created_at: new Date(),
        updated_at: new Date()
      });

      this.registry.models.set(modelId, model);
      await this.persistRegistryData();

      console.log(`📝 Model registered: ${model.name} v${model.version}`);
      this.emit('model_registered', model);

      return model;

    } catch (error) {
      console.error('Failed to register model:', error);
      throw error;
    }
  }

  async updateModel(modelId: string, updates: Partial<ModelMetadata>): Promise<ModelMetadata> {
    await this.init();

    const model = this.registry.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const updatedModel: ModelMetadata = {
      ...model,
      ...updates,
      updated_at: new Date()
    };

    this.registry.models.set(modelId, updatedModel);
    await this.persistRegistryData();

    console.log(`🔄 Model updated: ${updatedModel.name} v${updatedModel.version}`);
    this.emit('model_updated', updatedModel);

    return updatedModel;
  }

  async getModel(modelId: string): Promise<ModelMetadata | null> {
    await this.init();
    return this.registry.models.get(modelId) || null;
  }

  async listModels(filters?: {
    type?: ModelMetadata['type'];
    status?: ModelMetadata['status'];
    framework?: ModelMetadata['framework'];
  }): Promise<ModelMetadata[]> {
    await this.init();

    let models = Array.from(this.registry.models.values());

    if (filters) {
      if (filters.type) {
        models = models.filter(m => m.type === filters.type);
      }
      if (filters.status) {
        models = models.filter(m => m.status === filters.status);
      }
      if (filters.framework) {
        models = models.filter(m => m.framework === filters.framework);
      }
    }

    return models.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  // Experiment Tracking
  async createExperiment(experimentData: Omit<Experiment, 'id' | 'created_at' | 'status'>): Promise<Experiment> {
    await this.init();

    try {
      const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const experiment: Experiment = ExperimentSchema.parse({
        id: experimentId,
        ...experimentData,
        created_at: new Date(),
        status: 'running'
      });

      this.registry.experiments.set(experimentId, experiment);
      await this.persistRegistryData();

      console.log(`🔬 Experiment started: ${experiment.name}`);
      this.emit('experiment_started', experiment);

      return experiment;

    } catch (error) {
      console.error('Failed to create experiment:', error);
      throw error;
    }
  }

  async logExperimentMetric(experimentId: string, metricName: string, value: number): Promise<void> {
    const experiment = this.registry.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    experiment.metrics[metricName] = value;
    this.registry.experiments.set(experimentId, experiment);

    if (this.config.experiment_tracking.auto_logging) {
      await this.persistRegistryData();
    }

    this.emit('experiment_metric_logged', { experimentId, metricName, value });
  }

  async completeExperiment(experimentId: string, final_metrics?: Record<string, number>): Promise<Experiment> {
    const experiment = this.registry.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    experiment.status = 'completed';
    experiment.completed_at = new Date();
    
    if (final_metrics) {
      experiment.metrics = { ...experiment.metrics, ...final_metrics };
    }

    this.registry.experiments.set(experimentId, experiment);
    await this.persistRegistryData();

    console.log(`✅ Experiment completed: ${experiment.name}`);
    this.emit('experiment_completed', experiment);

    return experiment;
  }

  // Deployment Management
  async deployModel(deploymentData: Omit<Deployment, 'id' | 'deployed_at' | 'status'>): Promise<Deployment> {
    await this.init();

    try {
      const deploymentId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const deployment: Deployment = DeploymentSchema.parse({
        id: deploymentId,
        ...deploymentData,
        deployed_at: new Date(),
        status: 'deploying'
      });

      this.registry.deployments.set(deploymentId, deployment);
      await this.persistRegistryData();

      // Start deployment process
      await this.executeDeployment(deployment);

      console.log(`🚀 Model deployed: ${deployment.model_id} to ${deployment.environment}`);
      this.emit('model_deployed', deployment);

      return deployment;

    } catch (error) {
      console.error('Failed to deploy model:', error);
      throw error;
    }
  }

  async updateDeployment(deploymentId: string, updates: Partial<Deployment>): Promise<Deployment> {
    const deployment = this.registry.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    const updatedDeployment: Deployment = {
      ...deployment,
      ...updates
    };

    this.registry.deployments.set(deploymentId, updatedDeployment);
    await this.persistRegistryData();

    this.emit('deployment_updated', updatedDeployment);
    return updatedDeployment;
  }

  async rollbackDeployment(deploymentId: string, targetVersion?: string): Promise<Deployment> {
    const deployment = this.registry.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    // Find previous successful deployment
    const previousDeployments = Array.from(this.registry.deployments.values())
      .filter(d => 
        d.model_id === deployment.model_id && 
        d.environment === deployment.environment &&
        d.status === 'active' &&
        d.id !== deploymentId
      )
      .sort((a, b) => b.deployed_at.getTime() - a.deployed_at.getTime());

    const rollbackTarget = targetVersion 
      ? previousDeployments.find(d => d.version === targetVersion)
      : previousDeployments[0];

    if (!rollbackTarget) {
      throw new Error('No valid rollback target found');
    }

    // Update current deployment status
    deployment.status = 'rolling_back';
    this.registry.deployments.set(deploymentId, deployment);

    console.log(`🔄 Rolling back deployment ${deploymentId} to version ${rollbackTarget.version}`);
    this.emit('deployment_rollback_started', { deploymentId, targetVersion: rollbackTarget.version });

    // Simulate rollback process
    await new Promise(resolve => setTimeout(resolve, 2000));

    deployment.status = 'inactive';
    rollbackTarget.status = 'active';
    
    this.registry.deployments.set(deploymentId, deployment);
    this.registry.deployments.set(rollbackTarget.id, rollbackTarget);
    await this.persistRegistryData();

    this.emit('deployment_rollback_completed', { deploymentId, targetDeploymentId: rollbackTarget.id });
    return rollbackTarget;
  }

  // Performance Monitoring
  async recordMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): Promise<void> {
    await this.init();

    const performanceMetrics: PerformanceMetrics = PerformanceMetricsSchema.parse({
      ...metrics,
      timestamp: new Date()
    });

    this.metricsBuffer.push(performanceMetrics);
    this.registry.metrics.push(performanceMetrics);

    // Maintain buffer size
    if (this.metricsBuffer.length > this.METRICS_BUFFER_SIZE) {
      this.metricsBuffer.shift();
    }

    // Check alert conditions
    await this.checkAlertConditions(performanceMetrics);

    this.emit('metrics_recorded', performanceMetrics);
  }

  async getMetrics(
    modelId: string, 
    timeRange?: { start: Date; end: Date },
    aggregation?: 'avg' | 'min' | 'max' | 'sum'
  ): Promise<PerformanceMetrics[]> {
    await this.init();

    let metrics = this.registry.metrics.filter(m => m.model_id === modelId);

    if (timeRange) {
      metrics = metrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    // Apply aggregation if requested
    if (aggregation && metrics.length > 0) {
      // Simplified aggregation implementation
      const aggregatedMetrics = this.aggregateMetrics(metrics, aggregation);
      return [aggregatedMetrics];
    }

    return metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Drift Detection
  async detectDrift(modelId: string, currentData: unknown[], referenceData?: unknown[]): Promise<{
    prediction_drift: number;
    data_drift: number;
    drift_detected: boolean;
    recommendations: string[];
  }> {
    await this.init();

    if (!this.config.monitoring.drift_detection) {
      throw new Error('Drift detection is disabled');
    }

    try {
      // Simplified drift detection implementation
      const predictionDrift = Math.random() * 0.3; // Simulate drift calculation
      const dataDrift = Math.random() * 0.25;
      
      const driftThreshold = 0.2;
      const driftDetected = predictionDrift > driftThreshold || dataDrift > driftThreshold;

      const recommendations: string[] = [];
      if (predictionDrift > driftThreshold) {
        recommendations.push('Model performance has degraded - consider retraining');
      }
      if (dataDrift > driftThreshold) {
        recommendations.push('Input data distribution has changed - update preprocessing');
      }

      const result = {
        prediction_drift: predictionDrift,
        data_drift: dataDrift,
        drift_detected: driftDetected,
        recommendations
      };

      if (driftDetected) {
        console.warn(`⚠️ Drift detected for model ${modelId}: prediction=${predictionDrift.toFixed(3)}, data=${dataDrift.toFixed(3)}`);
        this.emit('drift_detected', { modelId, ...result });
      }

      return result;

    } catch (error) {
      console.error('Drift detection failed:', error);
      throw error;
    }
  }

  // A/B Testing
  async createABTest(config: {
    name: string;
    model_a_id: string;
    model_b_id: string;
    traffic_split: number; // Percentage for model B
    environment: string;
    duration_hours: number;
    success_metric: string;
  }): Promise<{
    test_id: string;
    start_time: Date;
    end_time: Date;
    configuration: typeof config;
  }> {
    await this.init();

    const testId = `ab_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + config.duration_hours * 60 * 60 * 1000);

    const abTest = {
      test_id: testId,
      start_time: startTime,
      end_time: endTime,
      configuration: config
    };

    console.log(`🧪 A/B test started: ${config.name} (${config.traffic_split}% to model B)`);
    this.emit('ab_test_started', abTest);

    // Schedule test completion
    setTimeout(async () => {
      await this.completeABTest(testId);
    }, config.duration_hours * 60 * 60 * 1000);

    return abTest;
  }

  private async completeABTest(testId: string): Promise<void> {
    // Simulate A/B test completion and analysis
    const results = {
      test_id: testId,
      completed_at: new Date(),
      model_a_performance: {
        conversion_rate: 0.12 + Math.random() * 0.05,
        avg_latency: 150 + Math.random() * 50,
        error_rate: Math.random() * 0.02
      },
      model_b_performance: {
        conversion_rate: 0.14 + Math.random() * 0.05,
        avg_latency: 160 + Math.random() * 40,
        error_rate: Math.random() * 0.015
      },
      winner: Math.random() > 0.5 ? 'model_a' : 'model_b',
      confidence: 0.85 + Math.random() * 0.1
    };

    console.log(`✅ A/B test completed: ${testId}, winner: ${results.winner}`);
    this.emit('ab_test_completed', results);
  }

  // Alert Management
  private async checkAlertConditions(metrics: PerformanceMetrics): Promise<void> {
    for (const [alertId, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.last_triggered) {
        const cooldownMs = rule.cooldown_minutes * 60 * 1000;
        if (Date.now() - rule.last_triggered.getTime() < cooldownMs) {
          continue;
        }
      }

      const metricValue = this.extractMetricValue(metrics, rule.metric);
      if (metricValue === undefined) continue;

      let triggered = false;
      switch (rule.condition) {
        case 'gt':
          triggered = metricValue > rule.threshold;
          break;
        case 'lt':
          triggered = metricValue < rule.threshold;
          break;
        case 'eq':
          triggered = metricValue === rule.threshold;
          break;
        case 'ne':
          triggered = metricValue !== rule.threshold;
          break;
      }

      if (triggered) {
        await this.triggerAlert(rule, metricValue, metrics);
      }
    }
  }

  private async triggerAlert(rule: AlertRule, value: number, metrics: PerformanceMetrics): Promise<void> {
    const alert = {
      rule_id: rule.id,
      rule_name: rule.name,
      severity: rule.severity,
      metric: rule.metric,
      threshold: rule.threshold,
      actual_value: value,
      model_id: metrics.model_id,
      timestamp: new Date()
    };

    console.warn(`🚨 Alert triggered: ${rule.name} - ${rule.metric} ${rule.condition} ${rule.threshold} (actual: ${value})`);
    
    rule.last_triggered = new Date();
    this.alertRules.set(rule.id, rule);

    this.emit('alert_triggered', alert);

    // Auto-remediation for critical alerts
    if (rule.severity === 'critical' && this.config.deployment.rollback_on_failure) {
      await this.handleCriticalAlert(metrics.model_id, alert);
    }
  }

  private async handleCriticalAlert(modelId: string, alert: any): Promise<void> {
    // Find active deployment for the model
    const activeDeployment = Array.from(this.registry.deployments.values())
      .find(d => d.model_id === modelId && d.status === 'active');

    if (activeDeployment && alert.metric === 'error_rate') {
      console.error(`🚨 Critical error rate alert - initiating automatic rollback for ${modelId}`);
      try {
        await this.rollbackDeployment(activeDeployment.id);
        this.emit('auto_rollback_executed', { modelId, deploymentId: activeDeployment.id, reason: alert });
      } catch (error) {
        console.error('Auto-rollback failed:', error);
        this.emit('auto_rollback_failed', { modelId, error });
      }
    }
  }

  // Utility methods
  private async createStorageDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.config.model_registry.storage_path, { recursive: true });
      await fs.mkdir(this.config.experiment_tracking.artifacts_path, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directories:', error);
    }
  }

  private async loadRegistryData(): Promise<void> {
    try {
      const registryPath = path.join(this.config.model_registry.storage_path, 'registry.json');
      const data = await fs.readFile(registryPath, 'utf-8');
      const parsedData = JSON.parse(data);

      // Restore maps from JSON
      this.registry.models = new Map(parsedData.models || []);
      this.registry.experiments = new Map(parsedData.experiments || []);
      this.registry.deployments = new Map(parsedData.deployments || []);
      this.registry.metrics = parsedData.metrics || [];

      console.log('📂 MLOps registry data loaded');
    } catch (error) {
      console.log('📂 No existing registry data found, starting fresh');
    }
  }

  private async persistRegistryData(): Promise<void> {
    try {
      const registryPath = path.join(this.config.model_registry.storage_path, 'registry.json');
      const data = {
        models: Array.from(this.registry.models.entries()),
        experiments: Array.from(this.registry.experiments.entries()),
        deployments: Array.from(this.registry.deployments.entries()),
        metrics: this.registry.metrics.slice(-10000) // Keep last 10k metrics
      };

      await fs.writeFile(registryPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to persist registry data:', error);
    }
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Error Rate',
        metric: 'error_rate',
        condition: 'gt',
        threshold: 0.05,
        severity: 'critical',
        enabled: true,
        notification_channels: ['email', 'slack'],
        cooldown_minutes: 15
      },
      {
        name: 'High Latency P95',
        metric: 'latency_p95',
        condition: 'gt',
        threshold: 5000,
        severity: 'high',
        enabled: true,
        notification_channels: ['slack'],
        cooldown_minutes: 10
      },
      {
        name: 'High CPU Usage',
        metric: 'cpu_percent',
        condition: 'gt',
        threshold: 80,
        severity: 'medium',
        enabled: true,
        notification_channels: ['email'],
        cooldown_minutes: 30
      },
      {
        name: 'Low Accuracy',
        metric: 'accuracy',
        condition: 'lt',
        threshold: 0.85,
        severity: 'high',
        enabled: true,
        notification_channels: ['email', 'slack'],
        cooldown_minutes: 60
      }
    ];

    defaultRules.forEach(rule => {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.alertRules.set(alertId, { id: alertId, ...rule });
    });
  }

  private startMonitoring(): void {
    console.log('📊 Starting MLOps monitoring...');

    // Monitor active deployments
    const monitoringInterval = setInterval(async () => {
      for (const deployment of this.registry.deployments.values()) {
        if (deployment.status === 'active') {
          await this.collectDeploymentMetrics(deployment);
        }
      }
    }, this.config.monitoring.metrics_interval_seconds * 1000);

    this.activeMonitoring.set('deployment_monitoring', monitoringInterval);
  }

  private async collectDeploymentMetrics(deployment: Deployment): Promise<void> {
    // Simulate metrics collection
    const metrics: Omit<PerformanceMetrics, 'timestamp'> = {
      model_id: deployment.model_id,
      deployment_id: deployment.id,
      metrics: {
        latency_p50: 50 + Math.random() * 100,
        latency_p95: 150 + Math.random() * 200,
        latency_p99: 300 + Math.random() * 500,
        throughput: 100 + Math.random() * 50,
        error_rate: Math.random() * 0.02,
        accuracy: 0.85 + Math.random() * 0.1
      },
      resource_usage: {
        cpu_percent: 30 + Math.random() * 40,
        memory_percent: 40 + Math.random() * 30,
        gpu_percent: Math.random() * 80
      }
    };

    await this.recordMetrics(metrics);
  }

  private setupMaintenanceTasks(): void {
    // Daily cleanup task
    cron.schedule('0 2 * * *', async () => {
      await this.performMaintenance();
    });

    // Weekly drift detection
    cron.schedule('0 3 * * 1', async () => {
      await this.performWeeklyDriftCheck();
    });
  }

  private async performMaintenance(): Promise<void> {
    console.log('🧹 Performing MLOps maintenance...');

    // Clean old metrics
    const retentionMs = this.config.model_registry.retention_days * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - retentionMs);
    
    this.registry.metrics = this.registry.metrics.filter(m => m.timestamp > cutoffDate);

    // Archive old experiments
    for (const [expId, experiment] of this.registry.experiments.entries()) {
      if (experiment.status === 'completed' && 
          experiment.completed_at && 
          experiment.completed_at < cutoffDate) {
        // Archive experiment (simplified - just log for now)
        console.log(`📦 Archiving experiment: ${experiment.name}`);
      }
    }

    await this.persistRegistryData();
  }

  private async performWeeklyDriftCheck(): Promise<void> {
    console.log('🔍 Performing weekly drift check...');

    for (const model of this.registry.models.values()) {
      if (model.status === 'deployed') {
        try {
          // Simulate drift check with dummy data
          await this.detectDrift(model.id, [], []);
        } catch (error) {
          console.error(`Drift check failed for model ${model.id}:`, error);
        }
      }
    }
  }

  private async executeDeployment(deployment: Deployment): Promise<void> {
    try {
      // Simulate deployment process
      console.log(`🚀 Deploying ${deployment.model_id} to ${deployment.environment}...`);
      
      // Simulate deployment time
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Update deployment status
      deployment.status = 'active';
      this.registry.deployments.set(deployment.id, deployment);
      await this.persistRegistryData();

      // Start health checks if configured
      if (deployment.health_check) {
        this.startHealthChecks(deployment);
      }

    } catch (error) {
      deployment.status = 'failed';
      this.registry.deployments.set(deployment.id, deployment);
      await this.persistRegistryData();
      throw error;
    }
  }

  private startHealthChecks(deployment: Deployment): void {
    if (!deployment.health_check) return;

    const interval = setInterval(async () => {
      try {
        // Simulate health check
        const healthy = Math.random() > 0.05; // 95% success rate
        
        if (!healthy) {
          console.warn(`⚠️ Health check failed for deployment ${deployment.id}`);
          this.emit('health_check_failed', { deploymentId: deployment.id });
          
          if (this.config.deployment.rollback_on_failure) {
            await this.rollbackDeployment(deployment.id);
          }
        }
      } catch (error) {
        console.error(`Health check error for deployment ${deployment.id}:`, error);
      }
    }, deployment.health_check.interval_seconds * 1000);

    this.activeMonitoring.set(`health_${deployment.id}`, interval);
  }

  private extractMetricValue(metrics: PerformanceMetrics, metricPath: string): number | undefined {
    const parts = metricPath.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return typeof value === 'number' ? value : undefined;
  }

  private aggregateMetrics(metrics: PerformanceMetrics[], aggregation: 'avg' | 'min' | 'max' | 'sum'): PerformanceMetrics {
    // Simplified aggregation implementation
    const first = metrics[0];
    const aggregatedMetrics = { ...first };

    // This is a simplified implementation - in practice, you'd aggregate each metric field
    const latencies = metrics.map(m => m.metrics.latency_p95).filter(v => v !== undefined) as number[];
    
    if (latencies.length > 0) {
      switch (aggregation) {
        case 'avg':
          aggregatedMetrics.metrics.latency_p95 = latencies.reduce((a, b) => a + b, 0) / latencies.length;
          break;
        case 'min':
          aggregatedMetrics.metrics.latency_p95 = Math.min(...latencies);
          break;
        case 'max':
          aggregatedMetrics.metrics.latency_p95 = Math.max(...latencies);
          break;
        case 'sum':
          aggregatedMetrics.metrics.latency_p95 = latencies.reduce((a, b) => a + b, 0);
          break;
      }
    }

    return aggregatedMetrics;
  }

  // Public API methods
  getConfiguration(): MLOpsConfig {
    return { ...this.config };
  }

  async updateConfiguration(updates: Partial<MLOpsConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    console.log('🔧 MLOps configuration updated');
    this.emit('configuration_updated', this.config);
  }

  getRegistryStats(): {
    models: number;
    experiments: number;
    deployments: number;
    metrics_count: number;
    active_alerts: number;
  } {
    return {
      models: this.registry.models.size,
      experiments: this.registry.experiments.size,
      deployments: this.registry.deployments.size,
      metrics_count: this.registry.metrics.length,
      active_alerts: Array.from(this.alertRules.values()).filter(r => r.enabled).length
    };
  }

  async shutdown(): Promise<void> {
    try {
      // Stop all monitoring
      for (const [key, interval] of this.activeMonitoring.entries()) {
        clearInterval(interval);
      }
      this.activeMonitoring.clear();

      // Persist final state
      await this.persistRegistryData();

      console.log('🔌 MLOps Lifecycle Manager shutdown complete');
    } catch (error) {
      console.error('Error during MLOps manager shutdown:', error);
    }
  }
}

export const mlopsLifecycleManager = new MLOpsLifecycleManager();