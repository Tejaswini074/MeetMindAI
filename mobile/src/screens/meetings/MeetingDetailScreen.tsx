import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Badge, Button, Card, Input, LoadingSpinner, ScreenContainer } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useGetMeetingQuery, useUpdateRsvpMutation } from '../../api/meetingsApi';
import {
  useAnalyzeSentimentMutation,
  useAskAboutMeetingMutation,
  useExtractActionItemsMutation,
  useSummarizeMeetingMutation,
} from '../../api/aiApi';
import { useAppSelector } from '../../store/hooks';
import { formatDateTime } from '../../utils/date';
import { meetingStatusColor, meetingStatusLabels, priorityColor, priorityLabels } from '../../utils/statusMaps';
import { exportAndShareMeeting } from '../../utils/exportMeeting';
import { useMeetingLiveTranscript } from '../../hooks/useMeetingLiveTranscript';
import { AudioRecorder } from './components/AudioRecorder';
import { TranscriptUploadButton } from './components/TranscriptUploadButton';
import type { MeetingsStackParamList } from '../../navigation/types';
import type { RsvpStatus } from '../../types/api';

type Props = NativeStackScreenProps<MeetingsStackParamList, 'MeetingDetail'>;

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: 'ACCEPTED', label: 'Accept' },
  { value: 'TENTATIVE', label: 'Tentative' },
  { value: 'DECLINED', label: 'Decline' },
];

