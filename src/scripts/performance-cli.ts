#!/usr/bin/env node

/**
 * Performance Monitoring CLI
 * Simple command-line interface to view performance metrics
 */

import { performanceDashboardController } from '../controllers/performance-dashboard.controller.js';

// Simple CLI argument parsing
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

async function main() {
  console.log('🔍 ChatterBot Performance Monitoring CLI\n');

  switch (command) {
    case 'summary':
    case 's':
      showSummary();
      break;
      
    case 'dashboard':
    case 'd':
      showDashboard();
      break;
      
    case 'service':
      if (!arg1) {
        console.error('❌ Service ID required. Usage: npm run perf-cli service <serviceId>');
        process.exit(1);
      }
      showServiceStats(arg1);
      break;
      
    case 'metrics':
    case 'm':
      showMetrics(arg1 ? parseInt(arg1) : 20);
      break;
      
    case 'export':
    case 'e':
      exportData();
      break;
      
    case 'help':
    case 'h':
    default:
      showHelp();
      break;
  }
}

function showSummary() {
  const result = performanceDashboardController.getSummary();
  
  if (!result.success) {
    console.error('❌ Failed to get performance summary:', result.error);
    return;
  }
  
  const data = result.data;
  console.log('📊 Performance Summary');
  console.log('='.repeat(50));
  console.log(`Status: ${getStatusEmoji(data.status)} ${data.status.toUpperCase()}`);
  console.log(`Services Monitored: ${data.servicesMonitored.length}`);
  console.log(`Active Alerts: ${data.activeAlerts} (${data.criticalAlerts} critical)`);
  console.log(`Total Operations: ${data.overallStats.totalOperations}`);
  console.log(`Average Response Time: ${data.overallStats.averageResponseTime.toFixed(2)}ms`);
  console.log(`Overall Error Rate: ${(data.overallStats.overallErrorRate * 100).toFixed(2)}%`);
  console.log(`Last Updated: ${data.lastUpdated}`);
}

function showDashboard() {
  const result = performanceDashboardController.getDashboard();
  
  if (!result.success) {
    console.error('❌ Failed to get dashboard:', result.error);
    return;
  }
  
  const data = result.data;
  
  console.log('📊 Performance Dashboard');
  console.log('='.repeat(60));
  
  // Overall Stats
  console.log('\n📈 Overall Statistics:');
  console.log(`  Total Operations: ${data.overallStats.totalOperations}`);
  console.log(`  Average Response Time: ${data.overallStats.averageResponseTime.toFixed(2)}ms`);
  console.log(`  Error Rate: ${(data.overallStats.overallErrorRate * 100).toFixed(2)}%`);
  console.log(`  Active Services: ${data.overallStats.activeServices}`);
  
  // Service Stats
  console.log('\n🔧 Service Performance:');
  data.serviceStats.forEach((service: any) => {
    console.log(`  ${service.serviceId}:`);
    console.log(`    Health: ${getHealthEmoji(service.healthStatus)} ${service.healthStatus}`);
    console.log(`    Operations: ${service.totalOperations} (${service.successfulOperations} successful)`);
    console.log(`    Avg Time: ${service.averageExecutionTime.toFixed(2)}ms`);
    console.log(`    P95 Time: ${service.p95ExecutionTime.toFixed(2)}ms`);
    console.log(`    Error Rate: ${(service.errorRate * 100).toFixed(2)}%`);
    console.log(`    Last Active: ${service.lastOperationTime || 'Never'}`);
    console.log('');
  });
  
  // Alerts
  if (data.alerts.length > 0) {
    console.log('\n🚨 Active Alerts:');
    data.alerts.forEach((alert: any) => {
      console.log(`  ${getSeverityEmoji(alert.severity)} ${alert.serviceId}: ${alert.message}`);
      console.log(`    Type: ${alert.alertType}, Age: ${formatDuration(alert.age)}`);
    });
  } else {
    console.log('\n✅ No active alerts');
  }
}

