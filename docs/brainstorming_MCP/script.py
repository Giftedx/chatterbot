import pandas as pd
import json

# Create a comprehensive MCP server dataset for the chatbot integration guide
mcp_servers_data = {
    "Essential MCP Servers": [
        {
            "Server Name": "Discord MCP Server",
            "Category": "Communication",
            "Priority": "Critical",
            "Key Features": "Send/read messages, channel management, user roles, reactions, server info",
            "Installation": "npm i @modelcontextprotocol/server-discord",
            "Configuration": "Discord Bot Token required",
            "Use Cases": "Direct Discord bot control, automated moderation, server management"
        },
        {
            "Server Name": "Memory MCP Server", 
            "Category": "Intelligence",
            "Priority": "Critical",
            "Key Features": "Persistent memory, conversation context, user preferences, knowledge graphs",
            "Installation": "npx @modelcontextprotocol/server-memory",
            "Configuration": "Local storage or database connection",
            "Use Cases": "Remember user preferences, maintain conversation context, long-term learning"
        },
        {
            "Server Name": "Web Search MCP (Brave)",
            "Category": "Information",
            "Priority": "High",
            "Key Features": "Real-time web search, privacy-focused, current information retrieval",
            "Installation": "npx @modelcontextprotocol/server-brave-search",
            "Configuration": "Brave Search API key",
            "Use Cases": "Answer current questions, fact-checking, research assistance"
        },
        {
            "Server Name": "GitHub MCP Server",
            "Category": "Development",
            "Priority": "High",
            "Key Features": "Repository access, code search, issue management, PR handling",
            "Installation": "npx @modelcontextprotocol/server-github",
            "Configuration": "GitHub Personal Access Token",
            "Use Cases": "Code assistance, project management, developer workflow automation"
        },
        {
            "Server Name": "File System MCP",
            "Category": "Data",
            "Priority": "High", 
            "Key Features": "Read/write files, directory management, secure file operations",
            "Installation": "npx @modelcontextprotocol/server-filesystem",
            "Configuration": "Path restrictions for security",
            "Use Cases": "Document processing, file management, content generation"
        }
    ],
    "Database MCP Servers": [
        {
            "Server Name": "PostgreSQL MCP",
            "Category": "Database",
            "Priority": "Medium",
            "Key Features": "SQL queries, schema inspection, data analysis, read-only access",
            "Installation": "npx @modelcontextprotocol/server-postgres",
            "Configuration": "Database connection string",
            "Use Cases": "Data-driven responses, analytics, user data queries"
        },
        {
            "Server Name": "SQLite MCP",
            "Category": "Database", 
            "Priority": "Medium",
            "Key Features": "Local database, lightweight, embedded storage",
            "Installation": "npx @modelcontextprotocol/server-sqlite",
            "Configuration": "Database file path",
            "Use Cases": "Local data storage, user settings, bot configuration"
        },
        {
            "Server Name": "Redis MCP",
            "Category": "Database",
            "Priority": "Medium",
            "Key Features": "Key-value storage, caching, session management",
            "Installation": "Custom implementation needed",
            "Configuration": "Redis connection details",
            "Use Cases": "Session management, caching, real-time features"
        }
    ],
    "Productivity MCP Servers": [
        {
            "Server Name": "Notion MCP",
            "Category": "Productivity",
            "Priority": "Medium",
            "Key Features": "Database management, page creation, content organization",
            "Installation": "Community server available",
            "Configuration": "Notion API integration token",
            "Use Cases": "Knowledge management, documentation, project tracking"
        },
        {
            "Server Name": "Google Calendar MCP",
            "Category": "Productivity",
            "Priority": "Low",
            "Key Features": "Event management, scheduling, calendar integration",
            "Installation": "Community server available",
            "Configuration": "Google API credentials",
            "Use Cases": "Meeting scheduling, reminders, calendar queries"
        },
        {
            "Server Name": "Slack MCP",
            "Category": "Communication",
            "Priority": "Low",
            "Key Features": "Cross-platform messaging, workspace integration",
            "Installation": "Community server available", 
            "Configuration": "Slack bot token",
            "Use Cases": "Multi-platform communication, team notifications"
        }
    ],
    "AI Enhancement MCP Servers": [
        {
            "Server Name": "Perplexity MCP",
            "Category": "AI Search",
            "Priority": "High",
            "Key Features": "AI-powered research, real-time search, citations",
            "Installation": "Official server available",
            "Configuration": "Perplexity API key",
            "Use Cases": "Research assistance, fact-checking, current events"
        },
        {
            "Server Name": "OpenAI Tools MCP",
            "Category": "AI Tools",
            "Priority": "Medium",
            "Key Features": "Image generation, text processing, multimodal AI",
            "Installation": "Community implementations",
            "Configuration": "OpenAI API key",
            "Use Cases": "Content creation, image generation, AI-powered responses"
        },
        {
            "Server Name": "Hugging Face MCP",
            "Category": "AI Tools",
            "Priority": "Medium",
            "Key Features": "Model access, dataset interaction, AI pipeline integration",
            "Installation": "Official server available",
            "Configuration": "HF API token",
            "Use Cases": "Advanced AI capabilities, model experimentation"
        }
    ]
}

# Convert to DataFrame for better display
all_servers = []
for category, servers in mcp_servers_data.items():
    for server in servers:
        server['Section'] = category
        all_servers.append(server)

df = pd.DataFrame(all_servers)

# Save as CSV for the user
df.to_csv('mcp_servers_integration_guide.csv', index=False)

print("MCP Servers Integration Guide for Discord Chatbot")
print("=" * 55)
print(f"\nTotal servers analyzed: {len(df)}")
print(f"Critical priority servers: {len(df[df['Priority'] == 'Critical'])}")
print(f"High priority servers: {len(df[df['Priority'] == 'High'])}")
print(f"Medium priority servers: {len(df[df['Priority'] == 'Medium'])}")
print(f"Low priority servers: {len(df[df['Priority'] == 'Low'])}")

# Display summary by category
print(f"\nServers by category:")
category_counts = df['Category'].value_counts()
for category, count in category_counts.items():
    print(f"  {category}: {count} servers")

print(f"\nFile 'mcp_servers_integration_guide.csv' created with detailed server information.")
print(f"This file contains comprehensive details for all {len(df)} recommended MCP servers.")