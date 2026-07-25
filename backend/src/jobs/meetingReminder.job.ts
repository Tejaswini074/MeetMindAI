import cron from 'node-cron';
import { logger } from '@common/utils/logger';
import { sendUpcomingMeetingReminders } from '@modules/notifications/services/reminder.service';

// Every 5 minutes, look for meetings starting soon and notify participants who haven't been reminded yet.
export function scheduleMeetingReminders(): void {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await sendUpcomingMeetingReminders();
      if (count > 0) {
        logger.info(`Sent ${count} upcoming-meeting reminder notification(s)`);
      }
    } catch (err) {
      logger.error('Meeting reminder job failed', { err });
    }
  });
}
