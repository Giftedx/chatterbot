/**
 * Export Service
 * Handles configuration export and data serialization for the dashboard
 */

import { 
  DashboardLayout, 
  DashboardConfig, 
  DashboardExportData,
  ChartData 
} from './types.js';
import { logger } from '../logger.js';

export class ExportService {

  /**
   * Export complete dashboard configuration
   */
  exportConfiguration(
    layouts: Map<string, DashboardLayout>,
    config: DashboardConfig
  ): DashboardExportData {
    try {
      const exportData: DashboardExportData = {
        layouts: Array.from(layouts.values()),
        config
      };

      logger.info('Dashboard configuration exported', {
        operation: 'export-configuration',
        metadata: {
          layoutCount: layouts.size,
          widgetCount: this.countTotalWidgets(layouts),
          exportSize: JSON.stringify(exportData).length
        }
      });

      return exportData;

    } catch (error) {
      logger.error('Failed to export dashboard configuration', {
        operation: 'export-configuration-error',
        metadata: { error: String(error) }
      });

      throw new Error(`Export failed: ${String(error)}`);
    }
  }

  /**
   * Export specific layout
   */
  exportLayout(layout: DashboardLayout): DashboardLayout {
    try {
      // Deep clone to avoid modifying original
      const exportedLayout = JSON.parse(JSON.stringify(layout)) as DashboardLayout;

      logger.debug('Layout exported', {
        operation: 'export-layout',
        metadata: {
          layoutId: layout.id,
          widgetCount: layout.widgets.length
        }
      });

      return exportedLayout;

    } catch (error) {
      logger.error('Failed to export layout', {
        operation: 'export-layout-error',
        metadata: {
          layoutId: layout.id,
          error: String(error)
        }
      });

      throw new Error(`Layout export failed: ${String(error)}`);
    }
  }

  /**
   * Export chart data for external analysis
   */
  exportChartData(
    chartData: ChartData,
    format: 'json' | 'csv' = 'json'
  ): string {
    try {
      if (format === 'csv') {
        return this.convertToCSV(chartData);
      }

      const exportData = {
        id: chartData.id,
        title: chartData.title,
        type: chartData.type,
        data: chartData.data,
        config: chartData.config,
        exportedAt: new Date().toISOString()
      };

      logger.debug('Chart data exported', {
        operation: 'export-chart-data',
        metadata: {
          chartId: chartData.id,
          format,
          dataPoints: chartData.data.length
        }
      });

      return JSON.stringify(exportData, null, 2);

    } catch (error) {
      logger.error('Failed to export chart data', {
        operation: 'export-chart-data-error',
        metadata: {
          chartId: chartData.id,
          format,
          error: String(error)
        }
      });

      throw new Error(`Chart data export failed: ${String(error)}`);
    }
  }

