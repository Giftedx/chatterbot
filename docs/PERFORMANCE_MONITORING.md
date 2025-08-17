# Performance Monitoring Guide

This guide provides comprehensive information about Chatterbot's performance monitoring system, including setup, usage, and optimization strategies.

## Overview

The Performance Monitoring Service provides real-time tracking and alerting for all AI enhancement services and core system operations. It offers insights into:

- **Operation Performance**: Response times, success rates, and error tracking
- **Resource Usage**: Memory, CPU, and network utilization patterns
- **Service Health**: Individual service status and availability
- **User Experience**: End-to-end interaction quality metrics
- **Cost Optimization**: Token usage and API cost tracking

## Architecture

The performance monitoring system consists of:

1. **PerformanceMonitoringService** - Core monitoring and metrics collection
2. **Performance Dashboard** - Web-based visualization and reporting
3. **CLI Interface** - Command-line monitoring and administration
4. **Alerting System** - Real-time notifications for performance issues
5. **Export System** - Data export for external analysis

## Setup and Configuration

### Environment Variables

```env
# Enable performance monitoring
ENABLE_PERFORMANCE_MONITORING=true

# Alert thresholds
PERFORMANCE_ALERT_THRESHOLD_ERROR_RATE=0.05          # 5% error rate
PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME=5000       # 5 seconds
PERFORMANCE_ALERT_THRESHOLD_OPERATIONS_PER_MINUTE=100 # Rate limit

# Data retention
PERFORMANCE_RETENTION_HOURS=168                      # 7 days
PERFORMANCE_CLEANUP_INTERVAL_MINUTES=60              # Hourly cleanup
PERFORMANCE_MAX_OPERATIONS_IN_MEMORY=10000           # Memory limit

# Export and dashboard settings
PERFORMANCE_EXPORT_FORMAT=json                       # json, csv, prometheus
PERFORMANCE_DASHBOARD_REFRESH_INTERVAL=30000         # 30 seconds
PERFORMANCE_LOG_LEVEL=info                           # debug, info, warn, error
```

### Docker Configuration

Performance monitoring is automatically enabled in Docker deployments:

```yaml
# docker-compose.yml
services:
  chatterbot:
    environment:
      - ENABLE_PERFORMANCE_MONITORING=true
      - PERFORMANCE_DASHBOARD_REFRESH_INTERVAL=30000
    volumes:
      - performance-data:/data/performance
    ports:
      - "3000:3000"  # Health and metrics
      - "3001:3001"  # Analytics dashboard
```

## Core Concepts

### Operations

An **operation** represents a single unit of work being monitored:

- **Start Time**: When the operation began
- **End Time**: When the operation completed
- **Service Name**: Which AI service performed the operation
- **Operation Type**: Specific type of work (e.g., "sentiment-analysis", "cache-lookup")
- **Success Status**: Whether the operation completed successfully
- **Metadata**: Additional context (user ID, message ID, model used, etc.)

### Metrics

The system collects various **metrics** for analysis:

- **Response Time**: Duration from start to completion
- **Success Rate**: Percentage of successful operations
- **Error Rate**: Percentage of failed operations
- **Throughput**: Operations per minute/hour
- **Resource Usage**: Memory and CPU utilization
- **Cost Metrics**: Token usage and estimated costs

### Services

**Services** represent logical groupings of operations:

- `core-intelligence` - Main processing pipeline
- `sentiment-analysis` - Emotion and mood detection
- `context-memory` - Conversation memory and retrieval
- `knowledge-graph` - Entity relationship operations
- `multimodal-processing` - Image and media analysis
- `web-crawling` - URL extraction and content processing
- And more...

## CLI Interface

The performance monitoring CLI provides powerful command-line access to monitoring data:

### Installation

The CLI is automatically available in Docker containers:

```bash
# In Docker container
docker exec -it chatterbot npm run performance:summary
```

For local development:

