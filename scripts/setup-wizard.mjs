#!/usr/bin/env node

// Chatterbot Setup Wizard
// Guides you through configuring environment variables, fetching API keys, and writing .env

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import readline from 'readline/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const envPath = path.resolve(repoRoot, '..', '.env');
const minimalEnvExamplePath = path.resolve(repoRoot, '..', '.env.example');
const fullEnvExamplePath = path.resolve(repoRoot, '..', 'env.example');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const openUrl = async (url) => {
  const platform = process.platform;
  const opener = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  try {
    if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true });
    } else {
      spawn(opener, [url], { stdio: 'ignore', detached: true });
    }
  } catch {
    // ignore
  }
};

const yesNo = async (q, def = false) => {
  const hint = def ? 'Y/n' : 'y/N';
  const ans = (await rl.question(`${q} [${hint}] `)).trim().toLowerCase();
  if (!ans) return def;
  return ans === 'y' || ans === 'yes';
};

const ask = async (q, { required = false, mask = false } = {}) => {
  // rudimentary mask: show asterisks while typing? readline doesn't support easily; accept plain input
  // we will not echo masking, but advise the user it will be written to .env locally only.
  while (true) {
    const ans = (await rl.question(q)).trim();
    if (!required || ans) return ans;
    console.log('This value is required.');
  }
};

const section = (title) => {
  console.log(`\n=== ${title} ===`);
};

const explain = (lines) => {
  for (const line of lines) console.log(`- ${line}`);
};

const providerGuides = [
  {
    id: 'discord',
    name: 'Discord Bot',
    url: 'https://discord.com/developers/applications',
    purpose: 'Create a Discord Application, add a Bot, copy the Bot Token and Application (Client) ID.',
    how: [
      'Sign in → "New Application" → name it.',
      'Left sidebar → "Bot" → "Add Bot" → "Reset Token" → copy as DISCORD_TOKEN.',
      'Left sidebar → "General Information" → copy "Application ID" as DISCORD_CLIENT_ID.',
      'Left sidebar → "Bot" → Privileged Gateway Intents → enable "Message Content Intent".',
    ],
    keys: ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID']
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    url: 'https://aistudio.google.com/app/apikey',
    purpose: 'Obtain a Gemini API key for default provider.',
    how: [
      'Open AI Studio → "Get API key" → create/copy key.',
      'Paste as GEMINI_API_KEY.',
    ],
    keys: ['GEMINI_API_KEY']
  },
  {
    id: 'openai',
    name: 'OpenAI',
    url: 'https://platform.openai.com/api-keys',
    purpose: 'Optional: enable OpenAI models and embeddings.',
    how: [
      'Visit API Keys → "Create new secret key".',
      'Paste as OPENAI_API_KEY. Optionally set OPENAI_MODEL.',
    ],
    keys: ['OPENAI_API_KEY', 'OPENAI_MODEL']
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    url: 'https://console.anthropic.com/settings/keys',
    purpose: 'Optional: enable Anthropic models.',
    how: [
      'Create/copy key and paste as ANTHROPIC_API_KEY.',
      'Optionally set ANTHROPIC_MODEL.',
    ],
    keys: ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']
  },
  {
    id: 'groq',
    name: 'Groq',
    url: 'https://console.groq.com/keys',
    purpose: 'Optional: enable Groq LLMs (Llama 3.x).',
    how: [
      'Create/copy key and paste as GROQ_API_KEY.',
      'Optionally set GROQ_MODEL.',
    ],
    keys: ['GROQ_API_KEY', 'GROQ_MODEL']
  },
  {
    id: 'mistral',
    name: 'Mistral',
    url: 'https://console.mistral.ai/api-keys/',
    purpose: 'Optional: enable Mistral models.',
    how: [
      'Create/copy key and paste as MISTRAL_API_KEY.',
      'Optionally set MISTRAL_MODEL.',
    ],
    keys: ['MISTRAL_API_KEY', 'MISTRAL_MODEL']
  },
  {
    id: 'openai_compat',
    name: 'OpenAI-compatible endpoint (e.g., OpenRouter, vLLM)',
    url: 'https://openrouter.ai/settings/keys',
    purpose: 'Optional: use an OpenAI-compatible API.',
    how: [
      'Create/copy key and paste as OPENAI_COMPAT_API_KEY.',
      'Set OPENAI_COMPAT_BASE_URL (e.g., https://openrouter.ai/api/v1 or your vLLM /v1).',
      'Optionally set OPENAI_COMPAT_MODEL.',
    ],
    keys: ['OPENAI_COMPAT_API_KEY', 'OPENAI_COMPAT_BASE_URL', 'OPENAI_COMPAT_MODEL']
  },
  {
    id: 'brave',
    name: 'Brave Search API',
    url: 'https://api.search.brave.com/app/signup',
    purpose: 'Optional: real web search results for tools.',
    how: [
      'Sign up → get API token → paste as BRAVE_API_KEY.',
    ],
    keys: ['BRAVE_API_KEY']
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    url: 'https://www.firecrawl.dev/',
    purpose: 'Optional: robust content extraction/crawling.',
    how: [
      'Create an account → get API key (see docs quickstart) → paste as FIRECRAWL_API_KEY.',
      'Docs: https://docs.firecrawl.dev/quickstart',
    ],
    keys: ['FIRECRAWL_API_KEY']
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs (TTS)',
    url: 'https://elevenlabs.io/app/settings/api-keys',
    purpose: 'Optional: enable speech synthesis (text-to-speech).',
    how: [
      'Create/copy API key → paste as ELEVENLABS_API_KEY.',
      'Optional: set ELEVENLABS_VOICE_ID (default is provided).',
    ],
    keys: ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID']
  },
  {
    id: 'tenor',
    name: 'Tenor (GIFs)',
    url: 'https://tenor.com/developer/keyregistration',
    purpose: 'Optional: enable GIF search generation.',
    how: [
      'Register for a Tenor API key → paste as TENOR_API_KEY.',
      'Docs: https://developers.google.com/tenor/guides/quickstart',
    ],
    keys: ['TENOR_API_KEY']
  },
  {
    id: 'cohere',
    name: 'Cohere (Rerank)',
    url: 'https://dashboard.cohere.com/api-keys',
    purpose: 'Optional: rerank for RAG results.',
    how: [
      'Create/copy API key → paste as COHERE_API_KEY.',
      'Enable FEATURE_RERANK=true to use.',
    ],
    keys: ['COHERE_API_KEY']
  },
];

