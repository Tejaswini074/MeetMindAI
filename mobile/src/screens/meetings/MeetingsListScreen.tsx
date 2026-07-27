import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Badge, Card, EmptyState, LoadingSpinner, ScreenContainer } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useListMeetingsQuery } from '../../api/meetingsApi';
import { useListTeamsQuery } from '../../api/teamsApi';
import { formatDateTime } from '../../utils/date';
import { meetingStatusColor, meetingStatusLabels } from '../../utils/statusMaps';
import type { MeetingsStackParamList } from '../../navigation/types';
import type { Meeting } from '../../types/api';

type Props = NativeStackScreenProps<MeetingsStackParamList, 'MeetingsList'>;

export function MeetingsListScreen({ navigation }: Props) {
  const { data: meetings, isLoading, refetch, isFetching } = useListMeetingsQuery();
  const { data: teams } = useListTeamsQuery();

  if (isLoading) return <LoadingSpinner />;

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const hasTeams = (teams ?? []).length > 0;

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={meetings ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isFetching}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={typography.h1}>Meetings</Text>
            {hasTeams && (
              <Pressable
                style={styles.newButton}
                onPress={() => navigation.navigate('CreateMeeting', undefined)}
              >
                <Text style={styles.newButtonText}>+ New</Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={hasTeams ? 'No meetings yet' : 'Join or create a team first'}
            subtitle={
              hasTeams
                ? 'Schedule a meeting to start capturing notes and action items.'
                : 'Meetings belong to teams — head to the Teams tab first.'
            }
          />
        }
        renderItem={({ item }) => (
          <MeetingRow
            meeting={item}
            teamName={teamNameById.get(item.teamId)}
            onPress={() => navigation.navigate('MeetingDetail', { meetingId: item.id })}
          />
        )}
      />
    </ScreenContainer>
  );
}

function MeetingRow({
  meeting,
  teamName,
  onPress,
}: {
  meeting: Meeting;
  teamName?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[typography.h3, styles.title]} numberOfLines={1}>
            {meeting.title}
          </Text>
          <Badge label={meetingStatusLabels[meeting.status]} color={meetingStatusColor(meeting.status)} />
        </View>
        <Text style={styles.meta}>
          {formatDateTime(meeting.scheduledAt)}
          {teamName ? ` · ${teamName}` : ''}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, flexGrow: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  newButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  newButtonText: { color: colors.textInverse, fontWeight: '600' },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flex: 1, marginRight: spacing.sm },
  meta: { ...typography.caption, marginTop: spacing.xs },
});
