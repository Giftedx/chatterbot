import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np

# Data for the comparison chart - keeping within 15 char limit but improving clarity
user_groups = ["Gaming Comm", "Educational", "Content Create", "Professional"]
categories = ["Demographics", "Priority Feat", "Interaction", "AI Capabilities", "Engagement"]

# Improved data with better representation within character limits
data_matrix = [
    ["16-34, 50-5k", "16-25, 20-500", "18-35, 100-10k", "25-45, 50-1k"],
    ["Real-time<br>XP/Leaderboard<br>Tournament", "Study tools<br>Quiz systems<br>Progress track", "Engage track<br>Content promo<br>Analytics", "Prof comm<br>Compliance<br>Productivity"],
    ["Fast, compet<br>casual", "Structured<br>supportive<br>formal", "Brand-focused<br>engaging<br>promotional", "Formal<br>business<br>efficient"],
    ["Game analysis<br>Strategy tips<br>Event auto", "Homework help<br>Study plan<br>Learn analytic", "Content optim<br>Audience insight<br>Growth strat", "Meeting summ<br>Task mgmt<br>Knowledge base"],
    ["Eve/weekends<br>voice-heavy", "Academic cal<br>text-focused", "Content rel<br>multi-modal", "Business hrs<br>structured"]
]

# Create a table with improved colors and formatting
fig = go.Figure(data=[go.Table(
    header=dict(
        values=["Category"] + user_groups,
        fill_color='#1FB8CD',
        align='center',
        font=dict(size=13, color='white'),
        height=50
    ),
    cells=dict(
        values=[categories] + [[row[i] for row in data_matrix] for i in range(len(user_groups))],
        fill_color=[['#F8F9FA']*len(categories)] + [['#E8F4FD']*len(categories), ['#FFF2E8']*len(categories), ['#F0F8E8']*len(categories), ['#F0F4F8']*len(categories)],
        align='left',
        font=dict(size=11, color='black'),
        height=80,
        line=dict(color='#E0E0E0', width=1)
    )
)])

# Update layout with better styling
fig.update_layout(
    title="Discord AI Bot User Groups Comparison",
    font=dict(size=12),
    plot_bgcolor='white',
    paper_bgcolor='white'
)

# Save the chart
fig.write_image("discord_comparison_chart.png")