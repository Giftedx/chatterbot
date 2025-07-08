/**
 * Personality Engine – PersonaRegistry
 * ------------------------------------
 * Allows the bot to store and retrieve persona definitions.
 * For Phase-3 MVP we keep this in-memory with optional JSON persistence.
 */

export interface Persona {
  name: string;
  systemPrompt: string;
  styleHints?: string[];
}

/** Built-in default personas shipped with the bot. */
export const BUILTIN_PERSONAS: Persona[] = [
  {
    name: 'friendly',
    systemPrompt: 'You are a friendly, helpful assistant who uses casual language and emojis when appropriate.',
  },
  {
    name: 'mentor',
    systemPrompt: 'You are a knowledgeable mentor who explains concepts patiently and thoroughly.',
  },
  {
    name: 'sarcastic',
    systemPrompt: 'You respond with witty sarcasm while still being ultimately helpful.',
  },
];

class PersonaRegistry {
  private personas: Map<string, Persona> = new Map();

  constructor() {
    // load built-ins
    for (const p of BUILTIN_PERSONAS) {
      this.personas.set(p.name, p);
    }
  }

  /** Return persona or undefined */
  get(name: string): Persona | undefined {
    return this.personas.get(name);
  }

  /** List all persona names */
  list(): Persona[] {
    return Array.from(this.personas.values());
  }

  /** Add/overwrite a persona definition */
  upsert(persona: Persona) {
    this.personas.set(persona.name, persona);
  }
}

export const personaRegistry = new PersonaRegistry();
