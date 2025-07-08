import plotly.graph_objects as go

# Data for the chart with RPD values in model names as requested
models = ["Gemini 2.5 Flash-Lite (1000 RPD)", "Gemini 2.5 Flash (250 RPD)", "Gemini 2.0 Flash (200 RPD)", "Gemini 2.0 Flash-Lite (200 RPD)"]
rpd_values = [1000, 250, 200, 200]

# Create horizontal bar chart
fig = go.Figure()

# Add horizontal bars with blue color scheme
fig.add_trace(go.Bar(
    y=models,
    x=rpd_values,
    orientation='h',
    marker_color=['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'],  # Different shades of blue
    text=[f'{rpd}' for rpd in rpd_values],  # Value labels on bars
    textposition='inside',
    textfont=dict(color='white', size=14)
))

# Update layout with proper title and subtitle
fig.update_layout(
    title="Best Free Gemini Models for Chatbots",
    xaxis_title="Requests/Day",
    yaxis_title="Gemini Model",
    showlegend=False,
    annotations=[
        dict(
            text="Free tier daily limits",
            xref="paper", yref="paper",
            x=0.5, y=1.02,
            xanchor='center', yanchor='bottom',
            showarrow=False,
            font=dict(size=12, color='gray')
        )
    ]
)

# Save the chart
fig.write_image("gemini_models_chart.png")