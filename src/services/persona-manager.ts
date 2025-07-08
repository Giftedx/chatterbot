import { personaRegistry, Persona } from '../personas';
import { prisma } from '../db/prisma';

async function loadPersistedPersonas() {
    try {
    const dbPersonas = await prisma.persona.findMany();
    dbPersonas.forEach(p => personaRegistry.upsert({ name: p.name, systemPrompt: p.systemPrompt, styleHints: p.styleHints ? JSON.parse(p.styleHints) : undefined }));
  } catch (err) {
    console.error('Failed to load personas from DB', err);
  }
}

async function savePersonas() {
  try {
    const list = personaRegistry.list();
    // Upsert each persona into DB
    for (const p of list) {
      await prisma.persona.upsert({
        where: { name: p.name },
        update: { systemPrompt: p.systemPrompt, styleHints: p.styleHints ? JSON.stringify(p.styleHints) : null },
        create: { name: p.name, systemPrompt: p.systemPrompt, styleHints: p.styleHints ? JSON.stringify(p.styleHints) : null },
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
  const persona = personaRegistry.get(name);
  // fallback should always exist because DEFAULT_PERSONA is built-in
  return persona!;
}

export function listPersonas(): Persona[] {
  return personaRegistry.list();
}

export async function createOrUpdatePersona(name: string, systemPrompt: string, styleHints?: string[]): Promise<void> {
  personaRegistry.upsert({ name, systemPrompt, styleHints });
  await savePersonas();
}

// Load persisted personas on startup
loadPersistedPersonas();
