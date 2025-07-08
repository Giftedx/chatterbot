import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import numpy as np

# Create the data
data = [
    {"Model": "Gemini 2.5 Flash", "RPM": 10, "TPM": 250000, "RPD": 250, "Status": "Current"},
    {"Model": "Gemini 2.5 Flash-Lite", "RPM": 15, "TPM": 250000, "RPD": 1000, "Status": "Current"},
    {"Model": "Gemini 2.0 Flash", "RPM": 15, "TPM": 1000000, "RPD": 200, "Status": "Current"},
    {"Model": "Gemini 2.0 Flash-Lite", "RPM": 30, "TPM": 1000000, "RPD": 200, "Status": "Current"},
    {"Model": "Gemini 1.5 Flash", "RPM": 15, "TPM": 250000, "RPD": 50, "Status": "Deprecated"},
    {"Model": "Gemini 1.5 Flash-8B", "RPM": 15, "TPM": 250000, "RPD": 50, "Status": "Deprecated"},
    {"Model": "Gemma 3 & 3n", "RPM": 30, "TPM": 15000, "RPD": 14400, "Status": "Limited"}
]

df = pd.DataFrame(data)

# Define colors based on status - Current (green/blue), Deprecated (orange/red), Limited (yellow)
color_map = {
    'Current': '#1FB8CD',     # Strong cyan (blue)
    'Deprecated': '#B4413C',  # Moderate red (orange/red)
    'Limited': '#D2BA4C'      # Moderate yellow
}

# Create horizontal bar chart for TPM with logarithmic scale
fig = go.Figure()

for status in ['Current', 'Deprecated', 'Limited']:
    status_data = df[df['Status'] == status]
    if not status_data.empty:
        fig.add_trace(go.Bar(
            y=status_data['Model'],
            x=status_data['TPM'],
            name=status,
            orientation='h',
            marker_color=color_map[status],
            hovertemplate='<b>%{y}</b><br>TPM: %{x:,.0f}<extra></extra>',
            cliponaxis=False
        ))

# Update layout
fig.update_layout(
    title='Gemini API Free Tier TPM Limits',
    xaxis_title='TPM (Log Scale)',
    yaxis_title='Model',
    xaxis_type='log',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    showlegend=True
)

# Format x-axis ticks for log scale
fig.update_xaxes(
    tickformat='.0s'
)

# Save the chart
fig.write_image('gemini_tpm_limits.png')