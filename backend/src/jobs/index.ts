import { logger } from '@common/utils/logger';
import { scheduleMeetingReminders } from '@jobs/meetingReminder.job';
import { scheduleRecurringMeetingGeneration } from '@jobs/recurringMeeting.job';

export function startCronJobs(): void {
  scheduleMeetingReminders();
  scheduleRecurringMeetingGeneration();
  logger.info('Cron jobs scheduled');
}
