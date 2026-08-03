import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, EmptyState, LoadingSpinner, ScreenContainer, StatTile } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import {
  useGetAiUsageAnalyticsQuery,
  useGetDashboardAnalyticsQuery,
  useGetMeetingsAnalyticsQuery,
  useGetTasksAnalyticsQuery,
} from '../../api/analyticsApi';
import {
  aiFeatureLabels,
  priorityColor,
  priorityLabels,
  taskStatusColor,
  taskStatusLabels,
  taskStatusOrder,
} from '../../utils/statusMaps';
import type { TeamsStackParamList } from '../../navigation/types';
import type { TaskPriority, TaskStatus } from '../../types/api';

type Props = NativeStackScreenProps<TeamsStackParamList, 'AnalyticsDashboard'>;

export function AnalyticsDashboardScreen({ route }: Props) {
  const teamId = route.params?.teamId;
  const teamName = route.params?.teamName;
  const args = teamId ? { teamId } : undefined;

  const { data: dashboard, isLoading: loadingDashboard } = useGetDashboardAnalyticsQuery(args);
  const { data: meetingsStats, isLoading: loadingMeetings } = useGetMeetingsAnalyticsQuery(args);
  const { data: tasksStats, isLoading: loadingTasks } = useGetTasksAnalyticsQuery(args);
  const { data: aiUsage, isLoading: loadingAiUsage } = useGetAiUsageAnalyticsQuery(args);

  if (loadingDashboard || loadingMeetings || loadingTasks || loadingAiUsage) {
    return <LoadingSpinner />;
  }

  if (!dashboard) {
    return <EmptyState title="No data available" subtitle="Analytics will appear once there's activity to measure." />;
  }

  const recentWeeks = (meetingsStats?.countByWeek ?? []).slice(-8);
  const maxWeekCount = Math.max(1, ...recentWeeks.map((w) => w.count));

  const statusCounts = new Map(dashboard.tasksByStatus.map((s) => [s.status, s.count]));
  const priorityCounts = new Map((tasksStats?.byPriority ?? []).map((p) => [p.priority, p.count]));
  const maxStatusCount = Math.max(1, ...dashboard.tasksByStatus.map((s) => s.count));
  const maxPriorityCount = Math.max(1, ...(tasksStats?.byPriority ?? []).map((p) => p.count));

  return (
    <ScreenContainer scroll>
      <Text style={typography.h1}>{teamName ?? 'Analytics'}</Text>
      <Text style={styles.subtitle}>
        {teamName ? 'Team overview' : 'Across all your teams'}
      </Text>

      <View style={styles.kpiRow}>
        <StatTile label="Total meetings" value={dashboard.totalMeetings} />
        <StatTile label="Meetings this month" value={dashboard.meetingsThisMonth} />
        <StatTile label="Upcoming" value={dashboard.upcomingMeetings} accent={colors.info} />
        <StatTile label="Total tasks" value={dashboard.totalTasks} />
        <StatTile label="Action items" value={dashboard.totalActionItems} />
        <StatTile label="AI tokens used" value={formatCompact(aiUsage?.totalTokensUsed ?? 0)} accent={colors.primary} />
      </View>

      <Card style={styles.section}>
        <Text style={typography.h3}>Task completion</Text>
        <Meter value={dashboard.taskCompletionRate} />
        {tasksStats && tasksStats.overdueCount > 0 && (
          <Text style={styles.overdue}>{tasksStats.overdueCount} task{tasksStats.overdueCount === 1 ? '' : 's'} overdue</Text>
        )}
      </Card>

      {recentWeeks.length > 0 && (
        <Card style={styles.section}>
          <Text style={typography.h3}>Meetings per week</Text>
          <View style={styles.spaceTop}>
            {recentWeeks.map((w) => (
              <BarRow
                key={w.week}
                label={formatWeekLabel(w.week)}
                value={w.count}
                fraction={w.count / maxWeekCount}
                color={colors.primary}
              />
            ))}
          </View>
        </Card>
      )}

      <Card style={styles.section}>
        <Text style={typography.h3}>Tasks by status</Text>
        <View style={styles.spaceTop}>
          {taskStatusOrder.map((status: TaskStatus) => (
            <BarRow
              key={status}
              label={taskStatusLabels[status]}
              value={statusCounts.get(status) ?? 0}
              fraction={(statusCounts.get(status) ?? 0) / maxStatusCount}
              color={taskStatusColor(status)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={typography.h3}>Tasks by priority</Text>
        <View style={styles.spaceTop}>
          {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((priority) => (
            <BarRow
              key={priority}
              label={priorityLabels[priority]}
              value={priorityCounts.get(priority) ?? 0}
              fraction={(priorityCounts.get(priority) ?? 0) / maxPriorityCount}
              color={priorityColor(priority)}
            />
          ))}
        </View>
      </Card>

      {!!aiUsage?.byFeature.length && (
        <Card style={styles.section}>
          <Text style={typography.h3}>AI usage by feature</Text>
          <View style={styles.spaceTop}>
            {aiUsage.byFeature.map((f) => (
              <View key={f.feature} style={styles.aiUsageRow}>
                <Text style={typography.body}>{aiFeatureLabels[f.feature]}</Text>
                <Text style={typography.caption}>
                  {f.count} call{f.count === 1 ? '' : 's'} · {formatCompact(f.tokensUsed)} tokens
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}
    </ScreenContainer>
  );
}

/** Meter: fill = accent, track = a lighter step of the same hue, so completion reads across the whole bar. */
function Meter({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.spaceTop}>
      <View style={meterStyles.track}>
        <View style={[meterStyles.fill, { width: `${clamped}%` }]} />
      </View>
      <Text style={meterStyles.value}>{clamped}% complete</Text>
    </View>
  );
}

/** A labeled, proportional-length bar with the value always shown as text (never color-alone). */
function BarRow({ label, value, fraction, color }: { label: string; value: number; fraction: number; color: string }) {
  return (
    <View style={barRowStyles.row}>
      <Text style={barRowStyles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={barRowStyles.track}>
        <View style={[barRowStyles.fill, { width: `${Math.max(4, fraction * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={barRowStyles.value}>{value}</Text>
    </View>
  );
}

function formatWeekLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

const styles = StyleSheet.create({
  subtitle: { ...typography.caption, marginTop: spacing.xs, marginBottom: spacing.lg },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  section: { marginBottom: spacing.lg },
  spaceTop: { marginTop: spacing.md },
  overdue: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  aiUsageRow: { marginBottom: spacing.sm },
});

const meterStyles = StyleSheet.create({
  track: { height: 12, borderRadius: radius.pill, backgroundColor: colors.primaryLight, overflow: 'hidden' },
  fill: { height: 12, borderRadius: radius.pill, backgroundColor: colors.primary },
  value: { ...typography.caption, marginTop: spacing.xs },
});

const barRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  label: { ...typography.caption, width: 90 },
  track: { flex: 1, height: 10, borderRadius: radius.pill, backgroundColor: colors.background, marginHorizontal: spacing.sm, overflow: 'hidden' },
  fill: { height: 10, borderRadius: radius.pill },
  value: { ...typography.small, width: 28, textAlign: 'right' },
});