```bash
# Install dependencies
npm install

# Run CLI commands
npm run performance:summary
npm run performance:dashboard
npm run performance:export
```

### Commands

#### Performance Summary

Get an overview of system performance:

```bash
npm run performance:summary

# Output example:
Performance Summary (Last 24 Hours)
===================================
Total Operations: 1,247
Success Rate: 97.2%
Average Response Time: 1,234ms
Error Rate: 2.8%
Active Services: 12

Top Services by Volume:
1. core-intelligence: 456 ops (97.8% success)
2. sentiment-analysis: 234 ops (98.7% success)
3. context-memory: 198 ops (96.5% success)
```

#### Dashboard View

Display detailed performance metrics:

```bash
npm run performance:dashboard

# Opens interactive dashboard in terminal
# Use arrow keys to navigate, 'q' to quit
# Displays real-time metrics and charts
```

#### Service Statistics

View statistics for specific services:

```bash
npm run performance:stats sentiment-analysis

# Output example:
Sentiment Analysis Service Statistics
===================================
Total Operations: 234
Successful: 231 (98.7%)
Failed: 3 (1.3%)
Average Response Time: 145ms
95th Percentile: 267ms
99th Percentile: 412ms

Recent Errors:
- 2025-08-17 10:23:45: Rate limit exceeded
- 2025-08-17 09:15:22: Invalid input format
```

#### Metrics Export

Export performance data for analysis:

```bash
# Export all metrics (default: JSON)
npm run performance:export

# Export specific time range
npm run performance:export --since="2025-08-16" --until="2025-08-17"

# Export in different formats
npm run performance:export --format=csv
npm run performance:export --format=prometheus

# Export specific services
npm run performance:export --services="core-intelligence,sentiment-analysis"
```

#### Live Monitoring

Monitor performance in real-time:

```bash
npm run performance:live

# Displays live metrics with auto-refresh
# Shows current operations and alerts
# Press Ctrl+C to exit
```

## Web Dashboard

The performance dashboard provides a web-based interface for monitoring and analysis.

### Access

When `ENABLE_ANALYTICS_DASHBOARD=true` is set:

- **URL**: http://localhost:3001/performance
- **API Endpoint**: http://localhost:3000/api/performance
- **Authentication**: None (internal use only)

### Features

#### Overview Dashboard

- **System Health**: Overall status and key metrics
- **Performance Trends**: Response time and throughput over time
- **Error Tracking**: Error rates and recent failures
- **Service Status**: Individual service health indicators

#### Service Details

- **Individual Service Metrics**: Deep dive into specific services
- **Operation History**: Recent operations and their performance
- **Error Analysis**: Detailed error logs and patterns
- **Performance Trends**: Service-specific performance over time

#### Alerting Interface

- **Active Alerts**: Current performance issues
- **Alert History**: Past alerts and resolutions
- **Threshold Configuration**: Adjust alert thresholds
- **Notification Settings**: Configure alert delivery

## API Reference

### REST Endpoints

#### Get Dashboard Data

```http
GET /api/performance/dashboard
```

Response:
```json
{
  "overallStats": {
    "totalOperations": 1247,
    "averageResponseTime": 1234,
    "overallErrorRate": 0.028,
    "activeServices": 12
  },
  "serviceStats": {
    "core-intelligence": {
      "totalOperations": 456,
      "successfulOperations": 446,
      "failedOperations": 10,
      "averageResponseTime": 2145,
      "errorRate": 0.022
    }
  },
  "alerts": [
    {
      "type": "error_rate",
      "service": "knowledge-graph",
      "message": "Error rate exceeds threshold",
      "threshold": 0.05,
      "current": 0.078,
      "timestamp": "2025-08-17T10:30:00Z"
    }
  ]
}
```

#### Get Service Statistics

```http
GET /api/performance/services/{serviceName}
```

