import pandas as pd
import plotly.express as px

# Data for MCP servers
data = [
    {
        "Server Name": "Discord MCP Server",
        "Category": "Discord Integration",
        "Key Features": "Send messages, read history, manage channels, user management, reactions",
        "Best Use Cases": "Direct Discord bot control, server management, automated responses",
        "Installation Complexity": "Medium",
        "GitHub Stars": "150+"
    },
    {
        "Server Name": "Web Search (Brave)",
        "Category": "Web Search",
        "Key Features": "Privacy-focused search, real-time results, web scraping",
        "Best Use Cases": "Information retrieval, fact-checking, research queries",
        "Installation Complexity": "Easy",
        "GitHub Stars": "200+"
    },
    {
        "Server Name": "GitHub MCP Server",
        "Category": "Development Tools",
        "Key Features": "Repository management, code search, issue tracking, PRs",
        "Best Use Cases": "Code assistance, project management, developer workflows",
        "Installation Complexity": "Easy",
        "GitHub Stars": "500+"
    },
    {
        "Server Name": "Memory/Knowledge Graph",
        "Category": "Memory & Knowledge",
        "Key Features": "Persistent memory, context retention, knowledge graphs",
        "Best Use Cases": "Long-term conversations, user preferences, project continuity",
        "Installation Complexity": "Medium",
        "GitHub Stars": "300+"
    },
    {
        "Server Name": "PostgreSQL MCP",
        "Category": "Database",
        "Key Features": "Database queries, schema inspection, data analysis",
        "Best Use Cases": "Data-driven responses, analytics, user data management",
        "Installation Complexity": "Medium",
        "GitHub Stars": "180+"
    },
    {
        "Server Name": "File System MCP",
        "Category": "File Operations",
        "Key Features": "File read/write, directory management, secure access",
        "Best Use Cases": "Document processing, file management, content generation",
        "Installation Complexity": "Easy",
        "GitHub Stars": "250+"
    },
    {
        "Server Name": "Notion MCP",
        "Category": "Productivity",
        "Key Features": "Database management, page creation, content organization",
        "Best Use Cases": "Knowledge management, documentation, project tracking",
        "Installation Complexity": "Medium",
        "GitHub Stars": "220+"
    },
    {
        "Server Name": "Slack MCP",
        "Category": "Communication",
        "Key Features": "Message sending, channel management, workspace integration",
        "Best Use Cases": "Team communication, notifications, workflow automation",
        "Installation Complexity": "Medium",
        "GitHub Stars": "190+"
    },
    {
        "Server Name": "OpenAI Tools MCP",
        "Category": "AI Tools",
        "Key Features": "Image generation, text processing, AI model access",
        "Best Use Cases": "Content creation, AI-powered responses, multimedia generation",
        "Installation Complexity": "Easy",
        "GitHub Stars": "400+"
    },
    {
        "Server Name": "Perplexity MCP",
        "Category": "AI Search",
        "Key Features": "Real-time web search, AI-powered research, citations",
        "Best Use Cases": "Research assistance, fact-checking, current events",
        "Installation Complexity": "Easy",
        "GitHub Stars": "160+"
    },
    {
        "Server Name": "Weather MCP",
        "Category": "Data Services",
        "Key Features": "Current weather, forecasts, location-based data",
        "Best Use Cases": "Weather queries, location services, environmental data",
        "Installation Complexity": "Easy",
        "GitHub Stars": "120+"
    },
    {
        "Server Name": "Google Calendar MCP",
        "Category": "Productivity",
        "Key Features": "Event management, scheduling, calendar integration",
        "Best Use Cases": "Meeting scheduling, reminders, calendar queries",
        "Installation Complexity": "Medium",
        "GitHub Stars": "140+"
    },
    {
        "Server Name": "Redis MCP",
        "Category": "Database",
        "Key Features": "Key-value storage, caching, real-time data",
        "Best Use Cases": "Session management, caching, real-time features",
        "Installation Complexity": "Medium",
        "GitHub Stars": "110+"
    },
    {
        "Server Name": "Docker MCP",
        "Category": "DevOps",
        "Key Features": "Container management, deployment, scaling",
        "Best Use Cases": "DevOps automation, container orchestration, deployment",
        "Installation Complexity": "Hard",
        "GitHub Stars": "180+"
    },
    {
        "Server Name": "Stripe MCP",
        "Category": "Finance",
        "Key Features": "Payment processing, subscription management, billing",
        "Best Use Cases": "E-commerce, payment queries, subscription management",
        "Installation Complexity": "Medium",
        "GitHub Stars": "200+"
    }
]

# Create DataFrame
df = pd.DataFrame(data)

# Convert GitHub Stars to numeric values
df['Stars_Numeric'] = df['GitHub Stars'].str.replace('+', '').astype(int)

# Create abbreviated server names (15 char limit)
df['Server_Short'] = df['Server Name'].str.replace('MCP Server', '').str.replace('MCP', '').str.strip()
df['Server_Short'] = df['Server_Short'].apply(lambda x: x[:15] if len(x) > 15 else x)

# Create abbreviated features and use cases (15 char limit)
df['Features_Short'] = df['Key Features'].apply(lambda x: x[:50] + '...' if len(x) > 50 else x)
df['Use_Cases_Short'] = df['Best Use Cases'].apply(lambda x: x[:50] + '...' if len(x) > 50 else x)

# Map complexity to numeric for ordering
complexity_map = {'Easy': 1, 'Medium': 2, 'Hard': 3}
df['Complexity_Numeric'] = df['Installation Complexity'].map(complexity_map)

# Create scatter plot
fig = px.scatter(
    df,
    x='Complexity_Numeric',
    y='Stars_Numeric',
    color='Category',
    size='Stars_Numeric',
    title='MCP Server Comparison Chart',
    labels={'Complexity_Numeric': 'Install Complex', 'Stars_Numeric': 'GitHub Stars'},
    color_discrete_sequence=['#1FB8CD', '#FFC185', '#ECEBD5', '#5D878F', '#D2BA4C', '#B4413C', '#964325', '#944454', '#13343B', '#DB4545'],
    hover_data={
        'Server_Short': True,
        'Installation Complexity': True,
        'Features_Short': True,
        'Use_Cases_Short': True,
        'Complexity_Numeric': False,
        'Stars_Numeric': False,
        'Category': False
    }
)

# Update x-axis to show complexity labels
fig.update_xaxes(
    tickmode='array',
    tickvals=[1, 2, 3],
    ticktext=['Easy', 'Medium', 'Hard'],
    title='Install Complex'
)

# Update y-axis title
fig.update_yaxes(title='GitHub Stars')

# Update layout - legend centered below title (more than 5 items, so default positioning)
fig.update_layout(
    showlegend=True
)

# Add comprehensive hover template
fig.update_traces(
    hovertemplate='<b>%{customdata[0]}</b><br>' +
                  'Stars: %{y}<br>' +
                  'Install: %{customdata[1]}<br>' +
                  'Features: %{customdata[2]}<br>' +
                  'Use Cases: %{customdata[3]}<br>' +
                  'Category: %{fullData.name}<br>' +
                  '<extra></extra>'
)

# Save the chart
fig.write_image('mcp_servers_comparison.png')