const collectProviders = async () => {
  const selected = new Map();

  // Always do Discord + Gemini first
  section('Discord Bot Configuration (Required)');
  console.log(`Open: ${providerGuides[0].url}`);
  if (await yesNo('Open the Discord Developer Portal in your browser?', true)) {
    await openUrl(providerGuides[0].url);
  }
  explain([providerGuides[0].purpose, ...providerGuides[0].how]);
  const DISCORD_TOKEN = await ask('Enter DISCORD_TOKEN: ', { required: true });
  const DISCORD_CLIENT_ID = await ask('Enter DISCORD_CLIENT_ID: ', { required: true });
  selected.set('DISCORD_TOKEN', DISCORD_TOKEN);
  selected.set('DISCORD_CLIENT_ID', DISCORD_CLIENT_ID);

  // Invite URL
  console.log('\nInvite URL (copy to browser to invite your bot):');
  console.log(`https://discord.com/api/oauth2/authorize?client_id=${encodeURIComponent(DISCORD_CLIENT_ID)}&scope=bot%20applications.commands&permissions=274877975552`);

  section('Default Provider: Google Gemini (Recommended)');
  console.log(`Open: ${providerGuides[1].url}`);
  if (await yesNo('Open Google AI Studio (API keys) in your browser?', true)) {
    await openUrl(providerGuides[1].url);
  }
  explain([providerGuides[1].purpose, ...providerGuides[1].how]);
  const GEMINI_API_KEY = await ask('Enter GEMINI_API_KEY: ', { required: true });
  selected.set('GEMINI_API_KEY', GEMINI_API_KEY);

  // Optional providers
  if (await yesNo('\nConfigure additional AI providers now?', true)) {
    for (const guide of providerGuides.slice(2)) {
      console.log(`\nProvider: ${guide.name}`);
      console.log(`Purpose: ${guide.purpose}`);
      if (await yesNo(`Configure ${guide.name}?`, false)) {
        console.log(`Open: ${guide.url}`);
        if (await yesNo('Open this URL in your browser?', true)) {
          await openUrl(guide.url);
        }
        explain(guide.how);
        for (const key of guide.keys) {
          const val = await ask(`Enter ${key} (or leave blank to skip): `);
          if (val) selected.set(key, val);
        }
      }
    }
  }

  return selected;
};

