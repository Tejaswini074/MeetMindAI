export const colors = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primaryLight: '#EEF2FF',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',

  priority: {
    LOW: '#64748B',
    MEDIUM: '#2563EB',
    HIGH: '#D97706',
    URGENT: '#DC2626',
  },

  taskStatus: {
    TODO: '#64748B',
    IN_PROGRESS: '#2563EB',
    IN_REVIEW: '#D97706',
    DONE: '#16A34A',
  },

  meetingStatus: {
    SCHEDULED: '#2563EB',
    IN_PROGRESS: '#D97706',
    COMPLETED: '#16A34A',
    CANCELLED: '#94A3B8',
  },
} as const;