Response:
```json
{
  "serviceName": "sentiment-analysis",
  "totalOperations": 234,
  "successfulOperations": 231,
  "failedOperations": 3,
  "averageResponseTime": 145,
  "errorRate": 0.013,
  "recentOperations": [
    {
      "operationId": "op_123",
      "startTime": "2025-08-17T10:25:00Z",
      "duration": 156,
      "success": true
    }
  ]
}
```

#### Export Performance Data

```http
GET /api/performance/export?format=json&since=2025-08-16&until=2025-08-17
```

Response:
```json
{
  "exportTime": "2025-08-17T10:30:00Z",
  "timeRange": {
    "since": "2025-08-16T00:00:00Z",
    "until": "2025-08-17T23:59:59Z"
  },
  "metrics": {
    "totalOperations": 1247,
    "services": { /* detailed service data */ },
    "timeline": [ /* hourly metrics */ ]
  }
}
```

## Alerting System

The alerting system provides real-time notifications for performance issues.

### Alert Types

#### Error Rate Alerts

Triggered when service error rates exceed thresholds:

```json
{
  "type": "error_rate",
  "service": "knowledge-graph",
  "message": "Error rate of 7.8% exceeds threshold of 5%",
  "threshold": 0.05,
  "current": 0.078,
  "timestamp": "2025-08-17T10:30:00Z",
  "severity": "warning"
}
```

#### Response Time Alerts

Triggered when response times are too slow:

```json
{
  "type": "response_time",
  "service": "multimodal-processing",
  "message": "Average response time of 8.2s exceeds threshold of 5s",
  "threshold": 5000,
  "current": 8234,
  "timestamp": "2025-08-17T10:30:00Z",
  "severity": "critical"
}
```

#### Throughput Alerts

Triggered when operation volume is too high:

```json
{
  "type": "throughput",
  "service": "core-intelligence",
  "message": "120 operations/minute exceeds threshold of 100",
  "threshold": 100,
  "current": 120,
  "timestamp": "2025-08-17T10:30:00Z",
  "severity": "warning"
}
```

### Alert Configuration

Customize alert thresholds:

```env
# Error rate threshold (percentage)
PERFORMANCE_ALERT_THRESHOLD_ERROR_RATE=0.05

# Response time threshold (milliseconds)
PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME=5000

# Throughput threshold (operations per minute)
PERFORMANCE_ALERT_THRESHOLD_OPERATIONS_PER_MINUTE=100

# Alert cooldown (seconds)
PERFORMANCE_ALERT_COOLDOWN=300
```

### Alert Delivery

Alerts can be delivered through multiple channels:

#### Console Logging (Default)

```bash
[ALERT] ERROR_RATE: knowledge-graph error rate of 7.8% exceeds threshold of 5%
```

#### Discord Notifications (Optional)

```env
PERFORMANCE_ALERT_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
```

#### Custom Webhooks (Optional)

```env
PERFORMANCE_ALERT_WEBHOOK_URL=https://your-monitoring-system.com/alerts
```

## Performance Optimization

### Identifying Bottlenecks

Use the monitoring data to identify performance bottlenecks:

1. **Review Service Statistics**: Look for services with high error rates or response times
2. **Analyze Operation Patterns**: Identify specific operations causing slowdowns
3. **Check Resource Usage**: Monitor memory and CPU utilization
4. **Review Error Logs**: Understand common failure patterns

### Optimization Strategies

#### Service-Specific Optimizations

**Sentiment Analysis**:
- Batch multiple messages for analysis
- Use caching for repeated content
- Optimize model parameters for speed vs. accuracy

**Context Memory**:
- Implement intelligent cache eviction
- Use vector indexing for faster retrieval
- Optimize memory storage format

**Knowledge Graph**:
- Use connection pooling for Neo4j
- Implement query result caching
- Optimize graph traversal algorithms

**Multimodal Processing**:
- Resize images before processing
- Use progressive image loading
- Implement content-based routing

#### System-Wide Optimizations