export function MeetingDetailScreen({ route }: Props) {
  const { meetingId } = route.params;
  const currentUser = useAppSelector((s) => s.auth.user);
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  const { data: meeting, isLoading } = useGetMeetingQuery(meetingId);
  const [updateRsvp, { isLoading: rsvpLoading }] = useUpdateRsvpMutation();
  const [summarize, { isLoading: summarizing }] = useSummarizeMeetingMutation();
  const [extractActionItems, { isLoading: extracting }] = useExtractActionItemsMutation();
  const [analyzeSentiment, { isLoading: analyzingSentiment }] = useAnalyzeSentimentMutation();
  const [askAboutMeeting, { isLoading: asking, data: qaResult }] = useAskAboutMeetingMutation();

  const [isLive, setIsLive] = useState(false);
  const [question, setQuestion] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);

  const { liveTranscript, presentUserIds } = useMeetingLiveTranscript(meetingId, isLive);

  if (isLoading || !meeting) return <LoadingSpinner />;

  const myParticipant = meeting.participants?.find((p) => p.userId === currentUser?.id);
  const latestSummary = meeting.summaries?.[0];
  const hasTranscript = (meeting.transcripts?.length ?? 0) > 0;

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!accessToken) return;
    setExporting(format);
    try {
      await exportAndShareMeeting(meetingId, format, accessToken, meeting.title);
    } finally {
      setExporting(null);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <Text style={[typography.h1, styles.flexTitle]}>{meeting.title}</Text>
        <Badge label={meetingStatusLabels[meeting.status]} color={meetingStatusColor(meeting.status)} />
      </View>
      <Text style={styles.meta}>{formatDateTime(meeting.scheduledAt)} · {meeting.durationMinutes} min</Text>
      {meeting.description ? <Text style={styles.description}>{meeting.description}</Text> : null}

      {meeting.sentimentLabel && (
        <View style={styles.sentimentRow}>
          <Badge label={`Sentiment: ${meeting.sentimentLabel}`} color={colors.info} />
        </View>
      )}

      {/* Participants & RSVP */}
      <Card style={styles.section}>
        <Text style={typography.h3}>Participants</Text>
        {meeting.participants?.map((p) => (
          <Text key={p.id} style={styles.participantLine}>
            {p.user.name} — {p.role.toLowerCase()}, {p.rsvpStatus.toLowerCase()}
            {presentUserIds.includes(p.userId) ? ' · live now' : ''}
          </Text>
        ))}
        {myParticipant && (
          <View style={styles.rsvpRow}>
            {RSVP_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                title={opt.label}
                variant={myParticipant.rsvpStatus === opt.value ? 'primary' : 'ghost'}
                onPress={() => updateRsvp({ meetingId, status: opt.value })}
                loading={rsvpLoading}
                fullWidth={false}
                style={styles.rsvpButton}
              />
            ))}
          </View>
        )}
      </Card>

      {/* Live transcription */}
      <Card style={styles.section}>
        <Text style={typography.h3}>Live meeting</Text>
        <Button
          title={isLive ? 'Leave live session' : 'Join live session'}
          variant={isLive ? 'danger' : 'secondary'}
          onPress={() => setIsLive((v) => !v)}
          style={styles.spaceTop}
        />
        {isLive && liveTranscript ? (
          <Text style={styles.liveTranscript}>{liveTranscript}</Text>
        ) : isLive ? (
          <Text style={styles.meta}>Listening for live audio chunks…</Text>
        ) : null}
      </Card>

      {/* Recording / uploads */}
      <Card style={styles.section}>
        <Text style={typography.h3}>Audio & transcript</Text>
        <AudioRecorder meetingId={meetingId} />
        <View style={styles.spaceTop}>
          <TranscriptUploadButton meetingId={meetingId} />
        </View>
        {meeting.transcripts?.map((t) => (
          <View key={t.id} style={styles.transcriptBlock}>
            <Text style={typography.caption}>{t.source} · {formatDateTime(t.createdAt)}</Text>
            <Text numberOfLines={4} style={styles.transcriptText}>{t.fullText}</Text>
          </View>
        ))}
      </Card>

      {/* AI actions */}
      <Card style={styles.section}>
        <Text style={typography.h3}>AI insights</Text>
        <View style={styles.aiButtonRow}>
          <Button
            title="Summarize"
            variant="ghost"
            onPress={() => summarize(meetingId)}
            loading={summarizing}
            disabled={!hasTranscript}
            fullWidth={false}
            style={styles.aiButton}
          />
          <Button
            title="Extract action items"
            variant="ghost"
            onPress={() => extractActionItems(meetingId)}
            loading={extracting}
            disabled={!hasTranscript}
            fullWidth={false}
            style={styles.aiButton}
          />
          <Button
            title="Analyze sentiment"
            variant="ghost"
            onPress={() => analyzeSentiment(meetingId)}
            loading={analyzingSentiment}
            disabled={!hasTranscript}
            fullWidth={false}
            style={styles.aiButton}
          />
        </View>
        {!hasTranscript && <Text style={styles.meta}>Upload or record audio first to unlock AI insights.</Text>}

        {latestSummary && (
          <View style={styles.spaceTop}>
            <Text style={typography.bodyBold}>Summary</Text>
            <Text style={styles.bodyText}>{latestSummary.content}</Text>
          </View>
        )}

        {(meeting.actionItems?.length ?? 0) > 0 && (
          <View style={styles.spaceTop}>
            <Text style={typography.bodyBold}>Action items</Text>
            {meeting.actionItems?.map((item) => (
              <View key={item.id} style={styles.actionItemRow}>
                <Badge label={priorityLabels[item.priority]} color={priorityColor(item.priority)} />
                <Text style={styles.actionItemText}>
                  {item.title}
                  {item.assignee ? ` — ${item.assignee.name}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.spaceTop}>
          <Text style={typography.bodyBold}>Ask about this meeting</Text>
          <Input
            value={question}
            onChangeText={setQuestion}
            placeholder="What did we decide about the launch date?"
          />
          <Button
            title="Ask"
            onPress={() => askAboutMeeting({ meetingId, question })}
            loading={asking}
            disabled={!question.trim() || !hasTranscript}
          />
          {qaResult && <Text style={styles.bodyText}>{qaResult.answer}</Text>}
        </View>
      </Card>

      {/* Export */}
      <Card style={styles.section}>
        <Text style={typography.h3}>Export</Text>
        <View style={styles.aiButtonRow}>
          <Button
            title="Export PDF"
            variant="ghost"
            onPress={() => handleExport('pdf')}
            loading={exporting === 'pdf'}
            fullWidth={false}
            style={styles.aiButton}
          />
          <Button
            title="Export DOCX"
            variant="ghost"
            onPress={() => handleExport('docx')}
            loading={exporting === 'docx'}
            fullWidth={false}
            style={styles.aiButton}
          />
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  flexTitle: { flex: 1, marginRight: spacing.sm },
  meta: { ...typography.caption, marginTop: spacing.xs },
  description: { ...typography.body, marginTop: spacing.sm },
  sentimentRow: { marginTop: spacing.sm },
  section: { marginTop: spacing.lg },
  participantLine: { ...typography.caption, marginTop: spacing.xs },
  rsvpRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  rsvpButton: { flex: 1 },
  spaceTop: { marginTop: spacing.md },
  liveTranscript: { ...typography.body, marginTop: spacing.md, fontStyle: 'italic' },
  transcriptBlock: { marginTop: spacing.md },
  transcriptText: { ...typography.caption, marginTop: spacing.xs },
  aiButtonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  aiButton: { marginTop: spacing.sm },
  bodyText: { ...typography.body, marginTop: spacing.xs },
  actionItemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  actionItemText: { ...typography.body, flex: 1 },
});
