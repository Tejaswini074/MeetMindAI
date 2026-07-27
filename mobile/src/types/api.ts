// Mirrors backend/prisma/schema.prisma enums and the shapes returned by backend/src/modules/**/*.controller.ts.
// Dates come over the wire as ISO strings (Prisma -> JSON), not Date objects.

export type GlobalRole = 'ADMIN' | 'TEAM_LEAD' | 'TEAM_MEMBER';
export type TeamMemberRole = 'LEAD' | 'MEMBER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ParticipantRole = 'ORGANIZER' | 'ATTENDEE';
export type RsvpStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
export type AudioProcessingStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
export type TranscriptSource = 'WHISPER' | 'UPLOAD_TXT' | 'UPLOAD_DOCX' | 'UPLOAD_PDF' | 'LIVE';
export type ActionItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ActionItemSource = 'AI' | 'MANUAL';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMMENT'
  | 'MEETING_REMINDER'
  | 'MEETING_INVITE'
  | 'ACTION_ITEM_ASSIGNED'
  | 'MENTION'
  | 'SYSTEM';
export type SentimentLabel = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginationMeta & Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: GlobalRole;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  joinedAt: string;
  user: User;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  role: ParticipantRole;
  rsvpStatus: RsvpStatus;
  user: User;
}

export interface AttendanceRecord {
  id: string;
  meetingId: string;
  userId: string;
  joinedAt: string;
  leftAt: string | null;
  user: User;
}

export interface MeetingAudio {
  id: string;
  meetingId: string;
  filePath: string;
  originalName: string;
  mimeType: string;
  durationSeconds: number | null;
  language: string | null;
  status: AudioProcessingStatus;
  failureReason: string | null;
  createdAt: string;
}

export interface TranscriptSegment {
  id: string;
  transcriptId: string;
  speakerLabel: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface Transcript {
  id: string;
  meetingId: string;
  source: TranscriptSource;
  language: string | null;
  fullText: string;
  createdAt: string;
  segments?: TranscriptSegment[];
}

export interface Summary {
  id: string;
  meetingId: string;
  content: string;
  model: string;
  createdAt: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  taskId: string | null;
  title: string;
  assigneeId: string | null;
  assignee?: User | null;
  priority: ActionItemPriority;
  dueDate: string | null;
  sourceType: ActionItemSource;
  confidence: number | null;
  createdAt: string;
}

export interface Meeting {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: MeetingStatus;
  recurrenceRule: string | null;
  parentMeetingId: string | null;
  calendarEventId: string | null;
  sentimentScore: number | null;
  sentimentLabel: SentimentLabel | null;
  createdById: string;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
  participants?: MeetingParticipant[];
  attendance?: AttendanceRecord[];
  audios?: MeetingAudio[];
  transcripts?: Transcript[];
  summaries?: Summary[];
  actionItems?: ActionItem[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: User;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  filePath: string;
  originalName: string;
  mimeType: string;
  uploadedById: string;
  createdAt: string;
  uploadedBy: User;
}

export interface Task {
  id: string;
  teamId: string;
  meetingId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assignee?: User | null;
  createdById: string;
  createdBy?: User;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface SearchResult {
  type: 'meeting' | 'transcript' | 'summary' | 'task';
  id: string;
  meetingId: string | null;
  teamId: string;
  title: string;
  snippet: string;
  score: number;
}

export interface AiQaResult {
  answer: string;
  sources: { meetingId: string; meetingTitle: string; excerpt: string; relevance: number }[];
}
