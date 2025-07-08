// .eslintrc.cjs
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint'
  ],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ],
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // General JavaScript/Node.js rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'no-template-curly-in-string': 'error',
    'no-unreachable-loop': 'error',
    'prefer-const': 'error',
    'prefer-template': 'error',
    'require-await': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',

    // Code style (handled by prettier, but some logical rules)
    'max-len': ['warn', { code: 120, ignoreUrls: true, ignoreStrings: true }],
    'max-params': ['warn', 4],
    'max-depth': ['warn', 4],
    'complexity': ['warn', 10],

    // Security-related rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // Discord.js specific patterns
    'no-process-exit': 'off' // Allowed for graceful shutdown
  },
  overrides: [
    {
      // Test files - more relaxed rules
      files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        'max-len': 'off',
        'no-console': 'off'
      }
    },
    {
      // Configuration files
      files: ['*.config.js', '*.config.ts', 'scripts/**/*.ts'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '*.js',
    '!.eslintrc.cjs',
    '!jest.config.js'
  ]
};

// .prettierrc.json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "overrides": [
    {
      "files": "*.md",
      "options": {
        "printWidth": 80,
        "proseWrap": "always"
      }
    }
  ]
}

// .prettierignore
dist/
node_modules/
coverage/
*.log
.env*
docker-compose.yml
Dockerfile

// tsconfig.json (updated for better type checking)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "resolveJsonModule": true,
    "experimentalDecorators": false,
    "emitDecoratorMetadata": false,
    "types": ["node", "jest"]
  },
  "include": [
    "src/**/*",
    "tests/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "coverage"
  ],
  "ts-node": {
    "esm": true
  }
}

// .gitignore (enhanced)
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json
yarn.lock

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development
.env.test
.env.production

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test
.env.local
.env.development
.env.production

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Docker
.dockerignore
docker-compose.override.yml

# Database
*.db
*.sqlite
*.sqlite3

# Prisma
prisma/dev.db*
prisma/migrations/**/migration.sql

# Testing
test-results/
playwright-report/
test-output/

# IDE
.vscode/
.idea/
*.iml

# scripts/code-quality.ts - Code quality checker script
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface QualityMetrics {
  linting: {
    errors: number;
    warnings: number;
    fixable: number;
  };
  testing: {
    coverage: {
      lines: number;
      functions: number;
      branches: number;
      statements: number;
    };
    tests: {
      passed: number;
      failed: number;
      total: number;
    };
  };
  typeScript: {
    errors: number;
    warnings: number;
  };
  dependencies: {
    vulnerabilities: number;
    outdated: number;
  };
}

export class CodeQualityChecker {
  private projectRoot: string;

  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async checkAll(): Promise<QualityMetrics> {
    console.log('🔍 Running comprehensive code quality check...\n');

    const metrics: QualityMetrics = {
      linting: await this.checkLinting(),
      testing: await this.checkTesting(),
      typeScript: await this.checkTypeScript(),
      dependencies: await this.checkDependencies()
    };

    this.printSummary(metrics);
    return metrics;
  }

  private async checkLinting(): Promise<QualityMetrics['linting']> {
    console.log('📏 Checking code style and linting...');
    
    try {
      const result = execSync('npm run lint:check', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      // Parse ESLint output to count errors/warnings
      const lines = result.split('\n');
      let errors = 0;
      let warnings = 0;
      let fixable = 0;

      for (const line of lines) {
        if (line.includes('error')) errors++;
        if (line.includes('warning')) warnings++;
        if (line.includes('fixable')) fixable++;
      }

      console.log(`✅ Linting: ${errors} errors, ${warnings} warnings\n`);
      return { errors, warnings, fixable };
      
    } catch (error: any) {
      console.log(`❌ Linting failed: ${error.message}\n`);
      return { errors: 999, warnings: 0, fixable: 0 };
    }
  }

  private async checkTesting(): Promise<QualityMetrics['testing']> {
    console.log('🧪 Running tests and coverage...');
    
    try {
      const result = execSync('npm run test:ci', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });

      // Parse Jest output for coverage and test results
      const coverage = this.parseCoverageReport();
      const testResults = this.parseTestResults(result);

      console.log(`✅ Tests: ${testResults.passed}/${testResults.total} passed`);
      console.log(`✅ Coverage: ${coverage.lines}% lines, ${coverage.functions}% functions\n`);
      
      return { coverage, tests: testResults };
      
    } catch (error: any) {
      console.log(`❌ Tests failed: ${error.message}\n`);
      return {
        coverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
        tests: { passed: 0, failed: 999, total: 999 }
      };
    }
  }

