import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Card, EmptyState, LoadingSpinner, ScreenContainer } from '../../components';
import { colors, spacing, typography } from '../../theme';
import {
  useListNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../../api/notificationsApi';
import { formatRelative } from '../../utils/date';
import type { Notification } from '../../types/api';

export function NotificationsListScreen() {
  // Jumping from this tab into a screen nested inside a *different* tab's stack
  // (e.g. MeetingsTab > MeetingDetail) isn't representable in React Navigation's
  // per-navigator param typing, so this one call is intentionally loosely typed.
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, refetch } = useListNotificationsQuery({ page });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  if (isLoading) return <LoadingSpinner />;

  const canLoadMore = !!data && data.items.length < data.total;
  const handleRefresh = () => {
    if (page === 1) refetch();
    else setPage(1);
  };
  const handleLoadMore = () => {
    if (canLoadMore && !isFetching) setPage((p) => p + 1);
  };

  const handlePress = (notification: Notification) => {
    if (!notification.isRead) markRead(notification.id);

    const meetingId = notification.metadata?.meetingId as string | undefined;
    const taskId = notification.metadata?.taskId as string | undefined;

    if (meetingId) {
      navigation.navigate('MeetingsTab');
      navigation.navigate('MeetingDetail', { meetingId });
    } else if (taskId) {
      navigation.navigate('TasksTab');
      navigation.navigate('TaskDetail', { taskId });
    }
  };

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={handleRefresh}
        refreshing={isFetching && page === 1}
        onEndReachedThreshold={0.5}
        onEndReached={handleLoadMore}
        ListFooterComponent={isFetching && page > 1 ? <ActivityIndicator style={styles.footerSpinner} /> : null}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={typography.h1}>Notifications</Text>
            {!!data?.unreadCount && (
              <Pressable onPress={() => markAllRead()}>
                <Text style={styles.markAll}>Mark all read</Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={<EmptyState title="You're all caught up" subtitle="New notifications will show up here." />}
        renderItem={({ item }) => <NotificationRow notification={item} onPress={() => handlePress(item)} />}
      />
    </ScreenContainer>
  );
}

function NotificationRow({ notification, onPress }: { notification: Notification; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={[styles.card, !notification.isRead && styles.unreadCard]}>
        <Text style={typography.bodyBold}>{notification.title}</Text>
        <Text style={typography.body}>{notification.body}</Text>
        <Text style={styles.time}>{formatRelative(notification.createdAt)}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  markAll: { color: colors.primary, fontWeight: '600' },
  card: { marginBottom: spacing.md },
  unreadCard: { borderColor: colors.primary, borderWidth: 1.5 },
  time: { ...typography.small, marginTop: spacing.xs },
  footerSpinner: { marginVertical: spacing.lg },
});
