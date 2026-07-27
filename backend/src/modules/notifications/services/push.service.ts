import fs from 'fs';
import admin from 'firebase-admin';
import { env } from '@config/env';
import { logger } from '@common/utils/logger';
import { prisma } from '@config/prisma';

let app: admin.app.App | null = null;
let initAttempted = false;

function getFirebaseApp(): admin.app.App | null {
  if (initAttempted) return app;
  initAttempted = true;

  try {
    let credential: admin.credential.Credential | null = null;

    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      credential = admin.credential.cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON));
    } else if (env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
      credential = admin.credential.cert(JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf-8')));
    }

    if (!credential) {
      logger.warn('Firebase service account not configured — push notifications are disabled');
      return null;
    }

    app = admin.initializeApp({ credential });
    return app;
  } catch (err) {
    logger.error('Failed to initialize Firebase Admin SDK', { err });
    return null;
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return;

  const deviceTokens = await prisma.deviceToken.findMany({ where: { userId } });
  if (deviceTokens.length === 0) return;

  try {
    const response = await admin.messaging(firebaseApp).sendEachForMulticast({
      tokens: deviceTokens.map((d) => d.fcmToken),
      notification: { title, body },
      data,
    });

    const staleTokens = deviceTokens.filter((_, i) => !response.responses[i].success).map((d) => d.fcmToken);
    if (staleTokens.length > 0) {
      await prisma.deviceToken.deleteMany({ where: { fcmToken: { in: staleTokens } } });
    }
  } catch (err) {
    logger.error('Failed to send push notification', { err, userId });
  }
}
