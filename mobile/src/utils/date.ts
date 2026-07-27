import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export function formatDateTime(iso: string): string {
  const date = parseISO(iso);
  return isValid(date) ? format(date, 'MMM d, yyyy · h:mm a') : '';
}

export function formatDate(iso: string): string {
  const date = parseISO(iso);
  return isValid(date) ? format(date, 'MMM d, yyyy') : '';
}

export function formatTime(iso: string): string {
  const date = parseISO(iso);
  return isValid(date) ? format(date, 'h:mm a') : '';
}

export function formatRelative(iso: string): string {
  const date = parseISO(iso);
  return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : '';
}
