import 'dotenv/config';
import { healthCheck } from '../health.js';
import { logger } from '../utils/logger.js';

const port = Number(process.env.HEALTH_CHECK_PORT ?? 3000);
logger.info(`Starting health-only server on port ${port}`);

healthCheck.start();

process.on('SIGINT', () => {
  logger.info('Shutting down health-only server (SIGINT)');
  try { healthCheck.stop(); } catch (err) { logger.error('Error stopping health-only server on SIGINT', err as Error); }
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down health-only server (SIGTERM)');
  try { healthCheck.stop(); } catch (err) { logger.error('Error stopping health-only server on SIGTERM', err as Error); }
  process.exit(0);
});