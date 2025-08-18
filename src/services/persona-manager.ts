import { personaRegistry, type Persona } from '../personas/index.js';
import { prisma } from '../db/prisma.js';
import { isLocalDBDisabled } from '../utils/env.js';

async function loadPersistedPersonas(): Promise<void> {
  try {
    if (!prisma || process.env.NODE_ENV === 'test') {
      return;
    }
    const dbPersonas = await prisma.persona.findMany();
    dbPersonas.forEach((p: { name: string; systemPrompt: string; styleHints?: string }) =>
      personaRegistry.upsert({
        name: p.name,
        systemPrompt: p.systemPrompt,
        styleHints: p.styleHints ? JSON.parse(p.styleHints) : undefined,
      }),
    );
  } catch (err) {
    console.error('Failed to load personas from DB', err);
  }
}

async function savePersonas() {
  try {
    // In local DB-less mode, keep personas in-memory only
    if (isLocalDBDisabled()) return;
    const list = personaRegistry.list();
    // Upsert each persona into DB
    for (const p of list) {
      await prisma.persona.upsert({
        where: { name: p.name },
        update: {
          systemPrompt: p.systemPrompt,
          styleHints: p.styleHints ? JSON.stringify(p.styleHints) : null,
        },
        create: {
          name: p.name,
          systemPrompt: p.systemPrompt,
          styleHints: p.styleHints ? JSON.stringify(p.styleHints) : null,
        },
      });
    }
  } catch (err) {
    console.error('Failed to save personas to DB', err);
  }
}

// In-memory mapping of guildId -> active persona name
const activePersona: Map<string, string> = new Map();

const DEFAULT_PERSONA = 'friendly';

export function setActivePersona(guildId: string, name: string): void {
  const persona = personaRegistry.get(name);
  if (!persona) {
    throw new Error(`Persona '${name}' not found`);
  }
  activePersona.set(guildId, persona.name);
}

export function getActivePersona(guildId: string): Persona {
  const name = activePersona.get(guildId) || DEFAULT_PERSONA;
  return personaRegistry.get(name) || personaRegistry.list()[0];
}

export function listPersonas(): Persona[] {
  return personaRegistry.list();
}

export async function createOrUpdatePersona(
  name: string,
  systemPrompt: string,
  styleHints?: string[],
): Promise<void> {
  personaRegistry.upsert({ name, systemPrompt, styleHints });
  // Skip persistence in local DB-less mode; otherwise persist
  if (!isLocalDBDisabled()) {
    await savePersonas();
  }
}

// Load persisted personas on startup
// Initialize on module load (non-test only)
if (process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  loadPersistedPersonas();
}
