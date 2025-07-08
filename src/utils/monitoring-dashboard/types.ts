/**
 * Monitoring Dashboard Types
 * Shared interfaces and types for the interactive monitoring dashboard
 */

export interface DashboardConfig {
  port: number;
  updateInterval: number;
  enableAuth: boolean;
  authToken?: string;
  cors: {
    enabled: boolean;
    origins: string[];
  };
  features: {
    realTimeCharts: boolean;
    exportData: boolean;
    alerts: boolean;
    userAnalytics: boolean;
  };
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'gauge' | 'heatmap';
  data: Array<{
    timestamp?: number;
    label: string;
    value: number;
    metadata?: Record<string, unknown>;
  }>;
  config: {
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
    thresholds?: Array<{ value: number; color: string; label: string }>;
    realTime: boolean;
    refreshRate: number;
  };
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'alert' | 'table' | 'custom';
  position: { x: number; y: number; width: number; height: number };
  data: ChartData | MetricsGridData | AlertListData | TableData | Record<string, unknown>;
  config: {
    refreshInterval: number;
    autoRefresh: boolean;
    interactive: boolean;
    exportable: boolean;
  };
}

export interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  globalConfig: {
    theme: 'light' | 'dark' | 'auto';
    refreshRate: number;
    autoLayout: boolean;
  };
}

export interface SystemHealthMetric {
  id: string;
  label: string;
  value: string | number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

export interface AlertData {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export interface TableData {
  type: 'data-table';
  columns: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'duration';
  }>;
  data: Record<string, string | number>[];
  config: {
    sortable: boolean;
    searchable: boolean;
    pageSize: number;
  };
}

export interface MetricsGridData {
  type: 'metrics-grid';
  metrics: SystemHealthMetric[];
}

export interface AlertListData {
  type: 'alert-list';
  alerts: AlertData[];
  config: {
    maxAlerts: number;
    severityColors: Record<string, string>;
  };
}

export interface DashboardExportData {
  layouts: DashboardLayout[];
  config: DashboardConfig;
}

export interface ClientConnection {
  id: string;
  connected: boolean;
  lastActivity: number;
}

export interface WebServerOptions {
  port: number;
  cors: {
    enabled: boolean;
    origins: string[];
  };
  auth: {
    enabled: boolean;
    token?: string;
  };
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  port: 3001,
  updateInterval: 5000,
  enableAuth: false,
  cors: {
    enabled: true,
    origins: ['http://localhost:3000', 'http://localhost:3001']
  },
  features: {
    realTimeCharts: true,
    exportData: true,
    alerts: true,
    userAnalytics: true
  }
};

export const CHART_COLORS = {
  primary: ['#00D4FF', '#FF6B6B', '#4ECDC4', '#45B7D1'],
  secondary: ['#96CEB4', '#FFEAA7', '#74B9FF', '#FDCB6E'],
  status: {
    healthy: '#00FF7F',
    warning: '#FFD700',
    critical: '#FF6B6B'
  },
  theme: {
    light: ['#2196F3', '#4CAF50', '#FF9800', '#F44336'],
    dark: ['#64B5F6', '#81C784', '#FFB74D', '#E57373']
  }
};

export const PERFORMANCE_THRESHOLDS = {
  responseTime: {
    excellent: 1000,
    good: 3000,
    poor: 5000
  },
  cacheHitRate: {
    excellent: 0.8,
    good: 0.6,
    poor: 0.4
  },
  resourceUtilization: {
    warning: 70,
    critical: 90
  }
};