const collectFeatureFlags = async () => {
  section('Feature Flags');
  const flags = new Map();
  const ENABLE_ENHANCED_INTELLIGENCE = await yesNo('Enable Enhanced Intelligence (personalization, memory, MCP-backed)?', true);
  const ENABLE_AGENTIC_INTELLIGENCE = await yesNo('Enable Agentic Intelligence (agent tools/behaviors)?', true);
  const ENABLE_ANSWER_VERIFICATION = await yesNo('Enable Answer Verification (self-critique + cross-model)?', true);
  const CROSS_MODEL_VERIFICATION = ENABLE_ANSWER_VERIFICATION ? await yesNo('Enable Cross-Model Verification?', true) : false;
  const MAX_RERUNS = ENABLE_ANSWER_VERIFICATION ? await ask('Max reruns if low agreement? [1]: ') : '';
  const ENABLE_ANALYTICS_DASHBOARD = await yesNo('Enable Analytics Dashboard (port 3001)?', false);
  const ENABLE_HYBRID_RETRIEVAL = await yesNo('Enable Hybrid Retrieval (web+kb grounding)?', false);

  flags.set('ENABLE_ENHANCED_INTELLIGENCE', String(ENABLE_ENHANCED_INTELLIGENCE));
  flags.set('ENABLE_AGENTIC_INTELLIGENCE', String(ENABLE_AGENTIC_INTELLIGENCE));
  flags.set('ENABLE_ANSWER_VERIFICATION', String(ENABLE_ANSWER_VERIFICATION));
  if (ENABLE_ANSWER_VERIFICATION) {
    flags.set('CROSS_MODEL_VERIFICATION', String(CROSS_MODEL_VERIFICATION));
    if (MAX_RERUNS?.trim()) flags.set('MAX_RERUNS', MAX_RERUNS.trim());
  }
  flags.set('ENABLE_ANALYTICS_DASHBOARD', String(ENABLE_ANALYTICS_DASHBOARD));
  flags.set('ENABLE_HYBRID_RETRIEVAL', String(ENABLE_HYBRID_RETRIEVAL));

  return flags;
};

const collectDatabase = async () => {
  section('Database Configuration');
  console.log('Default: SQLite (persisted in Docker volume). Postgres is optional for vector store (pgvector).');
  const usePgvector = await yesNo('Enable pgvector features with Postgres?', false);
  const out = new Map();
  if (usePgvector) {
    out.set('FEATURE_PGVECTOR', 'true');
    out.set('POSTGRES_URL', 'postgresql://chatterbot:chatterbot@postgres:5432/chatterbot');
    out.set('POSTGRES_HOST', 'postgres');
    out.set('POSTGRES_PORT', '5432');
    out.set('POSTGRES_DB', 'chatterbot');
    out.set('POSTGRES_USER', 'chatterbot');
    out.set('POSTGRES_PASSWORD', 'chatterbot');
    out.set('POSTGRES_SSL', 'false');
    console.log('Postgres variables set for Docker Compose profile. Start with: docker compose --profile postgres up -d');
  } else {
    out.set('FEATURE_PGVECTOR', 'false');
  }
  return out;
};

