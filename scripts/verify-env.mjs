#!/usr/bin/env node
/**
 * Verify that required env vars from env.example exist in .env or process.env.
 * Usage:
 *   node scripts/verify-env.mjs
 *   node scripts/verify-env.mjs --strict=false
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const args = new URLSearchParams(process.argv.slice(2).join('&').replaceAll('--', ''));
const strict = args.get('strict') !== 'false';

function readEnvExampleKeys() {
  const file = path.join(repoRoot, 'env.example');
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf8');
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=')[0].trim())
    .filter(Boolean);
}

function readDotEnv() {
  const dotenvPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(dotenvPath)) return {};
  const content = fs.readFileSync(dotenvPath, 'utf8');
  const out = {};
  for (const line of content.split('\n')) {
    const l = line.trim();
    if (!l || l.startsWith('#')) continue;
    const idx = l.indexOf('=');
    if (idx === -1) continue;
    const k = l.slice(0, idx).trim();
    const v = l.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

function main() {
  const required = readEnvExampleKeys();
  if (!required.length) {
    console.log('No env.example keys found; nothing to verify.');
    return;
  }
  const fileEnv = readDotEnv();

  const missing = [];
  for (const key of required) {
    const present = key in fileEnv || key in process.env;
    if (!present) missing.push(key);
  }

  if (missing.length) {
    console.log('Missing required environment variables:');
    for (const m of missing) console.log(`- ${m}`);
    if (strict) {
      process.exitCode = 1;
    } else {
      console.log('Non-strict mode: continuing despite missing variables.');
    }
  } else {
    console.log('All required environment variables are present.');
  }
}

main();