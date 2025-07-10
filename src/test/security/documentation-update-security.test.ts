/**
 * Security Tests for Documentation Update Patterns
 * 
 * Ensures that no runtime documentation update patterns are used,
 * which could pose security risks in production environments.
 */

import { describe, test, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Documentation Update Security', () => {
  test('should not have ENABLE_DOCUMENTATION_UPDATES environment variable usage', async () => {
    // Search for any usage of ENABLE_DOCUMENTATION_UPDATES in the codebase
    const srcDir = path.join(__dirname, '../../../src');
    const files = await getAllTypescriptFiles(srcDir);
    
    for (const file of files) {
      // Skip this security test file itself
      if (file.includes('documentation-update-security.test.ts')) {
        continue;
      }
      
      const content = await fs.promises.readFile(file, 'utf8');
      
      // Check for problematic patterns
      expect(content).not.toMatch(/ENABLE_DOCUMENTATION_UPDATES/);
      expect(content).not.toMatch(/enableDocumentationUpdates/);
      expect(content).not.toMatch(/updateDocumentation.*process\.env/);
    }
  });

  test('should not have runtime file writing patterns for documentation', async () => {
    const srcDir = path.join(__dirname, '../../../src');
    const files = await getAllTypescriptFiles(srcDir);
    
    for (const file of files) {
      const content = await fs.promises.readFile(file, 'utf8');
      
      // Check for problematic file writing patterns
      const suspiciousPatterns = [
        /fs\.writeFile.*\.md['"]/,
        /fs\.writeFileSync.*\.md['"]/,
        /writeFile.*README/,
        /writeFile.*documentation/i,
        /exec.*git.*commit.*doc/i
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          // Allow exceptions for test files and build scripts
          if (!file.includes('test') && !file.includes('build') && !file.includes('scripts')) {
            expect(content).not.toMatch(pattern);
          }
        }
      }
    }
  });

  test('should have security guidelines documentation', async () => {
    const securityGuidelinesPath = path.join(__dirname, '../../../docs/SECURITY_GUIDELINES.md');
    
    expect(fs.existsSync(securityGuidelinesPath)).toBe(true);
    
    const content = await fs.promises.readFile(securityGuidelinesPath, 'utf8');
    expect(content).toContain('ENABLE_DOCUMENTATION_UPDATES');
    expect(content).toContain('Security Risk');
    expect(content).toContain('build and deployment processes');
  });

  test('should have proper security note in env.example', async () => {
    const envExamplePath = path.join(__dirname, '../../../env.example');
    
    expect(fs.existsSync(envExamplePath)).toBe(true);
    
    const content = await fs.promises.readFile(envExamplePath, 'utf8');
    expect(content).toContain('Security Note: Documentation Updates');
    expect(content).toContain('should NOT be controlled by runtime environment variables');
    expect(content).toContain('build/deployment scripts');
  });

  test('should validate environment variable patterns', async () => {
    const envExamplePath = path.join(__dirname, '../../../env.example');
    const content = await fs.promises.readFile(envExamplePath, 'utf8');
    
    // Should not contain the problematic environment variable
    expect(content).not.toContain('ENABLE_DOCUMENTATION_UPDATES=');
    
    // Should contain valid environment variables
    expect(content).toContain('ENABLE_MODERATION=');
    expect(content).toContain('ENABLE_ANALYTICS=');
    expect(content).toContain('ENABLE_MCP_INTEGRATION=');
  });
});

async function getAllTypescriptFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...await getAllTypescriptFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not exist, that's okay
  }
  
  return files;
}