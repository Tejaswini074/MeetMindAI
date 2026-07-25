import cron from 'node-cron';
import { logger } from '@common/utils/logger';
import { generateUpcomingRecurringOccurrences } from '@modules/meetings/services/recurrence.service';

// Once a day, materialize the next occurrence of every recurring meeting series.
export function scheduleRecurringMeetingGeneration(): void {
  cron.schedule('0 1 * * *', async () => {
    try {
      const count = await generateUpcomingRecurringOccurrences();
      if (count > 0) {
        logger.info(`Generated ${count} recurring meeting occurrence(s)`);
      }
    } catch (err) {
      logger.error('Recurring meeting generation job failed', { err });
    }
  });
}
