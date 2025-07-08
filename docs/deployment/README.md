# Deployment Documentation

This directory contains production deployment configurations and infrastructure setup files.

## Deployment Files

### `deploy.sh`
Production deployment script with automated setup and configuration.

### `nginx.conf`
Nginx reverse proxy configuration for production web serving and load balancing.

### `docker-compose.yml`
Docker containerization setup for scalable deployment and service orchestration.

## Deployment Requirements

- **Node.js 18+** with npm package manager
- **Discord Bot Token** and Application ID
- **Google Gemini API Key** for AI functionality
- **SQLite Database** (default) or PostgreSQL for production
- **Optional**: Redis for caching (performance enhancement)

## Quick Deployment

```bash
# 1. Clone repository
git clone <repository-url>
cd windsurf-project

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your tokens

# 4. Set up database
npx prisma migrate dev --name init

# 5. Deploy
./docs/deployment/deploy.sh
```

## Production Considerations

- **Environment Variables**: Secure storage of API keys and tokens
- **Database**: Consider PostgreSQL for production scalability
- **Monitoring**: Enable analytics dashboard for usage tracking
- **Security**: Configure RBAC permissions and content moderation
- **Performance**: Implement Redis caching for high-traffic servers

## Related Documentation

- [Main README](../../README.md) - Configuration and setup instructions
- [Development Docs](../development/) - Development and testing information
