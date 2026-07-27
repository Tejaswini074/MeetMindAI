import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '../../../components';
import { typography } from '../../../theme';
import { useUploadTranscriptMutation } from '../../../api/meetingsApi';

const ACCEPTED_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function TranscriptUploadButton({ meetingId }: { meetingId: string }) {
  const [uploadTranscript, { isLoading, isSuccess, error }] = useUploadTranscriptMutation();

  const handlePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_MIME_TYPES,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    await uploadTranscript({
      meetingId,
      file: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'text/plain' },
    });
  };

  return (
    <View>
      <Button title="Upload transcript file (TXT/PDF/DOCX)" onPress={handlePick} variant="ghost" loading={isLoading} />
      {error && <Text style={styles.error}>Could not process that file.</Text>}
      {isSuccess && <Text style={styles.success}>Transcript uploaded.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { ...typography.caption, color: '#DC2626', marginTop: 8 },
  success: { ...typography.caption, color: '#16A34A', marginTop: 8 },
});
