# Discord Gemini Bot - Deployment Guide

## 🚀 Free Hosting Options

### Option 1: Railway (Recommended)

**Advantages:**
- $5/month free credit (sufficient for small bots)
- Easy GitHub integration
- Automatic deployments
- Built-in environment variables
- No sleep issues

**Setup Steps:**

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy:**
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Set Environment Variables:**
   ```bash
   railway variables set DISCORD_TOKEN=your_discord_token
   railway variables set DISCORD_CLIENT_ID=your_client_id
   railway variables set GEMINI_API_KEY=your_gemini_key
   ```

4. **Monitor Deployment:**
   ```bash
   railway logs
   ```

### Option 2: Silly Development (Specialized Discord Hosting)

**Advantages:**
- Free Discord bot hosting
- 99.8% uptime guarantee
- 24/7 support
- DDoS protection
- No technical setup required

**Setup Steps:**

1. Join their [Discord server](https://sillydev.co.uk/)
2. Create a support ticket for bot hosting
3. Upload your bot files
4. Provide environment variables
5. They handle the hosting setup

### Option 3: Bot-Hosting.net

**Advantages:**
- Purpose-built for Discord bots
- Multiple runtime support
- Extensive documentation
- Community support

**Setup Steps:**

1. Visit [bot-hosting.net](https://bot-hosting.net/)
2. Sign up for free account
3. Upload bot files
4. Configure environment variables

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Required
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
GEMINI_API_KEY=your_gemini_api_key

# Optional
NODE_ENV=production
ENABLE_ENHANCED_INTELLIGENCE=true
DATABASE_URL=your_database_url
```

## 📊 Monitoring

### Health Check Endpoint

Your bot includes a health check endpoint at `/health` that returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": 45,
    "total": 512,
    "percentage": 9
  },
  "environment": "production",
  "version": "0.1.0",
  "features": {
    "discord": true,
    "gemini": true,
    "database": false,
    "moderation": true
  }
}
```

### Uptime Monitoring

Use [UptimeRobot](https://uptimerobot.com/) (free tier) to monitor your bot:

1. Sign up for free account
2. Add new monitor
3. Set URL to: `https://your-bot-url.railway.app/health`
4. Set check interval to 5 minutes

## 🧪 Testing

### Local Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests for CI
npm run test:ci
```

### Pre-deployment Checklist

- [ ] All tests pass (`npm run test:ci`)
- [ ] Environment variables configured
- [ ] Discord bot token valid
- [ ] Gemini API key valid
- [ ] Health check endpoint working
- [ ] Bot responds to `/chat` command

## 💰 Cost Optimization

### Free Tier Limits

- **Railway**: $5/month credit
- **Silly Development**: Completely free
- **Bot-Hosting.net**: Completely free
- **Gemini API**: 60 requests/minute free tier

### Monitoring Usage

1. **Railway**: Check usage in dashboard
2. **Gemini API**: Monitor in Google Cloud Console
3. **Discord API**: No limits for bot usage

### Optimization Tips

1. **Implement rate limiting** for Gemini API calls
2. **Cache responses** when possible
3. **Use webhooks** instead of polling
4. **Monitor memory usage** via health endpoint

## 🆘 Troubleshooting

### Common Issues

1. **Bot not responding:**
   - Check Discord token validity
   - Verify bot has correct permissions
   - Check health endpoint

2. **Gemini API errors:**
   - Verify API key is valid
   - Check rate limits
   - Monitor API usage

3. **Deployment failures:**
   - Check build logs
   - Verify environment variables
   - Test locally first

### Support Resources

- [Railway Documentation](https://docs.railway.app/)
- [Discord.js Guide](https://discordjs.guide/)
- [Google Generative AI Docs](https://ai.google.dev/docs)
- [Silly Development Discord](https://sillydev.co.uk/)

## 🔄 Continuous Deployment

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - uses: railway/deploy@v1
        with:
          service: your-railway-service
```

## 📈 Scaling Considerations

### When to Upgrade

- **Railway**: When approaching $5/month limit
- **Silly Development**: When needing more resources
- **Bot-Hosting.net**: When requiring premium features

### Migration Path

1. Start with Railway for development
2. Use Silly Development as backup
3. Scale up based on usage and requirements

---

**Remember:** All hosting options mentioned are free and suitable for Discord bots. Choose based on your technical comfort level and specific needs. 