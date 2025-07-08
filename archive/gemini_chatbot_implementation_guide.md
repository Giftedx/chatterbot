
# Gemini API Free Tier Chatbot Implementation Guide

## Quick Setup Steps

### 1. Get Your API Key
- Visit Google AI Studio (ai.google.dev)
- Sign in with Google account
- Click "Get API key" 
- Create API key in new or existing project
- Copy and securely store your API key

### 2. Choose Your Model
RECOMMENDED FOR CHATBOTS:
- Gemini 2.0 Flash: 15 RPM, 1M TPM, 200 RPD
- Gemini 2.0 Flash-Lite: 30 RPM, 1M TPM, 200 RPD  
- Gemini 2.5 Flash: 10 RPM, 250K TPM, 250 RPD
- Gemini 2.5 Flash-Lite: 15 RPM, 250K TPM, 1000 RPD

### 3. Basic Implementation (Python)
```python
import google.generativeai as genai

# Configure API
genai.configure(api_key="YOUR_API_KEY")

# Initialize model
model = genai.GenerativeModel('gemini-2.0-flash')

# Start chat
chat = model.start_chat(history=[])

# Send message
response = chat.send_message("Hello, how are you?")
print(response.text)
```

### 4. Rate Limit Management
- Monitor your usage against limits
- Implement exponential backoff for rate limit errors
- Consider upgrading to paid tier for higher limits

### 5. Best Practices
- Use system instructions for consistent behavior
- Implement conversation memory/context management
- Add error handling for safety and rate limits
- Test thoroughly before deployment

## Cost Comparison (Free Tier)
All input/output is FREE on supported models:
- Gemini 2.5 Flash, 2.5 Flash-Lite
- Gemini 2.0 Flash, 2.0 Flash-Lite
- Gemini 1.5 Flash series (deprecated)
- Gemma 3 & 3n (limited TPM)

Note: Gemini 2.5 Pro not available on free tier
