import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { prisma } from '@config/prisma';
import { AppError } from '@common/errors/AppError';
import { recordAudit } from '@modules/audit/audit.service';
import { AuditAction } from '@prisma/client';

async function loadMeetingReport(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      team: true,
      createdBy: true,
      participants: { include: { user: true } },
      attendance: { include: { user: true } },
      transcripts: true,
      summaries: { orderBy: { createdAt: 'desc' } },
      actionItems: { include: { assignee: true } },
    },
  });
  if (!meeting) throw AppError.notFound('Meeting not found');
  return meeting;
}

type MeetingReport = Awaited<ReturnType<typeof loadMeetingReport>>;

export async function exportMeetingAsPdf(meetingId: string, actorId: string): Promise<Buffer> {
  const meeting = await loadMeetingReport(meetingId);
  const buffer = await renderPdf(meeting);
  await recordAudit({ actorId, action: AuditAction.EXPORT, entityType: 'Meeting', entityId: meetingId, diff: { format: 'pdf' } });
  return buffer;
}

export async function exportMeetingAsDocx(meetingId: string, actorId: string): Promise<Buffer> {
  const meeting = await loadMeetingReport(meetingId);
  const buffer = await renderDocx(meeting);
  await recordAudit({ actorId, action: AuditAction.EXPORT, entityType: 'Meeting', entityId: meetingId, diff: { format: 'docx' } });
  return buffer;
}

function renderPdf(meeting: MeetingReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(meeting.title, { underline: true });
    doc.fontSize(10).fillColor('gray').text(`Team: ${meeting.team.name}`);
    doc.text(`Scheduled: ${meeting.scheduledAt.toLocaleString()}`);
    doc.text(`Organizer: ${meeting.createdBy.name}`);
    doc.moveDown();

    doc.fillColor('black').fontSize(14).text('Participants');
    doc.fontSize(10).text(meeting.participants.map((p) => `${p.user.name} (${p.role}, ${p.rsvpStatus})`).join(', ') || 'None');
    doc.moveDown();

    if (meeting.sentimentLabel) {
      doc.fontSize(14).text('Sentiment');
      doc.fontSize(10).text(`${meeting.sentimentLabel} (score: ${meeting.sentimentScore ?? 'n/a'})`);
      doc.moveDown();
    }

    doc.fontSize(14).text('Summary');
    doc.fontSize(10).text(meeting.summaries[0]?.content ?? 'No summary generated yet.');
    doc.moveDown();

    doc.fontSize(14).text('Action Items');
    if (meeting.actionItems.length === 0) {
      doc.fontSize(10).text('None extracted.');
    } else {
      for (const item of meeting.actionItems) {
        doc
          .fontSize(10)
          .text(`- ${item.title} | Assignee: ${item.assignee?.name ?? 'Unassigned'} | Priority: ${item.priority} | Due: ${item.dueDate?.toLocaleDateString() ?? 'n/a'}`);
      }
    }
    doc.moveDown();

    doc.fontSize(14).text('Attendance');
    if (meeting.attendance.length === 0) {
      doc.fontSize(10).text('No attendance recorded.');
    } else {
      for (const record of meeting.attendance) {
        doc
          .fontSize(10)
          .text(`- ${record.user.name}: joined ${record.joinedAt.toLocaleTimeString()}${record.leftAt ? `, left ${record.leftAt.toLocaleTimeString()}` : ''}`);
      }
    }
    doc.moveDown();

    doc.fontSize(14).text('Transcript');
    doc.fontSize(9).fillColor('#333').text(meeting.transcripts.map((t) => t.fullText).join('\n\n') || 'No transcript available.');

    doc.end();
  });
}

async function renderDocx(meeting: MeetingReport): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: meeting.title, heading: HeadingLevel.TITLE }),
          new Paragraph({ text: `Team: ${meeting.team.name}` }),
          new Paragraph({ text: `Scheduled: ${meeting.scheduledAt.toLocaleString()}` }),
          new Paragraph({ text: `Organizer: ${meeting.createdBy.name}` }),

          new Paragraph({ text: 'Participants', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            text: meeting.participants.map((p) => `${p.user.name} (${p.role}, ${p.rsvpStatus})`).join(', ') || 'None',
          }),

          new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: meeting.summaries[0]?.content ?? 'No summary generated yet.' }),

          new Paragraph({ text: 'Action Items', heading: HeadingLevel.HEADING_1 }),
          ...(meeting.actionItems.length === 0
            ? [new Paragraph({ text: 'None extracted.' })]
            : meeting.actionItems.map(
                (item) =>
                  new Paragraph({
                    children: [
                      new TextRun(
                        `${item.title} — Assignee: ${item.assignee?.name ?? 'Unassigned'}, Priority: ${item.priority}, Due: ${item.dueDate?.toLocaleDateString() ?? 'n/a'}`,
                      ),
                    ],
                    bullet: { level: 0 },
                  }),
              )),

          new Paragraph({ text: 'Attendance', heading: HeadingLevel.HEADING_1 }),
          ...(meeting.attendance.length === 0
            ? [new Paragraph({ text: 'No attendance recorded.' })]
            : meeting.attendance.map(
                (record) =>
                  new Paragraph({
                    text: `${record.user.name}: joined ${record.joinedAt.toLocaleTimeString()}${record.leftAt ? `, left ${record.leftAt.toLocaleTimeString()}` : ''}`,
                    bullet: { level: 0 },
                  }),
              )),

          new Paragraph({ text: 'Transcript', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: meeting.transcripts.map((t) => t.fullText).join('\n\n') || 'No transcript available.' }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
