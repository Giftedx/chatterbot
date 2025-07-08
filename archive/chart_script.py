import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import numpy as np

# Create DataFrame from the provided data
data = [
    {"Model": "Gemini 2.5 Flash", "RPM": 10, "TPM": 250000, "RPD": 250, "Status": "Current", "Available_Free": "Yes"},
    {"Model": "Gemini 2.5 Flash-Lite", "RPM": 15, "TPM": 250000, "RPD": 1000, "Status": "Current", "Available_Free": "Yes"},
    {"Model": "Gemini 2.0 Flash", "RPM": 15, "TPM": 1000000, "RPD": 200, "Status": "Current", "Available_Free": "Yes"},
    {"Model": "Gemini 2.0 Flash-Lite", "RPM": 30, "TPM": 1000000, "RPD": 200, "Status": "Current", "Available_Free": "Yes"},
    {"Model": "Gemini 1.5 Flash", "RPM": 15, "TPM": 250000, "RPD": 50, "Status": "Deprecated", "Available_Free": "Yes"},
    {"Model": "Gemini 1.5 Flash-8B", "RPM": 15, "TPM": 250000, "RPD": 50, "Status": "Deprecated", "Available_Free": "Yes"},
    {"Model": "Gemma 3 & 3n", "RPM": 30, "TPM": 15000, "RPD": 14400, "Status": "Current", "Available_Free": "Limited"}
]

df = pd.DataFrame(data)

# Shorten model names to fit 15 character limit
df['Short_Model'] = df['Model'].str.replace('Gemini ', 'G').str.replace('Gemma ', 'Ga').str.replace('Flash', 'F').str.replace('-Lite', 'L').str.replace(' & 3n', '')

# Sort by RPM for better visualization
df = df.sort_values('RPM', ascending=True)

# Colors for current vs deprecated
colors = []
for status in df['Status']:
    if status == 'Current':
        colors.append('#1FB8CD')  # Strong cyan for current
    else:
        colors.append('#B4413C')  # Moderate red for deprecated

# Create horizontal bar chart
fig = go.Figure()

# Add bars with different colors based on status
fig.add_trace(go.Bar(
    y=df['Short_Model'],
    x=df['RPM'],
    orientation='h',
    marker_color=colors,
    text=df['RPM'],
    textposition='outside',
    hovertemplate='<b>%{y}</b><br>RPM: %{x}<br>TPM: %{customdata[0]:,.0f}<br>RPD: %{customdata[1]:,.0f}<br>Status: %{customdata[2]}<extra></extra>',
    customdata=list(zip(df['TPM'], df['RPD'], df['Status'])),
    showlegend=False
))

# Create legend manually
fig.add_trace(go.Scatter(
    x=[None], y=[None],
    mode='markers',
    marker=dict(size=10, color='#1FB8CD'),
    showlegend=True,
    name='Current'
))

fig.add_trace(go.Scatter(
    x=[None], y=[None],
    mode='markers',
    marker=dict(size=10, color='#B4413C'),
    showlegend=True,
    name='Deprecated'
))

# Update layout
fig.update_layout(
    title='Gemini API Rate Limits (RPM)',
    xaxis_title='Req/Min',
    yaxis_title='Models',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5)
)

# Save the chart
fig.write_image("gemini_api_comparison.png")