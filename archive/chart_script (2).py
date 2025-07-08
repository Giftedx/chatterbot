import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

# Data from the provided JSON
data = {
    "multimodal_flow": {
        "inputs": {
            "Text": ["Natural language queries", "Commands", "Conversations"],
            "Images": ["Screenshots", "Photos", "Artwork", "Diagrams"],
            "Audio": ["Voice messages", "Speech commands", "Music files"],
            "Video": ["Tutorials", "Recordings", "Streams"],
            "Documents": ["PDFs", "Reports", "Textbooks", "Manuals"]
        },
        "processing": {
            "Text": ["Context understanding", "Intent recognition", "Conversation flow"],
            "Images": ["Object detection", "OCR", "Visual analysis", "Content moderation"],
            "Audio": ["Speech-to-text", "Audio analysis", "Voice recognition"],
            "Video": ["Scene understanding", "Timestamp analysis", "Content extraction"],
            "Documents": ["Text extraction", "Table parsing", "Layout understanding"]
        },
        "outputs": {
            "Text": ["Contextual responses", "Follow-up questions", "Threaded conversations"],
            "Images": ["Detailed descriptions", "Analysis reports", "Safety assessments"],
            "Audio": ["Transcriptions", "Voice responses", "Real-time interaction"],
            "Video": ["Summaries", "Key moments", "Visual insights"],
            "Documents": ["Q&A sessions", "Fact extraction", "Study assistance"]
        }
    }
}

# Create data for Sankey diagram
labels = []
sources = []
targets = []
values = []
colors = ['#1FB8CD', '#FFC185', '#ECEBD5', '#5D878F', '#D2BA4C']

# Input types
input_types = ['Text', 'Images', 'Audio', 'Video', 'Documents']

# Create labels for inputs
for i, input_type in enumerate(input_types):
    labels.append(f"{input_type} Input")

# Create labels for processing
for i, input_type in enumerate(input_types):
    if input_type == 'Text':
        labels.append("NLP Process")
    elif input_type == 'Images':
        labels.append("Vision Process")
    elif input_type == 'Audio':
        labels.append("Audio Process")
    elif input_type == 'Video':
        labels.append("Video Process")
    elif input_type == 'Documents':
        labels.append("Doc Process")

# Create labels for outputs
for i, input_type in enumerate(input_types):
    if input_type == 'Text':
        labels.append("Smart Chat")
    elif input_type == 'Images':
        labels.append("Visual Bot")
    elif input_type == 'Audio':
        labels.append("Voice Bot")
    elif input_type == 'Video':
        labels.append("Media Bot")
    elif input_type == 'Documents':
        labels.append("Study Bot")

# Create connections
for i in range(5):
    # Input to Processing
    sources.append(i)
    targets.append(i + 5)
    values.append(10)
    
    # Processing to Output
    sources.append(i + 5)
    targets.append(i + 10)
    values.append(10)

# Create node colors
node_colors = []
for i in range(5):
    node_colors.append(colors[i])  # Input colors
for i in range(5):
    node_colors.append(colors[i])  # Processing colors (same as input)
for i in range(5):
    node_colors.append(colors[i])  # Output colors (same as input)

# Create Sankey diagram
fig = go.Figure(data=[go.Sankey(
    node=dict(
        pad=20,
        thickness=30,
        line=dict(color="black", width=1),
        label=labels,
        color=node_colors
    ),
    link=dict(
        source=sources,
        target=targets,
        value=values,
        color=['rgba(31, 184, 205, 0.2)' if i < 5 else 'rgba(255, 193, 133, 0.2)' if i < 10 else 'rgba(236, 235, 213, 0.2)' if i < 15 else 'rgba(93, 135, 143, 0.2)' if i < 20 else 'rgba(210, 186, 76, 0.2)' for i in range(len(sources))]
    )
)])

# Update layout
fig.update_layout(
    title="Gemini API Multimodal Discord Bot Flow",
    font_size=12
)

fig.write_image("multimodal_flow_chart.png")