  private async checkTypeScript(): Promise<QualityMetrics['typeScript']> {
    console.log('🔧 Checking TypeScript compilation...');
    
    try {
      const result = execSync('npx tsc --noEmit', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      console.log('✅ TypeScript: No compilation errors\n');
      return { errors: 0, warnings: 0 };
      
    } catch (error: any) {
      const output = error.stdout || error.message;
      const errorCount = (output.match(/error TS/g) || []).length;
      const warningCount = (output.match(/warning TS/g) || []).length;
      
      console.log(`❌ TypeScript: ${errorCount} errors, ${warningCount} warnings\n`);
      return { errors: errorCount, warnings: warningCount };
    }
  }

  private async checkDependencies(): Promise<QualityMetrics['dependencies']> {
    console.log('📦 Checking dependencies...');
    
    try {
      // Check for vulnerabilities
      const auditResult = execSync('npm audit --json', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const auditData = JSON.parse(auditResult);
      const vulnerabilities = auditData.metadata?.vulnerabilities?.total || 0;

      // Check for outdated packages
      const outdatedResult = execSync('npm outdated --json', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const outdatedData = JSON.parse(outdatedResult || '{}');
      const outdated = Object.keys(outdatedData).length;

      console.log(`✅ Dependencies: ${vulnerabilities} vulnerabilities, ${outdated} outdated\n`);
      return { vulnerabilities, outdated };
      
    } catch (error: any) {
      // npm audit/outdated can exit with non-zero even for warnings
      console.log('⚠️  Could not check dependencies\n');
      return { vulnerabilities: 0, outdated: 0 };
    }
  }

  private parseCoverageReport(): QualityMetrics['testing']['coverage'] {
    const coveragePath = join(this.projectRoot, 'coverage', 'coverage-summary.json');
    
    if (!existsSync(coveragePath)) {
      return { lines: 0, functions: 0, branches: 0, statements: 0 };
    }
    
    try {
      const coverage = JSON.parse(readFileSync(coveragePath, 'utf8'));
      const total = coverage.total;
      
      return {
        lines: Math.round(total.lines.pct),
        functions: Math.round(total.functions.pct),
        branches: Math.round(total.branches.pct),
        statements: Math.round(total.statements.pct)
      };
    } catch {
      return { lines: 0, functions: 0, branches: 0, statements: 0 };
    }
  }

  private parseTestResults(output: string): QualityMetrics['testing']['tests'] {
    const testLines = output.split('\n').filter(line => 
      line.includes('Tests:') || line.includes('✓') || line.includes('✗')
    );
    
    // Simple parsing - would be more robust with Jest JSON reporter
    let passed = 0;
    let failed = 0;
    
    for (const line of testLines) {
      const passMatch = line.match(/(\d+) passing/);
      const failMatch = line.match(/(\d+) failing/);
      
      if (passMatch) passed = parseInt(passMatch[1]);
      if (failMatch) failed = parseInt(failMatch[1]);
    }
    
    return { passed, failed, total: passed + failed };
  }

  private printSummary(metrics: QualityMetrics): void {
    console.log('📊 CODE QUALITY SUMMARY');
    console.log('========================\n');
    
    // Calculate overall score
    const lintingScore = metrics.linting.errors === 0 ? 100 : Math.max(0, 100 - metrics.linting.errors * 10);
    const testingScore = metrics.testing.tests.total > 0 
      ? (metrics.testing.tests.passed / metrics.testing.tests.total) * 100 
      : 0;
    const coverageScore = (
      metrics.testing.coverage.lines + 
      metrics.testing.coverage.functions + 
      metrics.testing.coverage.branches + 
      metrics.testing.coverage.statements
    ) / 4;
    const typeScriptScore = metrics.typeScript.errors === 0 ? 100 : Math.max(0, 100 - metrics.typeScript.errors * 5);
    const dependencyScore = metrics.dependencies.vulnerabilities === 0 ? 100 : Math.max(0, 100 - metrics.dependencies.vulnerabilities * 20);
    
    const overallScore = Math.round((lintingScore + testingScore + coverageScore + typeScriptScore + dependencyScore) / 5);
    
    console.log(`Overall Quality Score: ${overallScore}/100 ${this.getScoreEmoji(overallScore)}\n`);
    
    console.log(`Linting:       ${lintingScore}/100 (${metrics.linting.errors} errors, ${metrics.linting.warnings} warnings)`);
    console.log(`Testing:       ${Math.round(testingScore)}/100 (${metrics.testing.tests.passed}/${metrics.testing.tests.total} tests passing)`);
    console.log(`Coverage:      ${Math.round(coverageScore)}/100 (${metrics.testing.coverage.lines}% lines covered)`);
    console.log(`TypeScript:    ${Math.round(typeScriptScore)}/100 (${metrics.typeScript.errors} compilation errors)`);
    console.log(`Dependencies:  ${Math.round(dependencyScore)}/100 (${metrics.dependencies.vulnerabilities} vulnerabilities)\n`);
    
    if (overallScore < 80) {
      console.log('⚠️  Quality score below 80%. Consider addressing the issues above.');
    } else if (overallScore < 90) {
      console.log('✅ Good quality score! Minor improvements possible.');
    } else {
      console.log('🎉 Excellent code quality!');
    }
  }

  private getScoreEmoji(score: number): string {
    if (score >= 95) return '🎉';
    if (score >= 90) return '✅';
    if (score >= 80) return '👍';
    if (score >= 70) return '⚠️';
    return '❌';
  }
}

// CLI runner
if (process.argv[1].endsWith('code-quality.ts')) {
  const checker = new CodeQualityChecker();
  checker.checkAll().catch(console.error);
}

// .github/workflows/quality.yml - GitHub Actions for quality checks
name: Code Quality

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  quality:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Check code formatting
      run: npx prettier --check .

    - name: Run ESLint
      run: npm run lint:check

    - name: Check TypeScript compilation
      run: npx tsc --noEmit

    - name: Run quality checker
      run: tsx scripts/code-quality.ts

    - name: Check for security vulnerabilities
      run: npm audit --audit-level moderate

    - name: Upload quality metrics
      uses: actions/upload-artifact@v3
      with:
        name: quality-report
        path: |
          coverage/
          *.log