  /**
   * Import dashboard configuration
   */
  importConfiguration(
    exportData: DashboardExportData,
    validation: boolean = true
  ): { 
    layouts: Map<string, DashboardLayout>; 
    config: DashboardConfig;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      // Validate import data if requested
      if (validation) {
        const validationErrors = this.validateImportData(exportData);
        errors.push(...validationErrors);
      }

      // Convert layouts array back to Map
      const layouts = new Map<string, DashboardLayout>();
      exportData.layouts.forEach(layout => {
        layouts.set(layout.id, layout);
      });

      logger.info('Dashboard configuration imported', {
        operation: 'import-configuration',
        metadata: {
          layoutCount: layouts.size,
          hasErrors: errors.length > 0,
          errorCount: errors.length
        }
      });

      return {
        layouts,
        config: exportData.config,
        errors
      };

    } catch (error) {
      const errorMessage = `Import failed: ${String(error)}`;
      errors.push(errorMessage);

      logger.error('Failed to import dashboard configuration', {
        operation: 'import-configuration-error',
        metadata: { error: String(error) }
      });

      return {
        layouts: new Map(),
        config: exportData.config,
        errors
      };
    }
  }

  /**
   * Export analytics report
   */
  exportAnalyticsReport(
    layouts: Map<string, DashboardLayout>,
    timeRange: { start: Date; end: Date }
  ): {
    report: {
      summary: Record<string, unknown>;
      layouts: Array<{
        id: string;
        name: string;
        widgets: number;
        lastUpdated: string;
      }>;
      performance: Record<string, unknown>;
      exportedAt: string;
    };
    csv: string;
  } {
    try {
      const summary = {
        totalLayouts: layouts.size,
        totalWidgets: this.countTotalWidgets(layouts),
        timeRange: {
          start: timeRange.start.toISOString(),
          end: timeRange.end.toISOString(),
          duration: timeRange.end.getTime() - timeRange.start.getTime()
        }
      };

      const layoutSummaries = Array.from(layouts.values()).map(layout => ({
        id: layout.id,
        name: layout.name,
        widgets: layout.widgets.length,
        lastUpdated: new Date().toISOString()
      }));

      const performance = {
        averageUpdateInterval: this.calculateAverageUpdateInterval(layouts),
        totalDataPoints: this.countTotalDataPoints(layouts),
        memoryUsage: process.memoryUsage()
      };

      const report = {
        summary,
        layouts: layoutSummaries,
        performance,
        exportedAt: new Date().toISOString()
      };

      const csv = this.convertReportToCSV(report);

      logger.info('Analytics report exported', {
        operation: 'export-analytics-report',
        metadata: {
          layoutCount: layouts.size,
          widgetCount: summary.totalWidgets,
          timeRangeHours: summary.timeRange.duration / (1000 * 60 * 60)
        }
      });

      return { report, csv };

    } catch (error) {
      logger.error('Failed to export analytics report', {
        operation: 'export-analytics-report-error',
        metadata: { error: String(error) }
      });

      throw new Error(`Analytics report export failed: ${String(error)}`);
    }
  }

  /**
   * Convert chart data to CSV format
   */
  private convertToCSV(chartData: ChartData): string {
    try {
      const headers = ['timestamp', 'label', 'value'];
      const rows = [headers.join(',')];

      chartData.data.forEach(point => {
        const row = [
          point.timestamp || '',
          point.label,
          point.value
        ];
        rows.push(row.join(','));
      });

      return rows.join('\n');

    } catch (error) {
      throw new Error(`CSV conversion failed: ${String(error)}`);
    }
  }

  /**
   * Convert analytics report to CSV
   */
  private convertReportToCSV(report: Record<string, unknown>): string {
    try {
      const rows = ['Category,Metric,Value'];
      
      // Add summary data
      if (report.summary && typeof report.summary === 'object') {
        Object.entries(report.summary).forEach(([key, value]) => {
          rows.push(`Summary,${key},${String(value)}`);
        });
      }

      // Add layout data
      if (Array.isArray(report.layouts)) {
        report.layouts.forEach((layout: Record<string, unknown>) => {
          Object.entries(layout).forEach(([key, value]) => {
            rows.push(`Layout-${layout.id},${key},${String(value)}`);
          });
        });
      }

      return rows.join('\n');

    } catch (error) {
      throw new Error(`Report CSV conversion failed: ${String(error)}`);
    }
  }

  /**
   * Validate import data structure
   */
  private validateImportData(exportData: DashboardExportData): string[] {
    const errors: string[] = [];

    if (!exportData) {
      errors.push('Export data is null or undefined');
      return errors;
    }

    if (!Array.isArray(exportData.layouts)) {
      errors.push('Layouts must be an array');
    } else {
      exportData.layouts.forEach((layout, index) => {
        if (!layout.id) {
          errors.push(`Layout ${index} missing ID`);
        }
        if (!layout.name) {
          errors.push(`Layout ${index} missing name`);
        }
        if (!Array.isArray(layout.widgets)) {
          errors.push(`Layout ${index} widgets must be an array`);
        }
      });
    }

    if (!exportData.config) {
      errors.push('Configuration is missing');
    } else {
      if (typeof exportData.config.port !== 'number') {
        errors.push('Configuration port must be a number');
      }
      if (typeof exportData.config.updateInterval !== 'number') {
        errors.push('Configuration updateInterval must be a number');
      }
    }

    return errors;
  }

  /**
   * Count total widgets across all layouts
   */
  private countTotalWidgets(layouts: Map<string, DashboardLayout>): number {
    return Array.from(layouts.values()).reduce(
      (total, layout) => total + layout.widgets.length,
      0
    );
  }

  /**
   * Calculate average update interval across widgets
   */
  private calculateAverageUpdateInterval(layouts: Map<string, DashboardLayout>): number {
    const intervals: number[] = [];
    
    layouts.forEach(layout => {
      layout.widgets.forEach(widget => {
        intervals.push(widget.config.refreshInterval);
      });
    });

    if (intervals.length === 0) return 0;
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  /**
   * Count total data points across all charts
   */
  private countTotalDataPoints(layouts: Map<string, DashboardLayout>): number {
    let totalDataPoints = 0;

    layouts.forEach(layout => {
      layout.widgets.forEach(widget => {
        if (widget.type === 'chart' && widget.data && 'data' in widget.data) {
          const chartData = widget.data as ChartData;
          totalDataPoints += chartData.data.length;
        }
      });
    });

    return totalDataPoints;
  }
}
