import type { AdvancedMemoryManager } from './advanced-memory/advanced-memory-manager.service.js';

let memoryManagerInstance: AdvancedMemoryManager | undefined;

export function registerMemoryManager(mm: AdvancedMemoryManager) {
  memoryManagerInstance = mm;
}

export function getMemoryManager(): AdvancedMemoryManager | undefined {
  return memoryManagerInstance;
}