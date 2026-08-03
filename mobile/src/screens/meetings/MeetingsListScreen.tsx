import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, refetch } = useListMeetingsQuery({ page });
  const { data: teams } = useListTeamsQuery();

  if (isLoading) return <LoadingSpinner />;

  const meetings = data?.items ?? [];
  const canLoadMore = !!data && meetings.length < data.total;

  const handleRefresh = () => {
    if (page === 1) refetch();
    else setPage(1);
  };
  const handleLoadMore = () => {
    if (canLoadMore && !isFetching) setPage((p) => p + 1);
  };

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const hasTeams = (teams ?? []).length > 0;

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={meetings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={handleRefresh}
        refreshing={isFetching && page === 1}
        onEndReachedThreshold={0.5}
        onEndReached={handleLoadMore}
        ListFooterComponent={isFetching && page > 1 ? <ActivityIndicator style={styles.footerSpinner} /> : null}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={typography.h1}>Meetings</Text>
            <View style={styles.headerActions}>
              <Pressable onPress={() => navigation.navigate('Search')} style={styles.askButton}>
                <Text style={styles.askButtonText}>Search</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('AskAssistant')} style={styles.askButton}>
                <Text style={styles.askButtonText}>Ask AI</Text>
              </Pressable>
              {hasTeams && (
                <Pressable
                  style={styles.newButton}
                  onPress={() => navigation.navigate('CreateMeeting', undefined)}
                >
                  <Text style={styles.newButtonText}>+ New</Text>
                </Pressable>
              )}
            </View>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  askButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  askButtonText: { color: colors.primary, fontWeight: '600' },
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
  footerSpinner: { marginVertical: spacing.lg },
});
