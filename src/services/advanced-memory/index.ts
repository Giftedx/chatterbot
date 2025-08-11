/**
 * Advanced Memory & Social Intelligence Module - Entry Point
 * 
 * This module exports all advanced memory and social intelligence capabilities:
 * - Episodic Memory System with semantic clustering
 * - Social Intelligence and relationship modeling
 * - Emotional intelligence integration
 * - Cross-conversation learning and pattern recognition
 */

export * from './episodic-memory.service.js';
export * from './social-intelligence.service.js';
export * from './types.js';

// Advanced Memory Manager as default export
export { AdvancedMemoryManager as default } from './advanced-memory-manager.service.js';