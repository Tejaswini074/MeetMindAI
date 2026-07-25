import http from 'http';
import { createApp } from './app';
import { env } from '@config/env';
import { prisma } from '@config/prisma';
import { logger } from '@common/utils/logger';
import { initSocket } from '@sockets/index';
import { startCronJobs } from '@jobs/index';

async function bootstrap(): Promise<void> {
  await prisma.$connect();
  logger.info('Connected to MySQL via Prisma');

  const app = createApp();
  const httpServer = http.createServer(app);

  initSocket(httpServer);
  startCronJobs();

  httpServer.listen(env.PORT, () => {
    logger.info(`MeetMind API listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Swagger docs available at ${env.APP_URL}/api/docs`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    httpServer.close(() => logger.info('HTTP server closed'));
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Failed to bootstrap application', { err });
  process.exit(1);
});
