import plotly.graph_objects as go
import plotly.express as px
import json

# Data from the provided JSON
data = {
    "capabilities": {
        "Text Processing": {
            "Context Awareness": 9,
            "Conversation Threading": 8,
            "Multi-language Support": 9,
            "Intent Recognition": 8,
            "Semantic Understanding": 9
        },
        "Image Analysis": {
            "Object Detection": 9,
            "Visual Q&A": 10,
            "Content Moderation": 8,
            "Art Analysis": 7,
            "OCR Text Extraction": 9,
            "Image Segmentation": 8
        },
        "Audio Processing": {
            "Speech Transcription": 9,
            "Voice Commands": 8,
            "Real-time Interaction": 10,
            "Emotion Detection": 7,
            "Multi-language Audio": 8
        },
        "Video Understanding": {
            "Scene Analysis": 9,
            "Timestamp Queries": 8,
            "Content Summarization": 9,
            "Visual+Audio Understanding": 10,
            "Frame Extraction": 8
        },
        "Document Processing": {
            "PDF Analysis": 10,
            "Table Extraction": 9,
            "Multi-page Processing": 8,
            "Academic Q&A": 9,
            "Layout Understanding": 8,
            "Handwriting Recognition": 7
        }
    }
}

# Define colors for each modality in order
colors = {
    "Text Processing": "#1FB8CD",
    "Image Analysis": "#FFC185", 
    "Audio Processing": "#ECEBD5",
    "Video Understanding": "#5D878F",
    "Document Processing": "#D2BA4C"
}

# Improved abbreviated names to fit 15 character limit
name_mapping = {
    "Context Awareness": "Context Aware",
    "Conversation Threading": "Conv Threading",
    "Multi-language Support": "Multi-lang Supp",
    "Intent Recognition": "Intent Recog",
    "Semantic Understanding": "Semantic Undst",
    "Object Detection": "Object Detect",
    "Visual Q&A": "Visual Q&A",
    "Content Moderation": "Content Mod",
    "Art Analysis": "Art Analysis",
    "OCR Text Extraction": "OCR Extract",
    "Image Segmentation": "Image Segment",
    "Speech Transcription": "Speech Transc",
    "Voice Commands": "Voice Commands",
    "Real-time Interaction": "Real-time Int",
    "Emotion Detection": "Emotion Detect",
    "Multi-language Audio": "Multi-lang Aud",
    "Scene Analysis": "Scene Analysis",
    "Timestamp Queries": "Timestamp Quer",
    "Content Summarization": "Content Summ",
    "Visual+Audio Understanding": "Visual+Audio",
    "Frame Extraction": "Frame Extract",
    "PDF Analysis": "PDF Analysis",
    "Table Extraction": "Table Extract",
    "Multi-page Processing": "Multi-page Proc",
    "Academic Q&A": "Academic Q&A",
    "Layout Understanding": "Layout Undst",
    "Handwriting Recognition": "Handwriting"
}

# Create the figure
fig = go.Figure()

# Process data in order of modalities to maintain consistent legend order
modality_order = ["Text Processing", "Image Analysis", "Audio Processing", "Video Understanding", "Document Processing"]

for modality in modality_order:
    caps = data["capabilities"][modality]
    
    modality_caps = []
    modality_scores = []
    modality_short_names = []
    
    for capability, score in caps.items():
        modality_caps.append(capability)
        modality_scores.append(score)
        modality_short_names.append(name_mapping[capability])
    
    fig.add_trace(go.Bar(
        x=modality_scores,
        y=modality_short_names,
        orientation='h',
        name=modality,
        marker_color=colors[modality],
        text=[f"{score}" for score in modality_scores],
        textposition='inside',
        textfont=dict(color='white', size=12),
        hovertemplate='<b>%{fullData.name}</b><br>' +
                      'Capability: %{y}<br>' +
                      'Enhancement: %{x}/10<br>' +
                      '<extra></extra>'
    ))

# Update layout with better spacing and gridlines
fig.update_layout(
    title="Gemini API Multimodal Enhancement",
    xaxis_title="Enhancement",
    yaxis_title="Capabilities",
    barmode='group',
    legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='center', x=0.5),
    yaxis=dict(categoryorder='total ascending'),
    xaxis=dict(
        range=[0, 10],
        showgrid=True,
        gridcolor='lightgray',
        gridwidth=1,
        dtick=1
    ),
    yaxis_automargin=True,
    bargap=0.3,
    bargroupgap=0.1
)

# Save the chart
fig.write_image("gemini_multimodal_capabilities.png")