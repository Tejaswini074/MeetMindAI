import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '@config/env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'MeetMind API',
      version: '1.0.0',
      description:
        'AI Meeting Notes & Action Tracker API — auth, teams, meetings, AI transcription/summarization, Kanban tasks, search, notifications, analytics and more.',
    },
    servers: [{ url: `${env.APP_URL}/api`, description: 'Current environment' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.docs.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