1. **Caching Strategy**:
   - Implement semantic caching for similar queries
   - Use Redis for distributed caching
   - Configure appropriate TTL values

2. **Resource Management**:
   - Use connection pooling for database connections
   - Implement request queuing for rate limiting
   - Configure memory limits for services

3. **Model Selection**:
   - Route simple queries to faster models
   - Use model-specific optimizations
   - Implement adaptive model selection

### Configuration Tuning

Optimize performance through configuration:

```env
# Increase operation limits for high-traffic
PERFORMANCE_MAX_OPERATIONS_IN_MEMORY=50000

# Reduce retention for better performance
PERFORMANCE_RETENTION_HOURS=72

# Increase cleanup frequency
PERFORMANCE_CLEANUP_INTERVAL_MINUTES=30

# Adjust alert thresholds based on capacity
PERFORMANCE_ALERT_THRESHOLD_RESPONSE_TIME=3000
```

## Troubleshooting

### Common Issues

#### High Error Rates

**Symptoms**: Error rate alerts, failed operations in dashboard

**Diagnosis**:
```bash
# Check service-specific errors
npm run performance:stats <service-name>

# Review error logs
docker logs chatterbot | grep ERROR
```

**Solutions**:
- Check external service connectivity
- Verify API keys and credentials
- Review rate limiting settings
- Check resource availability

#### Slow Response Times

**Symptoms**: Response time alerts, user complaints about delays

**Diagnosis**:
```bash
# Identify slow services
npm run performance:dashboard

# Check resource usage
docker stats chatterbot
```

**Solutions**:
- Optimize service configurations
- Implement caching strategies
- Scale resources (CPU, memory)
- Enable parallel processing

#### Memory Issues

**Symptoms**: Out of memory errors, container restarts

**Diagnosis**:
```bash
# Check memory usage
docker stats chatterbot

# Review operation limits
npm run performance:summary
```

**Solutions**:
- Reduce `PERFORMANCE_MAX_OPERATIONS_IN_MEMORY`
- Increase `PERFORMANCE_CLEANUP_INTERVAL_MINUTES`
- Add more memory to container
- Implement data streaming

### Debug Mode

Enable detailed debugging:

```env
NODE_ENV=development
LOG_LEVEL=debug
PERFORMANCE_LOG_LEVEL=debug
```

Debug output includes:
- Detailed operation traces
- Service initialization logs
- Performance calculation details
- Alert trigger information

### Health Checks

Monitor system health:

```bash
# Overall health
curl http://localhost:3000/health

# Performance monitoring health
curl http://localhost:3000/health/performance

# Individual service health
curl http://localhost:3000/health/ai-services
```

## Data Export and Analysis

### Export Formats

#### JSON Export

```bash
npm run performance:export --format=json
```

Produces structured data suitable for analysis:
```json
{
  "exportTime": "2025-08-17T10:30:00Z",
  "metrics": {
    "services": {
      "core-intelligence": {
        "operations": [...],
        "stats": {...}
      }
    }
  }
}
```

#### CSV Export

```bash
npm run performance:export --format=csv
```

Produces tabular data for spreadsheet analysis:
```csv
timestamp,service,operation,duration,success,error
2025-08-17T10:00:00Z,sentiment-analysis,analyze,145,true,
2025-08-17T10:00:01Z,context-memory,retrieve,234,false,"timeout"
```

#### Prometheus Export

```bash
npm run performance:export --format=prometheus
```

Produces metrics in Prometheus format:
```
# HELP chatterbot_operations_total Total number of operations
# TYPE chatterbot_operations_total counter
chatterbot_operations_total{service="sentiment-analysis"} 234

# HELP chatterbot_operation_duration_seconds Operation duration
# TYPE chatterbot_operation_duration_seconds histogram
chatterbot_operation_duration_seconds_bucket{service="sentiment-analysis",le="0.1"} 145
```

### Analysis Examples

#### Python Analysis