const writeEnv = async (entries) => {
  const lines = [];
  lines.push('# Generated by scripts/setup-wizard.mjs');
  lines.push('# Minimal required configuration');
  lines.push(`DISCORD_TOKEN=${entries.get('DISCORD_TOKEN') || ''}`);
  lines.push(`DISCORD_CLIENT_ID=${entries.get('DISCORD_CLIENT_ID') || ''}`);
  lines.push(`GEMINI_API_KEY=${entries.get('GEMINI_API_KEY') || ''}`);
  lines.push('');
  lines.push('# Health & Analytics');
  lines.push('HEALTH_CHECK_PORT=3000');
  if (entries.get('ENABLE_ANALYTICS_DASHBOARD') !== undefined) {
    lines.push(`ENABLE_ANALYTICS_DASHBOARD=${entries.get('ENABLE_ANALYTICS_DASHBOARD')}`);
  } else {
    lines.push('ENABLE_ANALYTICS_DASHBOARD=false');
  }
  lines.push('ANALYTICS_DASHBOARD_PORT=3001');
  lines.push('');
  lines.push('# Database');
  lines.push('DATABASE_URL=file:./prisma/dev.db');
  if (entries.get('FEATURE_PGVECTOR') !== undefined) lines.push(`FEATURE_PGVECTOR=${entries.get('FEATURE_PGVECTOR')}`);
  for (const k of ['POSTGRES_URL','POSTGRES_HOST','POSTGRES_PORT','POSTGRES_DB','POSTGRES_USER','POSTGRES_PASSWORD','POSTGRES_SSL']) {
    if (entries.get(k)) lines.push(`${k}=${entries.get(k)}`);
  }
  lines.push('');
  lines.push('# Providers (optional)');
  const optionalKeys = [
    'OPENAI_API_KEY','OPENAI_MODEL',
    'ANTHROPIC_API_KEY','ANTHROPIC_MODEL',
    'GROQ_API_KEY','GROQ_MODEL',
    'MISTRAL_API_KEY','MISTRAL_MODEL',
    'OPENAI_COMPAT_API_KEY','OPENAI_COMPAT_BASE_URL','OPENAI_COMPAT_MODEL',
    'BRAVE_API_KEY','FIRECRAWL_API_KEY',
    'ELEVENLABS_API_KEY','ELEVENLABS_VOICE_ID',
    'TENOR_API_KEY',
    'COHERE_API_KEY'
  ];
  for (const k of optionalKeys) {
    if (entries.get(k)) lines.push(`${k}=${entries.get(k)}`);
  }
  lines.push('');
  lines.push('# Feature flags');
  for (const k of ['ENABLE_ENHANCED_INTELLIGENCE','ENABLE_AGENTIC_INTELLIGENCE','ENABLE_ANSWER_VERIFICATION','CROSS_MODEL_VERIFICATION','MAX_RERUNS','ENABLE_HYBRID_RETRIEVAL']) {
    if (entries.get(k) !== undefined) lines.push(`${k}=${entries.get(k)}`);
  }
  lines.push('');
  lines.push('# Default provider');
  lines.push('DEFAULT_PROVIDER=gemini');

  await fs.writeFile(envPath, lines.join(os.EOL), { encoding: 'utf8', mode: 0o600 });
};

const main = async () => {
  console.log('Chatterbot Setup Wizard');
  console.log('This will help you configure your .env and get API keys. Nothing is sent anywhere.');

  // Pre-flight: ensure examples exist
  try {
    const stat = await fs.stat(fullEnvExamplePath).catch(() => null);
    if (!stat) console.log('Note: env.example not found; proceeding with minimal prompts.');
  } catch {}

  // Collect
  const providers = await collectProviders();
  const flags = await collectFeatureFlags();
  const db = await collectDatabase();

  // Merge maps
  const merged = new Map([...providers, ...flags, ...db]);

  // Write .env
  await writeEnv(merged);

  section('Next Steps');
  explain([
    '1) Invite the bot using the generated URL above.',
    '2) Start with Docker Compose: docker compose up -d --build',
    '   - Health: http://localhost:3000/health',
    '   - Metrics: http://localhost:3000/metrics',
    '   - Analytics (optional): http://localhost:3001',
    '3) Talk to the bot using /chat in your server.',
  ]);

  console.log(`\nSaved environment to: ${envPath}`);
  rl.close();
};

main().catch((err) => {
  console.error('Setup wizard failed:', err);
  try { rl.close(); } catch {}
  process.exit(1);
});