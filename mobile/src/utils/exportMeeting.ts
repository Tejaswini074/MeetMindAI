import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/** Downloads a meeting's PDF/DOCX export and opens the native share sheet. */
export async function exportAndShareMeeting(
  meetingId: string,
  format: 'pdf' | 'docx',
  accessToken: string,
  meetingTitle: string,
): Promise<void> {
  const extension = format;
  const safeName = meetingTitle.replace(/[^a-z0-9]/gi, '_').slice(0, 60) || 'meeting';
  const destination = new File(Paths.cache, `${safeName}.${extension}`);

  const task = File.createDownloadTask(`${API_URL}/meetings/${meetingId}/export?format=${format}`, destination, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const file = await task.downloadAsync();
  if (!file) throw new Error('Export download failed');

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri);
  }
}
