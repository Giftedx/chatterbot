import pandas as pd

# Create a comprehensive data table about Gemini API free tier limits
data = {
    'Model': [
        'Gemini 2.5 Pro',
        'Gemini 2.5 Flash', 
        'Gemini 2.5 Flash-Lite',
        'Gemini 2.0 Flash',
        'Gemini 2.0 Flash-Lite',
        'Gemini 1.5 Flash',
        'Gemini 1.5 Flash-8B',
        'Gemma 3 & 3n'
    ],
    'RPM (Requests/Min)': [5, 10, 15, 15, 30, 15, 15, 30],
    'TPM (Tokens/Min)': ['250,000', '250,000', '250,000', '1,000,000', '1,000,000', '250,000', '250,000', '15,000'],
    'RPD (Requests/Day)': [100, 250, 1000, 200, 200, 50, 50, 14400],
    'Input Cost': ['Not Available', 'Free', 'Free', 'Free', 'Free', 'Free', 'Free', 'Free'],
    'Output Cost': ['Not Available', 'Free', 'Free', 'Free', 'Free', 'Free', 'Free', 'Free'],
    'Best For Chatbots': ['No (Not available on free)', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes (Deprecated)', 'Yes (Deprecated)', 'Limited (Low TPM)']
}

df = pd.DataFrame(data)
print("Gemini API Free Tier Comparison for Chatbots:")
print("=" * 60)
print(df.to_string(index=False))

# Save as CSV for reference
df.to_csv('gemini_api_free_tier_comparison.csv', index=False)
print(f"\nData saved to: gemini_api_free_tier_comparison.csv")

# Create a summary of key features
print("\n\nKEY FEATURES FOR CHATBOT DEVELOPMENT:")
print("=" * 50)

features = {
    'Feature': [
        'Free Tier Available',
        'Best Models for Chatbots',
        'Multimodal Support', 
        'Context Window',
        'Function Calling',
        'Grounding with Search',
        'Live API Support',
        'Data Usage Policy'
    ],
    'Details': [
        'Yes - Multiple models available for free',
        'Gemini 2.5 Flash, 2.0 Flash, 2.0 Flash-Lite',
        'Text, Image, Audio, Video support',
        'Up to 1M tokens (varies by model)',
        'Available on most models',
        'Free tier: 500 requests/day',
        'Available with session limits',
        'Used to improve Google products on free tier'
    ]
}

features_df = pd.DataFrame(features)
print(features_df.to_string(index=False))