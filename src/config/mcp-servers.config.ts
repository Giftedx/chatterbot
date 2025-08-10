/**
 * MCP Servers Configuration
 * Defines connection configuration for all Model Context Protocol servers
 * Follows phased implementation approach from MCP integration plan
 */

export interface MCPServerConfig {
  command: string;
  args: string[];
  env: Record<string, string | undefined>;
  enabled: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  phase: 1 | 2 | 3 | 4 | 5;
  description: string;
  capabilities: string[];
}

/**
 * Phase 1: Foundational Intelligence (Critical Priority)
 * Essential servers for basic AI enhancement
 */
const phase1Servers: Record<string, MCPServerConfig> = {
  memory: {
    command: 'npx',
    args: ['@modelcontextprotocol/server-memory'],
    env: {
      MEMORY_STORAGE_PATH: './chatbot_memory',
    },
    enabled: true,
    priority: 'critical',
    phase: 1,
    description: 'Persistent memory and knowledge graph for conversation continuity',
    capabilities: ['memory_search', 'entity_storage', 'relationship_tracking']
  },
  
  discord: {
    command: 'npx',
    args: ['@modelcontextprotocol/server-discord'],
    env: {
      DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    },
    enabled: !!process.env.DISCORD_TOKEN,
    priority: 'critical',
    phase: 1,
    description: 'Advanced Discord API integration beyond standard Discord.js',
    capabilities: ['channel_management', 'advanced_messaging', 'user_interactions']
  }
};

/**
 * Phase 2: Enhanced Knowledge and Capabilities (High Priority)
 * External information access and file processing
 */
const phase2Servers: Record<string, MCPServerConfig> = {
  brave_search: {
    command: 'npx',
    args: ['@modelcontextprotocol/server-brave-search'],
    env: {
      BRAVE_API_KEY: process.env.BRAVE_API_KEY,
    },
    enabled: !!process.env.BRAVE_API_KEY,
    priority: 'high',
    phase: 2,
    description: 'Real-time web search with privacy-focused results',
    capabilities: ['web_search', 'news_search', 'real_time_info']
  },
  
  filesystem: {
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '/tmp/bot_workspace'],
    env: {
      ALLOWED_EXTENSIONS: 'txt,md,json,csv,png,jpg,pdf',
      MAX_FILE_SIZE: '10MB',
    },
    enabled: true,
    priority: 'high',
    phase: 2,
    description: 'Safe file system operations for document processing',
    capabilities: ['file_read', 'file_write', 'document_processing']
  },
  
  firecrawl: {
    command: 'npx',
    args: ['@modelcontextprotocol/server-firecrawl'],
    env: {
      FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    },
    enabled: !!process.env.FIRECRAWL_API_KEY,
    priority: 'high',
    phase: 2,
    description: 'Advanced web content extraction and processing',
    capabilities: ['content_extraction', 'web_scraping', 'page_analysis']
  }
};

/**
 * Phase 3: Specialized Data and Development Tools (Medium Priority)
 * Database integration and developer tooling
 */
const phase3Servers: Record<string, MCPServerConfig> = {
  postgres: {
    command: 'npx',
    args: ['@modelcontextprotocol/server-postgres'],
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      READ_ONLY: 'true',
    },
    enabled: !!process.env.DATABASE_URL,
    priority: 'medium',
    phase: 3,
    description: 'PostgreSQL database integration with read-only access',
    capabilities: ['database_query', 'schema_inspection', 'data_analysis']
  },
  
  sqlite: {
    command: 'npx',
    args: ['@modelcontextprotocol/server-sqlite'],
    env: {
      SQLITE_DB_PATH: './prisma/dev.db',
      READ_ONLY: 'true',
    },
    enabled: true,
    priority: 'medium',
    phase: 3,
    description: 'SQLite database access for local data operations',
    capabilities: ['local_database', 'data_query', 'analytics']
  },
  
  github: {
    command: 'npx',
    args: ['@modelcontextprotocol/server-github'],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
    },
    enabled: !!process.env.GITHUB_TOKEN,
    priority: 'medium',
    phase: 3,
    description: 'GitHub integration for repository management and code analysis',
    capabilities: ['repo_management', 'code_analysis', 'issue_tracking']
  }
};

/**
 * Phase 4: Advanced Processing Tools (Medium Priority)
 * Enhanced AI capabilities and automation
 */
const phase4Servers: Record<string, MCPServerConfig> = {
  sequential_thinking: {
    command: 'npx',
    args: ['@modelcontextprotocol/server-sequential-thinking'],
    env: {},
    enabled: true,
    priority: 'medium',
    phase: 4,
    description: 'Advanced reasoning and step-by-step problem solving',
    capabilities: ['logical_reasoning', 'problem_decomposition', 'step_analysis']
  },
  
  playwright: {
    command: 'npx',
    args: ['@modelcontextprotocol/server-playwright'],
    env: {
      PLAYWRIGHT_BROWSER: 'chromium',
      HEADLESS: 'true',
    },
    enabled: true,
    priority: 'medium',
    phase: 4,
    description: 'Browser automation for web interaction and testing',
    capabilities: ['browser_automation', 'web_testing', 'screenshot_capture']
  }
};

/**
 * Phase 5: Optional Enhancement Tools (Low Priority)
 * Specialized tools for advanced use cases
 */
const phase5Servers: Record<string, MCPServerConfig> = {
  code_execution: {
    command: 'npx',
    args: ['@modelcontextprotocol/server-code-execution'],
    env: {
      SANDBOX_MODE: 'true',
      ALLOWED_LANGUAGES: 'javascript,python,typescript',
    },
    enabled: false, // Disabled by default for security
    priority: 'low',
    phase: 5,
    description: 'Sandboxed code execution for data processing',
    capabilities: ['code_execution', 'data_processing', 'script_running']
  }
};

/**
 * Complete MCP servers configuration
 * Combines all phases into single configuration object
 */
export const mcpServersConfig: Record<string, MCPServerConfig> = {
  ...phase1Servers,
  ...phase2Servers,
  ...phase3Servers,
  ...phase4Servers,
  ...phase5Servers
};

/**
 * Get servers by phase for incremental deployment
 */
export function getServersByPhase(phase: number): Record<string, MCPServerConfig> {
  return Object.fromEntries(
    Object.entries(mcpServersConfig).filter(([, config]) => config.phase <= phase)
  );
}

/**
 * Get enabled servers only
 */
export function getEnabledServers(): Record<string, MCPServerConfig> {
  return Object.fromEntries(
    Object.entries(mcpServersConfig).filter(([, config]) => config.enabled)
  );
}

/**
 * Get servers by priority
 */
export function getServersByPriority(priority: MCPServerConfig['priority']): Record<string, MCPServerConfig> {
  return Object.fromEntries(
    Object.entries(mcpServersConfig).filter(([, config]) => config.priority === priority)
  );
}

/**
 * Validate server configuration
 */
export function validateServerConfig(serverName: string, config: MCPServerConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  // Check if required environment variables are available
  for (const [key, value] of Object.entries(config.env)) {
    if (key.endsWith('_KEY') || key.endsWith('_TOKEN')) {
      if (!value) {
        errors.push(`Missing required environment variable for ${serverName}: ${key}`);
      }
    }
  }
  return { isValid: errors.length === 0, errors };
}
