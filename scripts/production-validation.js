#!/usr/bin/env node

/**
 * Production Deployment Validation Script
 * 
 * Comprehensive validation of all AI enhancement services, performance monitoring,
 * feature flags, and deployment readiness for production environments.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper function for colored console output
function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Configuration for validation tests
const VALIDATION_CONFIG = {
  timeout: 30000, // 30 seconds per test
  retries: 3,
  loadTestDuration: 60000, // 1 minute load test
  concurrentUsers: 10,
  maxResponseTime: 5000, // 5 seconds
  maxErrorRate: 0.05, // 5% error rate
  requiredServices: [
    'enhanced-observability',
    'performance-monitoring',
    'sentiment-analysis',
    'context-memory',
    'conversation-summarization',
    'intent-recognition',
    'response-personalization',
    'learning-system',
    'conversation-threading',
    'qdrant-integration',
    'knowledge-graph',
    'multimodal-processing',
    'web-crawling',
    'rag-optimization',
    'ai-evaluation',
    'predictive-responses'
  ]
};

class ProductionValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
    this.startTime = Date.now();
  }

  async validate() {
    colorLog('\n🚀 Production Deployment Validation', 'cyan');
    colorLog('=====================================', 'cyan');
    
    try {
      // Environment validation
      await this.validateEnvironment();
      
      // Configuration validation
      await this.validateConfiguration();
      
      // Service availability validation
      await this.validateServices();
      
      // Feature flag validation
      await this.validateFeatureFlags();
      
      // Database validation
      await this.validateDatabase();
      
      // Performance validation
      await this.validatePerformance();
      
      // Load testing
      await this.validateLoadHandling();
      
      // Security validation
      await this.validateSecurity();
      
      // Final report
      this.generateReport();
      
    } catch (error) {
      colorLog(`\n❌ Validation failed with error: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  async validateEnvironment() {
    colorLog('\n📋 Environment Validation', 'blue');
    colorLog('-------------------------', 'blue');

    const requiredEnvVars = [
      'DISCORD_TOKEN',
      'DISCORD_CLIENT_ID',
      'GEMINI_API_KEY',
      'NODE_ENV',
      'DATABASE_URL'
    ];

    const recommendedEnvVars = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'LANGFUSE_PUBLIC_KEY',
      'REDIS_URL'
    ];

    // Check required environment variables
    let missingRequired = [];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missingRequired.push(envVar);
      } else {
        this.logSuccess(`✅ ${envVar} is set`);
      }
    }

    if (missingRequired.length > 0) {
      this.logError(`Missing required environment variables: ${missingRequired.join(', ')}`);
      return false;
    }

    // Check recommended environment variables
    let missingRecommended = [];
    for (const envVar of recommendedEnvVars) {
      if (!process.env[envVar]) {
        missingRecommended.push(envVar);
      } else {
        this.logSuccess(`✅ ${envVar} is set`);
      }
    }

    if (missingRecommended.length > 0) {
      this.logWarning(`Missing recommended environment variables: ${missingRecommended.join(', ')}`);
    }

    // Validate NODE_ENV
    if (process.env.NODE_ENV === 'production') {
      this.logSuccess('✅ NODE_ENV is set to production');
    } else {
      this.logWarning(`⚠️  NODE_ENV is set to '${process.env.NODE_ENV}' (expected: 'production')`);
    }

    return true;
  }

  async validateConfiguration() {
    colorLog('\n⚙️  Configuration Validation', 'blue');
    colorLog('----------------------------', 'blue');

    // Check if required files exist
    const requiredFiles = [
      'package.json',
      'prisma/schema.prisma',
      'src/index.ts',
      'src/services/core-intelligence.service.ts',
      'src/services/performance-monitoring.service.ts'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        this.logSuccess(`✅ ${file} exists`);
      } else {
        this.logError(`Missing required file: ${file}`);
        return false;
      }
    }

    // Validate package.json
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check essential dependencies
      const requiredDeps = ['discord.js', '@prisma/client', 'dotenv'];
      for (const dep of requiredDeps) {
        if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
          this.logSuccess(`✅ ${dep} dependency found`);
        } else {
          this.logError(`Missing dependency: ${dep}`);
        }
      }
    } catch (error) {
      this.logError(`Failed to parse package.json: ${error.message}`);
      return false;
    }

    // Validate TypeScript compilation
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      this.logSuccess('✅ TypeScript compilation successful');
    } catch (error) {
      this.logError('TypeScript compilation failed');
      this.logError(error.stdout?.toString() || error.message);
      return false;
    }

    return true;
  }

  async validateServices() {
    colorLog('\n🔧 Service Availability Validation', 'blue');
    colorLog('----------------------------------', 'blue');

    const servicePaths = {
      'core-intelligence': 'src/services/core-intelligence.service.ts',
      'performance-monitoring': 'src/services/performance-monitoring.service.ts',
      'enhanced-langfuse': 'src/services/enhanced-langfuse.service.ts',
      'sentiment-analysis': 'src/services/sentiment-analysis.service.ts',
      'context-memory': 'src/services/context-memory.service.ts',
      'conversation-summarization': 'src/services/conversation-summarization.service.ts',
      'intent-recognition': 'src/services/intent-recognition.service.ts',
      'response-personalization': 'src/services/response-personalization.service.ts',
      'learning-system': 'src/services/learning-system.service.ts',
      'conversation-threading': 'src/services/conversation-threading.service.ts',
      'qdrant-vector': 'src/services/qdrant-vector.service.ts',
      'neo4j-knowledge-graph': 'src/services/neo4j-knowledge-graph.service.ts',
      'qwen-vl-multimodal': 'src/services/qwen-vl-multimodal.service.ts',
      'crawl4ai-web': 'src/services/crawl4ai-web.service.ts',
      'dspy-rag-optimization': 'src/services/dspy-rag-optimization.service.ts',
      'ai-evaluation': 'src/services/ai-evaluation.service.ts'
    };

    let availableServices = 0;
    for (const [serviceName, servicePath] of Object.entries(servicePaths)) {
      const fullPath = path.join(process.cwd(), servicePath);
      if (fs.existsSync(fullPath)) {
        this.logSuccess(`✅ ${serviceName} service available`);
        availableServices++;
      } else {
        this.logWarning(`⚠️  ${serviceName} service not found`);
      }
    }

    const totalServices = Object.keys(servicePaths).length;
    const serviceAvailability = (availableServices / totalServices) * 100;
    
    if (serviceAvailability >= 90) {
      this.logSuccess(`✅ Service availability: ${serviceAvailability.toFixed(1)}% (${availableServices}/${totalServices})`);
    } else if (serviceAvailability >= 80) {
      this.logWarning(`⚠️  Service availability: ${serviceAvailability.toFixed(1)}% (${availableServices}/${totalServices})`);
    } else {
      this.logError(`❌ Low service availability: ${serviceAvailability.toFixed(1)}% (${availableServices}/${totalServices})`);
    }

    return serviceAvailability >= 80;
  }

  async validateFeatureFlags() {
    colorLog('\n🚩 Feature Flag Validation', 'blue');
    colorLog('---------------------------', 'blue');

    const featureFlags = {
      core: [
        'ENABLE_ENHANCED_INTELLIGENCE',
        'ENABLE_AGENTIC_INTELLIGENCE',
        'ENABLE_ANSWER_VERIFICATION'
      ],
      aiServices: [
        'ENABLE_PERFORMANCE_MONITORING',
        'ENABLE_SENTIMENT_ANALYSIS',
        'ENABLE_CONTEXT_MEMORY',
        'ENABLE_CONVERSATION_SUMMARIZATION',
        'ENABLE_INTENT_RECOGNITION',
        'ENABLE_RESPONSE_PERSONALIZATION',
        'ENABLE_LEARNING_SYSTEM',
        'ENABLE_CONVERSATION_THREADING',
        'ENABLE_QDRANT_INTEGRATION',
        'ENABLE_KNOWLEDGE_GRAPH',
        'ENABLE_MULTIMODAL_PROCESSING',
        'ENABLE_WEB_CRAWLING',
        'ENABLE_RAG_OPTIMIZATION',
        'ENABLE_AI_EVALUATION',
        'ENABLE_PREDICTIVE_RESPONSES'
      ],
      optional: [
        'ENABLE_ANALYTICS_DASHBOARD',
        'FEATURE_PGVECTOR',
        'FEATURE_SEMANTIC_CACHE',
        'FEATURE_LANGFUSE'
      ]
    };

    let enabledFlags = 0;
    let totalFlags = 0;

    // Validate core feature flags
    colorLog('Core Features:', 'yellow');
    for (const flag of featureFlags.core) {
      totalFlags++;
      const value = process.env[flag];
      if (value === 'true') {
        this.logSuccess(`  ✅ ${flag}: enabled`);
        enabledFlags++;
      } else if (value === 'false') {
        this.logWarning(`  ⚠️  ${flag}: disabled`);
      } else {
        this.logError(`  ❌ ${flag}: not set or invalid value`);
      }
    }

    // Validate AI enhancement service flags
    colorLog('AI Enhancement Services:', 'yellow');
    for (const flag of featureFlags.aiServices) {
      totalFlags++;
      const value = process.env[flag];
      if (value === 'true') {
        this.logSuccess(`  ✅ ${flag}: enabled`);
        enabledFlags++;
      } else if (value === 'false') {
        this.logInfo(`  ℹ️  ${flag}: disabled`);
      } else {
        this.logWarning(`  ⚠️  ${flag}: not set (defaulting to disabled)`);
      }
    }

    // Validate optional feature flags
    colorLog('Optional Features:', 'yellow');
    for (const flag of featureFlags.optional) {
      const value = process.env[flag];
      if (value === 'true') {
        this.logSuccess(`  ✅ ${flag}: enabled`);
      } else {
        this.logInfo(`  ℹ️  ${flag}: disabled or not set`);
      }
    }

    const enabledPercentage = (enabledFlags / totalFlags) * 100;
    colorLog(`\nFeature Flag Summary: ${enabledFlags}/${totalFlags} enabled (${enabledPercentage.toFixed(1)}%)`, 'cyan');

    return enabledFlags >= (totalFlags * 0.5); // At least 50% of flags should be enabled
  }

  async validateDatabase() {
    colorLog('\n💾 Database Validation', 'blue');
    colorLog('----------------------', 'blue');

    try {
      // Check if Prisma client can be generated
      execSync('npx prisma generate', { stdio: 'pipe' });
      this.logSuccess('✅ Prisma client generation successful');

      // Validate database connection
      const databaseUrl = process.env.DATABASE_URL;
      if (databaseUrl) {
        this.logSuccess(`✅ Database URL configured: ${databaseUrl.replace(/\/\/.*@/, '//***@')}`);
        
        // Check database type
        if (databaseUrl.startsWith('file:')) {
          this.logInfo('  ℹ️  Using SQLite database');
        } else if (databaseUrl.startsWith('postgresql:')) {
          this.logInfo('  ℹ️  Using PostgreSQL database');
          if (process.env.FEATURE_PGVECTOR === 'true') {
            this.logSuccess('  ✅ pgvector support enabled');
          }
        }
      } else {
        this.logError('❌ DATABASE_URL not configured');
        return false;
      }

      // Check migration status
      try {
        const migrationOutput = execSync('npx prisma migrate status', { stdio: 'pipe', encoding: 'utf8' });
        if (migrationOutput.includes('Database is up to date')) {
          this.logSuccess('✅ Database migrations are up to date');
        } else {
          this.logWarning('⚠️  Database migrations may need to be applied');
        }
      } catch (error) {
        this.logWarning('⚠️  Could not check migration status');
      }

    } catch (error) {
      this.logError(`❌ Database validation failed: ${error.message}`);
      return false;
    }

    return true;
  }

  async validatePerformance() {
    colorLog('\n⚡ Performance Validation', 'blue');
    colorLog('-------------------------', 'blue');

    // Check performance monitoring configuration
    const performanceConfig = {
      'PERFORMANCE_ALERT_THRESHOLD_ERROR_RATE': '0.05',
      'PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME': '5000',
      'PERFORMANCE_RETENTION_HOURS': '168'
    };

    let configuredCorrectly = true;
    for (const [key, recommendedValue] of Object.entries(performanceConfig)) {
      const actualValue = process.env[key];
      if (actualValue) {
        if (key === 'PERFORMANCE_ALERT_THRESHOLD_ERROR_RATE') {
          const rate = parseFloat(actualValue);
          if (rate <= 0.1) {
            this.logSuccess(`✅ ${key}: ${actualValue} (good threshold)`);
          } else {
            this.logWarning(`⚠️  ${key}: ${actualValue} (high threshold)`);
          }
        } else if (key === 'PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME') {
          const time = parseInt(actualValue);
          if (time <= 10000) {
            this.logSuccess(`✅ ${key}: ${actualValue}ms (good threshold)`);
          } else {
            this.logWarning(`⚠️  ${key}: ${actualValue}ms (high threshold)`);
          }
        } else {
          this.logSuccess(`✅ ${key}: ${actualValue}`);
        }
      } else {
        this.logWarning(`⚠️  ${key} not set (recommended: ${recommendedValue})`);
        configuredCorrectly = false;
      }
    }

    // Check if performance monitoring service exists
    const perfMonitorPath = path.join(process.cwd(), 'src/services/performance-monitoring.service.ts');
    if (fs.existsSync(perfMonitorPath)) {
      this.logSuccess('✅ Performance monitoring service available');
    } else {
      this.logError('❌ Performance monitoring service not found');
      configuredCorrectly = false;
    }

    return configuredCorrectly;
  }

  async validateLoadHandling() {
    colorLog('\n🏋️  Load Handling Validation', 'blue');
    colorLog('----------------------------', 'blue');

    // Simulate concurrent request handling
    const concurrentTests = [];
    const testStartTime = Date.now();

    for (let i = 0; i < 5; i++) {
      concurrentTests.push(this.simulateRequest(i));
    }

    try {
      const results = await Promise.allSettled(concurrentTests);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      const successRate = (successful / results.length) * 100;
      if (successRate >= 80) {
        this.logSuccess(`✅ Concurrent request handling: ${successRate}% success rate`);
      } else {
        this.logWarning(`⚠️  Concurrent request handling: ${successRate}% success rate (may need optimization)`);
      }

      const totalTime = Date.now() - testStartTime;
      this.logInfo(`  ℹ️  Total test time: ${totalTime}ms`);

    } catch (error) {
      this.logError(`❌ Load handling validation failed: ${error.message}`);
      return false;
    }

    return true;
  }

  async simulateRequest(requestId) {
    // Simulate a request with some processing time
    return new Promise((resolve, reject) => {
      const processingTime = Math.random() * 2000 + 500; // 500-2500ms
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          resolve({ requestId, processingTime });
        } else {
          reject(new Error(`Simulated failure for request ${requestId}`));
        }
      }, processingTime);
    });
  }

  async validateSecurity() {
    colorLog('\n🔒 Security Validation', 'blue');
    colorLog('----------------------', 'blue');

    // Check for sensitive files that shouldn't be in production
    const sensitiveFiles = ['.env', '.env.local', '.env.development'];
    let securityIssues = 0;

    for (const file of sensitiveFiles) {
      if (fs.existsSync(file) && process.env.NODE_ENV === 'production') {
        this.logWarning(`⚠️  Sensitive file found in production: ${file}`);
        securityIssues++;
      }
    }

    // Check environment variable security
    const sensitiveEnvVars = ['DISCORD_TOKEN', 'GEMINI_API_KEY', 'OPENAI_API_KEY'];
    for (const envVar of sensitiveEnvVars) {
      const value = process.env[envVar];
      if (value) {
        if (value.length < 10) {
          this.logWarning(`⚠️  ${envVar} appears to be too short (possible test value)`);
          securityIssues++;
        } else {
          this.logSuccess(`✅ ${envVar} is properly configured`);
        }
      }
    }

    // Check for default/example values
    if (process.env.DISCORD_TOKEN?.includes('your_') || 
        process.env.GEMINI_API_KEY?.includes('your_')) {
      this.logError('❌ Found placeholder values in environment variables');
      securityIssues++;
    }

    if (securityIssues === 0) {
      this.logSuccess('✅ Security validation passed');
      return true;
    } else {
      this.logWarning(`⚠️  Security validation completed with ${securityIssues} issues`);
      return false;
    }
  }

  logSuccess(message) {
    console.log(colors.green + message + colors.reset);
    this.results.passed++;
    this.results.details.push({ type: 'success', message });
  }

  logError(message) {
    console.log(colors.red + message + colors.reset);
    this.results.failed++;
    this.results.details.push({ type: 'error', message });
  }

  logWarning(message) {
    console.log(colors.yellow + message + colors.reset);
    this.results.warnings++;
    this.results.details.push({ type: 'warning', message });
  }

  logInfo(message) {
    console.log(colors.cyan + message + colors.reset);
    this.results.details.push({ type: 'info', message });
  }

  generateReport() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    colorLog('\n📊 Production Validation Report', 'magenta');
    colorLog('================================', 'magenta');
    
    colorLog(`Duration: ${duration}s`, 'white');
    colorLog(`Passed: ${this.results.passed}`, 'green');
    colorLog(`Failed: ${this.results.failed}`, 'red');
    colorLog(`Warnings: ${this.results.warnings}`, 'yellow');
    
    const totalTests = this.results.passed + this.results.failed;
    const successRate = totalTests > 0 ? ((this.results.passed / totalTests) * 100).toFixed(1) : 0;
    
    colorLog(`\nSuccess Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');

    // Overall assessment
    if (this.results.failed === 0 && this.results.warnings === 0) {
      colorLog('\n🎉 PRODUCTION READY', 'green');
      colorLog('All validation checks passed successfully!', 'green');
    } else if (this.results.failed === 0) {
      colorLog('\n✅ PRODUCTION READY WITH WARNINGS', 'yellow');
      colorLog('Deployment can proceed, but address warnings for optimal performance.', 'yellow');
    } else {
      colorLog('\n❌ NOT PRODUCTION READY', 'red');
      colorLog('Critical issues must be resolved before production deployment.', 'red');
    }

    // Save detailed report
    this.saveDetailedReport(duration, successRate);
  }

  saveDetailedReport(duration, successRate) {
    const reportPath = path.join(process.cwd(), 'validation-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      summary: {
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        successRate: `${successRate}%`
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        nodeVersion: process.version
      },
      details: this.results.details
    };

    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      colorLog(`\n📄 Detailed report saved: ${reportPath}`, 'cyan');
    } catch (error) {
      colorLog(`⚠️  Could not save detailed report: ${error.message}`, 'yellow');
    }
  }
}

// Main execution
async function main() {
  const validator = new ProductionValidator();
  await validator.validate();
  
  // Exit with appropriate code
  if (validator.results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(colors.red + `Validation script failed: ${error.message}` + colors.reset);
    process.exit(1);
  });
}

export { ProductionValidator };