import path from 'path';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { env } from '@config/env';
import { swaggerSpec } from '@config/swagger';
import { requestLogger } from '@middlewares/requestLogger.middleware';
import { apiRateLimiter } from '@middlewares/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from '@middlewares/errorHandler.middleware';
import apiRoutes from './routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  const uploadRoot = path.isAbsolute(env.UPLOAD_DIR)
    ? env.UPLOAD_DIR
    : path.join(process.cwd(), env.UPLOAD_DIR);
  app.use('/uploads', express.static(uploadRoot));

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api', apiRateLimiter, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
