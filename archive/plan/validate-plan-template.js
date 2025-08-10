#!/usr/bin/env node

/**
 * Implementation Plan Template Validator
 * 
 * This script validates implementation plan files against the required template structure
 * to ensure they are machine-readable, deterministic, and structured for autonomous execution.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Required template structure
const REQUIRED_SECTIONS = [
  'goal',
  'version', 
  'date_created',
  'last_updated',
  'owner',
  'tags',
  'Introduction',
  'Requirements & Constraints',
  'Implementation Steps',
  'Alternatives',
  'Dependencies',
  'Files',
  'Testing',
  'Risks & Assumptions',
  'Related Specifications / Further Reading'
];

// Required identifier prefixes (some are optional depending on plan type)
const REQUIRED_PREFIXES = ['REQ-', 'SEC-', 'CON-', 'GUD-', 'PAT-', 'TASK-', 'GOAL-', 'ALT-', 'DEP-', 'FILE-', 'TEST-', 'RISK-', 'ASSUMPTION-'];
const MANDATORY_PREFIXES = ['REQ-', 'TASK-', 'GOAL-']; // These must always be present

// Validation functions
function validateFrontMatter(content) {
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatterMatch) {
    return { valid: false, errors: ['Missing front matter section'] };
  }

  const frontMatter = frontMatterMatch[1];
  const requiredFields = ['goal', 'version', 'date_created', 'last_updated', 'owner', 'tags'];
  const errors = [];

  for (const field of requiredFields) {
    if (!frontMatter.includes(`${field}:`)) {
      errors.push(`Missing required front matter field: ${field}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateSections(content) {
  const errors = [];
  
  // Skip front matter fields in section validation
  const sectionOnlyFields = REQUIRED_SECTIONS.filter(section => 
    !['goal', 'version', 'date_created', 'last_updated', 'owner', 'tags'].includes(section)
  );
  
  for (const section of sectionOnlyFields) {
    // Check for various section header patterns
    const patterns = [
      new RegExp(`^## ${section}$`, 'm'),
      new RegExp(`^# ${section}$`, 'm'),
      new RegExp(`^## \\d+\\. ${section}$`, 'm'),
      new RegExp(`^# \\d+\\. ${section}$`, 'm'),
      new RegExp(`## ${section}`, 'm'),
      new RegExp(`# ${section}`, 'm')
    ];
    
    const found = patterns.some(pattern => pattern.test(content));
    
    if (!found) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateIdentifiers(content) {
  const errors = [];
  const foundPrefixes = new Set();

  // Extract all identifiers with prefixes - handles bold, table cells, and bullet points
  // Matches: | TASK-001 |, - GOAL-001:, **REQ-001**:, etc.
  const identifierRegex = /(?:\*\*)?([A-Z]{3,12}-\d{3})(?:\*\*)?(?=[:\\s|])/g;
  
  // Also match identifiers in table cells with pipe boundaries
  const tableIdentifierRegex = /\| ([A-Z]{3,12}-\d{3}) \|/g;
  let match;
  
  // Match regular identifiers
  while ((match = identifierRegex.exec(content)) !== null) {
    const identifier = match[1];
    const prefix = identifier.split('-')[0] + '-';
    foundPrefixes.add(prefix);
  }
  
  // Match table identifiers
  while ((match = tableIdentifierRegex.exec(content)) !== null) {
    const identifier = match[1];
    const prefix = identifier.split('-')[0] + '-';
    foundPrefixes.add(prefix);
  }

  // Debug logging removed for production use

  // Check for mandatory prefixes only
  for (const prefix of MANDATORY_PREFIXES) {
    if (!foundPrefixes.has(prefix)) {
      errors.push(`Missing mandatory identifier prefix: ${prefix}`);
    }
  }

  return { valid: errors.length === 0, errors, foundPrefixes: Array.from(foundPrefixes) };
}

function validateTaskTables(content) {
  const errors = [];
  
  // Check for task tables with required columns
  const taskTableRegex = /\| Task \| Description \| Completed \| Date \|/g;
  const taskTableMatches = content.match(taskTableRegex);
  
  if (!taskTableMatches || taskTableMatches.length === 0) {
    errors.push('Missing task tables with required columns: Task, Description, Completed, Date');
  }

  return { valid: errors.length === 0, errors };
}

function validateNoPlaceholders(content) {
  const placeholderPatterns = [
    /TODO:/g,    // TODO comments
    /FIXME:/g,   // FIXME comments
    /placeholder/g, // literal placeholder text
  ];

  const errors = [];
  
  for (const pattern of placeholderPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      errors.push(`Found placeholder content: ${matches.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validatePlanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = {
      file: filePath,
      valid: true,
      errors: [],
      warnings: []
    };

    // Run all validations
    const validations = [
      { name: 'Front Matter', result: validateFrontMatter(content) },
      { name: 'Sections', result: validateSections(content) },
      { name: 'Identifiers', result: validateIdentifiers(content) },
      { name: 'Task Tables', result: validateTaskTables(content) },
      { name: 'No Placeholders', result: validateNoPlaceholders(content) }
    ];

    for (const validation of validations) {
      if (!validation.result.valid) {
        results.valid = false;
        results.errors.push(`${validation.name}: ${validation.result.errors.join(', ')}`);
      }
    }

    return results;
  } catch (error) {
    return {
      file: filePath,
      valid: false,
      errors: [`File read error: ${error.message}`]
    };
  }
}

function validateAllPlans() {
  const planDir = path.join(__dirname);
  const files = fs.readdirSync(planDir).filter(file => file.endsWith('.md') && file !== 'validate-plan-template.js');
  
  console.log('🔍 Validating Implementation Plan Files...\n');
  
  let totalFiles = 0;
  let validFiles = 0;
  let invalidFiles = 0;

  for (const file of files) {
    const filePath = path.join(planDir, file);
    const result = validatePlanFile(filePath);
    
    totalFiles++;
    
    if (result.valid) {
      validFiles++;
      console.log(`✅ ${file} - VALID`);
    } else {
      invalidFiles++;
      console.log(`❌ ${file} - INVALID`);
      for (const error of result.errors) {
        console.log(`   • ${error}`);
      }
    }
    console.log('');
  }

  console.log('📊 Validation Summary:');
  console.log(`   Total Files: ${totalFiles}`);
  console.log(`   Valid Files: ${validFiles}`);
  console.log(`   Invalid Files: ${invalidFiles}`);
  console.log(`   Success Rate: ${((validFiles / totalFiles) * 100).toFixed(1)}%`);

  return { totalFiles, validFiles, invalidFiles };
}

// CLI interface
if (process.argv[2] === '--validate-all') {
  validateAllPlans();
} else if (process.argv[2]) {
  const filePath = process.argv[2];
  const result = validatePlanFile(filePath);
  
  if (result.valid) {
    console.log(`✅ ${filePath} is VALID`);
  } else {
    console.log(`❌ ${filePath} is INVALID:`);
    for (const error of result.errors) {
      console.log(`   • ${error}`);
    }
  }
} else {
  console.log('Implementation Plan Template Validator');
  console.log('');
  console.log('Usage:');
  console.log('  node validate-plan-template.js <plan-file.md>     - Validate specific file');
  console.log('  node validate-plan-template.js --validate-all     - Validate all plan files');
  console.log('');
  console.log('This validator ensures implementation plans follow the AI-optimized template structure.');
} 