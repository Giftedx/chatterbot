import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np

# Data for the Discord AI bot user groups
data = [
    {
        "user_group": "Gaming Communities",
        "demographics": "Ages 16-34, 50-5000 members",
        "priority_features": ["Real-time responses", "Tournament management", "XP/Leaderboards", "Voice integration", "Clan systems"],
        "interaction_style": "Fast-paced, competitive, casual language",
        "ai_capabilities": ["Game stats analysis", "Strategy suggestions", "Event scheduling", "Automated moderation"]
    },
    {
        "user_group": "Educational Groups", 
        "demographics": "Ages 16-25, 20-500 members",
        "priority_features": ["Study session management", "Quiz systems", "Progress tracking", "Resource sharing", "Collaboration tools"],
        "interaction_style": "Structured, formal, supportive",
        "ai_capabilities": ["Homework help", "Study planning", "Academic research", "Learning analytics"]
    },
    {
        "user_group": "Content Creators",
        "demographics": "Ages 18-35, 100-10000 members", 
        "priority_features": ["Engagement tracking", "Content promotion", "Analytics", "Community building", "Feedback systems"],
        "interaction_style": "Brand-focused, engaging, promotional",
        "ai_capabilities": ["Content optimization", "Audience insights", "Growth strategies", "Creative assistance"]
    },
    {
        "user_group": "Professional Communities",
        "demographics": "Ages 25-45, 50-1000 members",
        "priority_features": ["Professional communication", "Compliance tools", "Productivity features", "Integration", "Security"],
        "interaction_style": "Formal, business-focused, efficient", 
        "ai_capabilities": ["Meeting summaries", "Task management", "Knowledge base", "Professional networking"]
    }
]

# Process data for visualization
chart_data = []
colors = ['#1FB8CD', '#FFC185', '#ECEBD5', '#5D878F']

for i, group in enumerate(data):
    # Extract metrics
    priority_features_count = len(group['priority_features'])
    ai_capabilities_count = len(group['ai_capabilities'])
    
    # Parse age range and get median
    age_range = group['demographics'].split(',')[0].replace('Ages ', '')
    age_start, age_end = map(int, age_range.split('-'))
    median_age = (age_start + age_end) / 2
    
    # Parse member size and categorize (using log scale)
    member_info = group['demographics'].split(',')[1].strip()
    member_range = member_info.split(' ')[0]
    member_start, member_end = map(int, member_range.split('-'))
    member_size_scaled = np.log10((member_start + member_end) / 2)
    
    # Create abbreviated group names
    group_short = group['user_group'].replace('Communities', '').replace('Educational', 'Edu').replace('Professional', 'Prof').strip()
    if len(group_short) > 15:
        group_short = group_short[:15]
    
    # Create comprehensive hover text
    hover_text = f"""<b>{group['user_group']}</b><br>
<b>Demographics:</b> {group['demographics']}<br>
<b>Interaction:</b> {group['interaction_style']}<br>
<b>Priority Features:</b><br>• {('<br>• '.join(group['priority_features'])[:100])}...<br>
<b>AI Capabilities:</b><br>• {('<br>• '.join(group['ai_capabilities'])[:100])}..."""
    
    chart_data.append({
        'group': group_short,
        'full_group': group['user_group'],
        'priority_features': priority_features_count,
        'ai_capabilities': ai_capabilities_count,
        'median_age': median_age,
        'member_size_scaled': member_size_scaled,
        'hover_text': hover_text,
        'color': colors[i]
    })

# Create DataFrame
df = pd.DataFrame(chart_data)

# Create grouped bar chart
fig = go.Figure()

# Add bars for each metric
metrics = [
    ('priority_features', 'Priority Features', '#1FB8CD'),
    ('ai_capabilities', 'AI Capabilities', '#FFC185'),
    ('median_age', 'Median Age/10', '#ECEBD5'),
    ('member_size_scaled', 'Member Size (log)', '#5D878F')
]

for i, (metric, label, color) in enumerate(metrics):
    fig.add_trace(go.Bar(
        name=label,
        x=df['group'],
        y=df[metric] if metric != 'median_age' else df[metric]/10,  # Scale median age for visibility
        marker_color=color,
        hovertemplate=f'<b>%{{x}}</b><br>{label}: %{{y}}<extra></extra>'
    ))

# Update layout
fig.update_layout(
    title="Discord AI Bot User Groups",
    xaxis_title="User Groups",
    yaxis_title="Scaled Values",
    barmode='group',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Save the chart
fig.write_image("discord_user_groups.png")