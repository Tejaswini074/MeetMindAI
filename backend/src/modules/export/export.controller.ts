import { Request, Response } from 'express';
import { asyncHandler } from '@common/utils/asyncHandler';
import { AppError } from '@common/errors/AppError';
import { meetingService } from '@modules/meetings/meeting.service';
import { exportMeetingAsPdf, exportMeetingAsDocx } from '@modules/export/export.service';

export const exportMeeting = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const meeting = await meetingService.getById(req.params.id, req.user.id);
  const format = (req.query.format as string) === 'docx' ? 'docx' : 'pdf';

  if (format === 'docx') {
    const buffer = await exportMeetingAsDocx(meeting.id, req.user.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${meeting.title.replace(/[^a-z0-9]/gi, '_')}.docx"`);
    res.send(buffer);
    return;
  }

  const buffer = await exportMeetingAsPdf(meeting.id, req.user.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${meeting.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
  res.send(buffer);
});
