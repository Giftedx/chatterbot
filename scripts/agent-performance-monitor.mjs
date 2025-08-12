#!/usr/bin/env node

/**
 * AI Agent Performance Monitor
 * Tracks and optimizes performance for GitHub Copilot agents
 * working within this repository
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const metricsDir = join(projectRoot, '.agent-metrics');

class AgentPerformanceMonitor {
  constructor() {
    this.recommendations = [];
    this.metrics = {
      timestamp: new Date().toISOString(),
      environment: {
        isAgent: process.env.COPILOT_AGENT === 'true',
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      },
      operations: {},
      recommendations: []
    };
    
    // Ensure metrics directory exists
    if (!existsSync(metricsDir)) {
      mkdirSync(metricsDir, { recursive: true });
    }
  }

  async measureOperation(name, operation, options = {}) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      this.metrics.operations[name] = {
        duration: endTime - startTime,
        success: true,
        memoryDelta: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external
        },
        options
      };
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      this.metrics.operations[name] = {
        duration: endTime - startTime,
        success: false,
        error: error.message,
        options
      };
      
      throw error;
    }
  }

  async measureCommand(name, command, options = {}) {
    return this.measureOperation(name, () => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const child = spawn('sh', ['-c', command], {
          cwd: projectRoot,
          stdio: options.stdio || 'pipe',
          timeout: options.timeout || 60000
        });
        
        let stdout = '';
        let stderr = '';
        
        if (child.stdout) {
          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });
        }
        
        if (child.stderr) {
          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });
        }
        
        child.on('close', (code) => {
          const duration = Date.now() - startTime;
          if (code === 0) {
            resolve({ stdout, stderr, duration, exitCode: code });
          } else {
            reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
          }
        });
        
        child.on('error', reject);
      });
    }, options);
  }

  async benchmarkCoreOperations() {
    console.log('🔍 Benchmarking core operations...');
    
    // Test npm operations
    try {
      await this.measureCommand('npm_version', 'npm --version');
      await this.measureCommand('node_version', 'node --version');
    } catch (error) {
      this.recommendations.push('Node.js or npm not accessible - check PATH');
    }
    
    // Test linting
    try {
      await this.measureCommand('lint', 'npm run lint --if-present', { timeout: 30000 });
    } catch (error) {
      this.recommendations.push('Linting failed - check ESLint configuration');
    }
    
    // Test TypeScript compilation check
    try {
      await this.measureCommand('typecheck', 'npm run typecheck --if-present', { 
        timeout: 60000,
        allowFailure: true 
      });
    } catch (error) {
      // Expected to fail due to Prisma issues
      this.recommendations.push('TypeScript compilation issues detected (expected due to Prisma)');
    }
    
    // Test health server startup
    try {
      await this.measureOperation('health_server_startup', async () => {
        const child = spawn('npm', ['run', 'dev:health'], {
          cwd: projectRoot,
          stdio: 'pipe'
        });
        
        // Wait for server to start
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            child.kill();
            reject(new Error('Health server startup timeout'));
          }, 10000);
          
          child.stdout.on('data', (data) => {
            if (data.toString().includes('listening') || data.toString().includes('ready')) {
              clearTimeout(timeout);
              child.kill();
              resolve();
            }
          });
          
          child.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      });
    } catch (error) {
      this.recommendations.push('Health server startup failed - check environment setup');
    }
    
    // Test basic file operations
    await this.measureOperation('file_read_package_json', async () => {
      return JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    });
    
    await this.measureOperation('file_read_instructions', async () => {
      return readFileSync(join(projectRoot, '.github/COPILOT_INSTRUCTIONS.md'), 'utf8');
    });
  }

  async analyzeProjectComplexity() {
    console.log('📊 Analyzing project complexity...');
    
    try {
      // Count files
      const fileCount = await this.measureCommand('count_files', 
        'find src -name "*.ts" -o -name "*.js" -o -name "*.mjs" | wc -l');
      
      // Count lines of code
      const locCount = await this.measureCommand('count_lines',
        'find src -name "*.ts" -o -name "*.js" -o -name "*.mjs" | xargs wc -l | tail -n 1');
      
      // Count test files
      const testFileCount = await this.measureCommand('count_test_files',
        'find src -name "*.test.ts" -o -name "*.spec.ts" | wc -l');
      
      this.metrics.complexity = {
        sourceFiles: parseInt(fileCount.stdout.trim()),
        linesOfCode: parseInt(locCount.stdout.trim().split(/\s+/)[0]),
        testFiles: parseInt(testFileCount.stdout.trim())
      };
      
    } catch (error) {
      this.recommendations.push('Could not analyze project complexity - check file access');
    }
  }

  async checkResourceUsage() {
    console.log('💾 Checking resource usage...');
    
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.metrics.resources = {
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    };
    
    // Check node_modules size
    try {
      const nodeModulesSize = await this.measureCommand('node_modules_size',
        'du -sh node_modules 2>/dev/null || echo "0K"');
      this.metrics.resources.nodeModulesSize = nodeModulesSize.stdout.trim();
    } catch (error) {
      this.metrics.resources.nodeModulesSize = 'unknown';
    }
  }

  generateOptimizationRecommendations() {
    const ops = this.metrics.operations;
    
    // Check for slow operations
    Object.entries(ops).forEach(([name, data]) => {
      if (data.success && data.duration > 30000) { // 30 seconds
        this.recommendations.push(`${name} is slow (${Math.round(data.duration)}ms) - consider optimization`);
      }
      
      if (data.memoryDelta && data.memoryDelta.heapUsed > 50 * 1024 * 1024) { // 50MB
        this.recommendations.push(`${name} uses significant memory - monitor for leaks`);
      }
    });
    
    // Environment-specific recommendations
    if (this.metrics.environment.isAgent) {
      this.recommendations.push('Agent environment detected - optimize for CI/CD performance');
      this.recommendations.push('Consider caching node_modules and build artifacts');
      this.recommendations.push('Use continue-on-error for known issues like TypeScript compilation');
    }
    
    // Memory recommendations
    const memMB = this.metrics.environment.memory.heapUsed / 1024 / 1024;
    if (memMB > 500) {
      this.recommendations.push(`High memory usage (${Math.round(memMB)}MB) - check for memory leaks`);
    }
    
    // Complexity recommendations
    if (this.metrics.complexity) {
      const loc = this.metrics.complexity.linesOfCode;
      const testRatio = this.metrics.complexity.testFiles / this.metrics.complexity.sourceFiles;
      
      if (loc > 10000) {
        this.recommendations.push('Large codebase detected - consider modularization');
      }
      
      if (testRatio < 0.5) {
        this.recommendations.push('Low test coverage ratio - consider adding more tests');
      }
    }
  }

  saveMetrics() {
    const metricsFile = join(metricsDir, `performance-${Date.now()}.json`);
    writeFileSync(metricsFile, JSON.stringify(this.metrics, null, 2));
    
    // Also save latest metrics
    const latestFile = join(metricsDir, 'latest.json');
    writeFileSync(latestFile, JSON.stringify(this.metrics, null, 2));
    
    console.log(`📈 Performance metrics saved to ${metricsFile}`);
  }

  printReport() {
    console.log('\n🚀 AI Agent Performance Report\n');
    
    // Environment info
    console.log('Environment:');
    console.log(`  • Agent Mode: ${this.metrics.environment.isAgent ? 'Yes' : 'No'}`);
    console.log(`  • Node.js: ${this.metrics.environment.nodeVersion}`);
    console.log(`  • Platform: ${this.metrics.environment.platform}`);
    console.log(`  • Memory: ${Math.round(this.metrics.environment.memory.heapUsed / 1024 / 1024)}MB\n`);
    
    // Operation performance
    console.log('Operation Performance:');
    Object.entries(this.metrics.operations).forEach(([name, data]) => {
      const status = data.success ? '✓' : '✗';
      const duration = Math.round(data.duration);
      console.log(`  ${status} ${name}: ${duration}ms`);
    });
    
    // Project complexity
    if (this.metrics.complexity) {
      console.log('\nProject Complexity:');
      console.log(`  • Source files: ${this.metrics.complexity.sourceFiles}`);
      console.log(`  • Lines of code: ${this.metrics.complexity.linesOfCode}`);
      console.log(`  • Test files: ${this.metrics.complexity.testFiles}`);
    }
    
    // Recommendations
    if (this.recommendations.length > 0) {
      console.log('\nOptimization Recommendations:');
      this.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
    
    console.log('\nFor detailed metrics, see .agent-metrics/latest.json');
  }

  async run() {
    console.log('🤖 AI Agent Performance Monitor\n');
    
    try {
      await this.benchmarkCoreOperations();
      await this.analyzeProjectComplexity();
      await this.checkResourceUsage();
      
      this.generateOptimizationRecommendations();
      this.saveMetrics();
      this.printReport();
      
    } catch (error) {
      console.error('Performance monitoring failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new AgentPerformanceMonitor();
  monitor.run().catch(console.error);
}