function showServiceStats(serviceId: string) {
  const result = performanceDashboardController.getServiceStats(serviceId);
  
  if (!result.success) {
    console.error('❌ Failed to get service stats:', result.error);
    return;
  }
  
  const stats = result.data;
  console.log(`🔧 ${serviceId} Performance Statistics`);
  console.log('='.repeat(50));
  console.log(`Total Operations: ${stats.totalOperations}`);
  console.log(`Successful: ${stats.successfulOperations}`);
  console.log(`Failed: ${stats.failedOperations}`);
  console.log(`Success Rate: ${((stats.successfulOperations / stats.totalOperations) * 100).toFixed(2)}%`);
  console.log(`Average Execution Time: ${stats.averageExecutionTime.toFixed(2)}ms`);
  console.log(`Min Time: ${stats.minExecutionTime.toFixed(2)}ms`);
  console.log(`Max Time: ${stats.maxExecutionTime.toFixed(2)}ms`);
  console.log(`P95 Time: ${stats.p95ExecutionTime.toFixed(2)}ms`);
  console.log(`Error Rate: ${(stats.errorRate * 100).toFixed(2)}%`);
  console.log(`Last Operation: ${stats.lastOperationTime || 'Never'}`);
}

function showMetrics(limit: number) {
  const result = performanceDashboardController.getMetrics({ limit });
  
  if (!result.success) {
    console.error('❌ Failed to get metrics:', result.error);
    return;
  }
  
  const data = result.data;
  console.log(`📊 Recent Performance Metrics (Last ${limit})`);
  console.log('='.repeat(80));
  console.log('Time'.padEnd(20) + 'Service'.padEnd(30) + 'Operation'.padEnd(20) + 'Duration'.padEnd(10) + 'Status');
  console.log('-'.repeat(80));
  
  data.metrics.forEach((metric: any) => {
    const time = new Date(metric.timestamp).toLocaleTimeString();
    const duration = `${metric.executionTimeMs.toFixed(2)}ms`;
    const status = metric.success ? '✅' : '❌';
    
    console.log(
      time.padEnd(20) + 
      metric.serviceId.padEnd(30) + 
      metric.operationName.padEnd(20) + 
      duration.padEnd(10) + 
      status
    );
  });
  
  console.log(`\nTotal metrics: ${data.count}`);
}

function exportData() {
  try {
    const data = performanceDashboardController.exportPerformanceData();
    const filename = `performance-data-${Date.now()}.json`;
    
    // In a real CLI, we'd write to file. For this example, we'll just show summary
    console.log('📦 Performance Data Export');
    console.log('='.repeat(40));
    console.log(`Total Metrics: ${data.metrics.length}`);
    console.log(`Services: ${data.serviceStats.length}`);
    console.log(`Alerts: ${data.alerts.length}`);
    console.log(`Time Range: ${data.summary.timeRange.start} to ${data.summary.timeRange.end}`);
    console.log(`\n💾 Data would be saved to: ${filename}`);
    console.log('📄 Use this data for external analysis or reporting');
    
  } catch (error) {
    console.error('❌ Failed to export data:', error);
  }
}

function showHelp() {
  console.log('📖 Performance Monitoring CLI Commands:');
  console.log('');
  console.log('  summary, s        Show performance summary');
  console.log('  dashboard, d      Show full performance dashboard');
  console.log('  service <id>      Show stats for specific service');
  console.log('  metrics [limit]   Show recent metrics (default: 20)');
  console.log('  export, e         Export performance data');
  console.log('  help, h           Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  npm run perf-cli summary');
  console.log('  npm run perf-cli service core_intelligence_service');
  console.log('  npm run perf-cli metrics 50');
}

// Helper functions
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'degraded': return '🟡';
    case 'critical': return '🔴';
    default: return '❓';
  }
}

function getHealthEmoji(health: string): string {
  switch (health) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'critical': return '🔴';
    default: return '❓';
  }
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'LOW': return '🟢';
    case 'MEDIUM': return '🟡';
    case 'HIGH': return '🟠';
    case 'CRITICAL': return '🔴';
    default: return '❓';
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Run the CLI
main().catch(console.error);