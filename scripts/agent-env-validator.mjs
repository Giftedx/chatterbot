#!/usr/bin/env node

/**
 * AI Agent Environment Validator
 * Comprehensive validation script for GitHub Copilot agents
 * and human developers to ensure optimal development environment
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class AgentEnvironmentValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
    this.isAgentEnvironment = process.env.COPILOT_AGENT === 'true' || 
                              process.env.GITHUB_ACTIONS === 'true';
  }

  log(message, type = 'info') {
    const prefix = {
      success: `${colors.green}✓${colors.reset}`,
      error: `${colors.red}✗${colors.reset}`,
      warning: `${colors.yellow}⚠${colors.reset}`,
      info: `${colors.blue}ℹ${colors.reset}`
    };
    
    console.log(`${prefix[type]} ${message}`);
  }

  async validateNodeEnvironment() {
    this.log('Validating Node.js environment...', 'info');
    
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      
      this.log(`Node.js version: ${nodeVersion}`, 'success');
      this.log(`npm version: ${npmVersion}`, 'success');
      
      // Check Node version requirement
      const nodeVersionNumber = parseFloat(nodeVersion.substring(1));
      if (nodeVersionNumber < 18) {
        this.issues.push('Node.js version should be 18 or higher');
      }
    } catch (error) {
      this.issues.push('Node.js not found or not accessible');
    }
  }

  async validateProjectStructure() {
    this.log('Validating project structure...', 'info');
    
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      '.github/COPILOT_INSTRUCTIONS.md',
      'docs/ARCHITECTURE.md',
      'docs/context/agent-brief.md',
      'env.example',
      'src/index.ts',
      'jest.config.js'
    ];
    
    const requiredDirectories = [
      'src',
      'src/services',
      'src/test',
      'docs',
      'scripts',
      '.github'
    ];
    
    for (const file of requiredFiles) {
      const filePath = join(projectRoot, file);
      if (existsSync(filePath)) {
        this.log(`Found: ${file}`, 'success');
      } else {
        this.issues.push(`Missing required file: ${file}`);
      }
    }
    
    for (const dir of requiredDirectories) {
      const dirPath = join(projectRoot, dir);
      if (existsSync(dirPath)) {
        this.log(`Found directory: ${dir}`, 'success');
      } else {
        this.issues.push(`Missing required directory: ${dir}`);
      }
    }
  }

  async validateDependencies() {
    this.log('Validating dependencies...', 'info');
    
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Check if node_modules exists
      const nodeModulesPath = join(projectRoot, 'node_modules');
      if (existsSync(nodeModulesPath)) {
        this.log('node_modules directory found', 'success');
      } else {
        this.issues.push('node_modules not found - run "npm install"');
      }
      
      // Check critical dependencies
      const criticalDeps = [
        'discord.js',
        '@google/generative-ai',
        'prisma',
        'typescript',
        'jest',
        'tsx'
      ];
      
      for (const dep of criticalDeps) {
        if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
          this.log(`Dependency found: ${dep}`, 'success');
        } else {
          this.warnings.push(`Critical dependency missing from package.json: ${dep}`);
        }
      }
      
    } catch (error) {
      this.issues.push('Could not read or parse package.json');
    }
  }

  async validateEnvironmentVariables() {
    this.log('Validating environment variables...', 'info');
    
    try {
      const envExamplePath = join(projectRoot, 'env.example');
      if (!existsSync(envExamplePath)) {
        this.warnings.push('env.example file not found');
        return;
      }
      
      const envExample = readFileSync(envExamplePath, 'utf8');
      const envVars = envExample
        .split('\n')
        .filter(line => line.includes('=') && !line.startsWith('#'))
        .map(line => line.split('=')[0].trim());
      
      const requiredForAgent = [
        'NODE_ENV',
        'HEALTH_CHECK_PORT'
      ];
      
      const optionalButRecommended = [
        'DISCORD_TOKEN',
        'DISCORD_CLIENT_ID',
        'GEMINI_API_KEY'
      ];
      
      for (const envVar of requiredForAgent) {
        if (process.env[envVar]) {
          this.log(`Environment variable set: ${envVar}`, 'success');
        } else {
          this.warnings.push(`Recommended environment variable not set: ${envVar}`);
        }
      }
      
      for (const envVar of optionalButRecommended) {
        if (process.env[envVar]) {
          this.log(`Optional environment variable set: ${envVar}`, 'success');
        } else {
          this.suggestions.push(`Consider setting ${envVar} for full functionality`);
        }
      }
      
    } catch (error) {
      this.warnings.push('Could not validate environment variables');
    }
  }

  async validateScripts() {
    this.log('Validating available scripts...', 'info');
    
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      
      const importantScripts = [
        'lint',
        'test',
        'dev:health',
        'typecheck',
        'build'
      ];
      
      for (const script of importantScripts) {
        if (scripts[script]) {
          this.log(`Script available: npm run ${script}`, 'success');
        } else {
          this.warnings.push(`Script not found: ${script}`);
        }
      }
      
    } catch (error) {
      this.warnings.push('Could not validate npm scripts');
    }
  }

  async validateAgentSpecificSetup() {
    if (!this.isAgentEnvironment) {
      this.log('Not in agent environment, skipping agent-specific checks', 'info');
      return;
    }
    
    this.log('Validating GitHub Copilot agent-specific setup...', 'info');
    
    // Check for agent configuration files
    const agentFiles = [
      '.github/copilot-extensions.yml',
      '.github/COPILOT_AGENT_SETUP.md'
    ];
    
    for (const file of agentFiles) {
      const filePath = join(projectRoot, file);
      if (existsSync(filePath)) {
        this.log(`Agent configuration found: ${file}`, 'success');
      } else {
        this.suggestions.push(`Consider adding agent configuration: ${file}`);
      }
    }
    
    // Validate agent environment variables
    const agentEnvVars = [
      'GITHUB_ACTIONS',
      'GITHUB_WORKSPACE',
      'RUNNER_OS'
    ];
    
    for (const envVar of agentEnvVars) {
      if (process.env[envVar]) {
        this.log(`Agent environment variable: ${envVar}`, 'success');
      }
    }
  }

  async validateNetworkAccess() {
    this.log('Validating network access...', 'info');
    
    const testEndpoints = [
      { name: 'GitHub API', url: 'https://api.github.com', optional: false },
      { name: 'npm registry', url: 'https://registry.npmjs.org', optional: false },
      { name: 'Prisma binaries', url: 'https://binaries.prisma.sh', optional: true },
      { name: 'Discord API', url: 'https://discord.com/api', optional: true }
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        // Simple connectivity test (for agent environments)
        if (this.isAgentEnvironment) {
          this.suggestions.push(`Network test for ${endpoint.name} - check firewall allowlist`);
        } else {
          this.log(`Network endpoint: ${endpoint.name} (${endpoint.url})`, 'info');
        }
      } catch (error) {
        if (!endpoint.optional) {
          this.warnings.push(`Cannot reach required endpoint: ${endpoint.name}`);
        } else {
          this.suggestions.push(`Optional endpoint not accessible: ${endpoint.name}`);
        }
      }
    }
  }

  async validateToolchain() {
    this.log('Validating development toolchain...', 'info');
    
    const tools = [
      { name: 'TypeScript', command: 'npx tsc --version' },
      { name: 'ESLint', command: 'npx eslint --version' },
      { name: 'Jest', command: 'npx jest --version' },
      { name: 'Prisma', command: 'npx prisma --version' }
    ];
    
    for (const tool of tools) {
      try {
        const version = execSync(tool.command, { 
          encoding: 'utf8',
          cwd: projectRoot,
          timeout: 5000
        }).trim();
        this.log(`${tool.name}: ${version}`, 'success');
      } catch (error) {
        this.warnings.push(`${tool.name} not available or not working`);
      }
    }
  }

  generateReport() {
    console.log(`\n${colors.bold}🤖 AI Agent Environment Validation Report${colors.reset}\n`);
    
    if (this.issues.length === 0) {
      this.log('✨ Environment validation completed successfully!', 'success');
    } else {
      this.log(`❌ Found ${this.issues.length} critical issue(s)`, 'error');
    }
    
    if (this.issues.length > 0) {
      console.log(`\n${colors.red}${colors.bold}Critical Issues:${colors.reset}`);
      this.issues.forEach(issue => console.log(`  • ${issue}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bold}Warnings:${colors.reset}`);
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
    
    if (this.suggestions.length > 0) {
      console.log(`\n${colors.blue}${colors.bold}Suggestions:${colors.reset}`);
      this.suggestions.forEach(suggestion => console.log(`  • ${suggestion}`));
    }
    
    console.log(`\n${colors.bold}Next Steps:${colors.reset}`);
    if (this.issues.length > 0) {
      console.log('  1. Address critical issues above');
      console.log('  2. Run validation again: node scripts/agent-env-validator.mjs');
    } else {
      console.log('  1. Start development: npm run dev:health');
      console.log('  2. Run tests: npm test');
      console.log('  3. Generate context: node scripts/context-snapshot.mjs');
    }
    
    console.log(`\n${colors.bold}For more information:${colors.reset}`);
    console.log('  • Read: .github/COPILOT_AGENT_SETUP.md');
    console.log('  • Review: .github/COPILOT_INSTRUCTIONS.md');
    console.log('  • Check: docs/context/agent-brief.md');
    
    // Exit with error code if critical issues found
    process.exit(this.issues.length > 0 ? 1 : 0);
  }

  async run() {
    console.log(`${colors.bold}🔍 Validating environment for AI agent collaboration...${colors.reset}\n`);
    
    if (this.isAgentEnvironment) {
      this.log('🤖 Detected GitHub Copilot agent environment', 'info');
    } else {
      this.log('👨‍💻 Detected human developer environment', 'info');
    }
    
    await this.validateNodeEnvironment();
    await this.validateProjectStructure();
    await this.validateDependencies();
    await this.validateEnvironmentVariables();
    await this.validateScripts();
    await this.validateAgentSpecificSetup();
    await this.validateNetworkAccess();
    await this.validateToolchain();
    
    this.generateReport();
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new AgentEnvironmentValidator();
  validator.run().catch(error => {
    console.error(`${colors.red}Validation failed:${colors.reset}`, error.message);
    process.exit(1);
  });
}