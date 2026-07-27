import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Button } from '../../../components';
import { colors, spacing, typography } from '../../../theme';
import { useUploadAudioMutation } from '../../../api/meetingsApi';

export function AudioRecorder({ meetingId }: { meetingId: string }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [uploadAudio, { isLoading: isUploading, isSuccess }] = useUploadAudioMutation();

  const handleStart = async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const handleStop = async () => {
    await recorder.stop();
    if (!recorder.uri) return;

    await uploadAudio({
      meetingId,
      file: { uri: recorder.uri, name: 'recording.m4a', mimeType: 'audio/m4a' },
    });
  };

  return (
    <View style={styles.container}>
      {recorderState.isRecording ? (
        <Button title="Stop recording" onPress={handleStop} variant="danger" loading={isUploading} />
      ) : (
        <Button title="Record meeting audio" onPress={handleStart} variant="secondary" />
      )}

      {recorderState.isRecording && (
        <Text style={styles.status}>
          Recording… {Math.round(recorderState.durationMillis / 1000)}s
        </Text>
      )}
      {permissionDenied && <Text style={styles.error}>Microphone permission is required to record.</Text>}
      {isUploading && <Text style={styles.status}>Uploading — transcription will run automatically…</Text>}
      {isSuccess && <Text style={styles.success}>Uploaded! Check back shortly for the transcript.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  status: { ...typography.caption, marginTop: spacing.sm },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  success: { ...typography.caption, color: colors.success, marginTop: spacing.sm },
});
