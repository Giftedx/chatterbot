import * as fs from 'fs';
import { jest } from '@jest/globals';

// Mock fs to avoid actual disk I/O
afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

jest.mock('fs');

import {
  listPersonas,
  createOrUpdatePersona,
  setActivePersona,
  getActivePersona,
} from '../persona-manager';

const mockedFs = fs as jest.Mocked<typeof fs>;

beforeEach(() => {
  mockedFs.existsSync.mockReturnValue(false);
  mockedFs.writeFileSync.mockImplementation(() => undefined);
  mockedFs.mkdirSync.mockImplementation(() => undefined);
});

describe('persona-manager', () => {
  it('adds and lists personas', () => {
    createOrUpdatePersona('tester', 'You are a tester persona');
    const names = listPersonas().map(p => p.name);
    expect(names).toContain('tester');
  });

  it('sets and retrieves active persona per guild', () => {
    createOrUpdatePersona('guildPersona', 'Guild specific prompt');
    setActivePersona('guild-123', 'guildPersona');
    const p = getActivePersona('guild-123');
    expect(p.name).toBe('guildPersona');
    expect(p.systemPrompt).toBe('Guild specific prompt');
  });
});