```python
import json
import pandas as pd

# Load exported data
with open('performance-export.json') as f:
    data = json.load(f)

# Convert to DataFrame
df = pd.json_normalize(data['metrics']['services'])

# Analysis examples
print("Average response times by service:")
print(df.groupby('service')['averageResponseTime'].mean())

print("Error rates by service:")
print(df.groupby('service')['errorRate'].mean())
```

#### SQL Analysis

```sql
-- Load CSV data into database table
CREATE TABLE performance_data (
    timestamp TIMESTAMP,
    service VARCHAR(50),
    operation VARCHAR(50),
    duration INT,
    success BOOLEAN,
    error VARCHAR(255)
);

-- Analysis queries
SELECT service, AVG(duration) as avg_duration
FROM performance_data
WHERE success = true
GROUP BY service
ORDER BY avg_duration DESC;

SELECT service, COUNT(*) as error_count
FROM performance_data
WHERE success = false
GROUP BY service
ORDER BY error_count DESC;
```

## Integration with External Tools

### Grafana Dashboard

Import performance data into Grafana:

1. **Setup Prometheus Export**:
   ```env
   PERFORMANCE_EXPORT_FORMAT=prometheus
   PERFORMANCE_EXPORT_INTERVAL=60000
   ```

2. **Configure Data Source**:
   ```yaml
   # prometheus.yml
   scrape_configs:
     - job_name: 'chatterbot'
       static_configs:
         - targets: ['localhost:3000']
       metrics_path: '/metrics'
   ```

3. **Create Dashboard**:
   - Import dashboard JSON from `docs/grafana-dashboard.json`
   - Configure panels for key metrics
   - Set up alerting rules

### Datadog Integration

Send metrics to Datadog:

```env
DATADOG_API_KEY=your-api-key
DATADOG_APP_KEY=your-app-key
PERFORMANCE_EXPORT_DATADOG=true
```

### Custom Integration

Implement custom metric collection:

```typescript
// custom-metrics.ts
import { performanceMonitor } from './src/services/performance-monitoring.service';

// Custom metric collection
setInterval(() => {
  const dashboard = performanceMonitor.getDashboard();
  
  // Send to your monitoring system
  sendToMonitoringSystem({
    timestamp: Date.now(),
    metrics: dashboard.overallStats,
    services: Array.from(dashboard.serviceStats.entries())
  });
}, 60000); // Every minute
```

## Best Practices

### Monitoring Strategy

1. **Monitor What Matters**: Focus on metrics that impact user experience
2. **Set Meaningful Thresholds**: Base alerts on actual service requirements
3. **Regular Review**: Analyze performance data weekly to identify trends
4. **Proactive Optimization**: Address performance issues before they impact users

### Data Management

1. **Appropriate Retention**: Balance data availability with storage costs
2. **Regular Exports**: Backup performance data for historical analysis
3. **Cleanup Strategy**: Implement automated cleanup for old data
4. **Privacy Compliance**: Ensure performance data respects user privacy

### Alert Management

1. **Avoid Alert Fatigue**: Set appropriate thresholds to prevent noise
2. **Escalation Procedures**: Define clear escalation paths for critical alerts
3. **Alert Documentation**: Document common alerts and their resolutions
4. **Regular Testing**: Test alert systems to ensure they work correctly

### Performance Culture

1. **Performance Budgets**: Set and enforce performance budgets for new features
2. **Regular Reviews**: Include performance metrics in regular team reviews
3. **User Impact Focus**: Always consider the user impact of performance changes
4. **Continuous Improvement**: Regularly optimize based on monitoring data

## Conclusion

The Performance Monitoring System provides comprehensive insights into Chatterbot's AI enhancement services. By leveraging the CLI interface, web dashboard, and alerting system, you can ensure optimal performance and user experience.

Regular monitoring and optimization based on the collected data will help maintain high-quality service delivery and identify opportunities for improvement.

For additional support or questions about performance monitoring, refer to the troubleshooting section or check the system health endpoints.