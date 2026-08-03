import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Badge, Card, EmptyState, Input, LoadingSpinner, ScreenContainer } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useLazySearchQuery } from '../../api/searchApi';
import type { SearchResult } from '../../types/api';

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  meeting: 'Meeting',
  transcript: 'Transcript',
  summary: 'Summary',
  task: 'Task',
};

export function SearchScreen() {
  // Results can point into either the Meetings or Tasks tab's stack — see the
  // same note in NotificationsListScreen for why this is loosely typed.
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const [query, setQuery] = useState('');
  const [triggerSearch, { data, isFetching, isUninitialized }] = useLazySearchQuery();

  const handleSearch = () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    triggerSearch({ q: trimmed });
  };

  const handlePress = (result: SearchResult) => {
    if (result.type === 'task') {
      navigation.navigate('TasksTab');
      navigation.navigate('TaskDetail', { taskId: result.id });
    } else if (result.meetingId) {
      navigation.navigate('MeetingsTab');
      navigation.navigate('MeetingDetail', { meetingId: result.meetingId });
    }
  };

  const combined = [...(data?.fulltext ?? []), ...(data?.semantic ?? [])];
  // De-dupe: the same meeting/transcript can legitimately surface in both result sets.
  const seen = new Set<string>();
  const results = combined.filter((r) => {
    const key = `${r.type}:${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <ScreenContainer padded={false}>
      <View style={styles.searchBar}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search meetings, transcripts, summaries, tasks…"
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
          style={styles.input}
        />
      </View>

      {isFetching ? (
        <LoadingSpinner fullScreen={false} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            isUninitialized ? (
              <EmptyState
                title="Search across everything"
                subtitle="Full-text and AI semantic search across meetings, transcripts, summaries, and tasks you have access to."
              />
            ) : (
              <EmptyState title="No results" subtitle="Try a different phrase, or a shorter one." />
            )
          }
          renderItem={({ item }) => <ResultRow result={item} onPress={() => handlePress(item)} />}
        />
      )}
    </ScreenContainer>
  );
}

function ResultRow({ result, onPress }: { result: SearchResult; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={typography.bodyBold} numberOfLines={1}>{result.title}</Text>
          <Badge label={TYPE_LABELS[result.type]} color={colors.info} />
        </View>
        <Text style={styles.snippet} numberOfLines={2}>
          {result.snippet}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBar: { padding: spacing.lg, paddingBottom: 0 },
  input: { marginBottom: 0 },
  list: { padding: spacing.lg, flexGrow: 1 },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  snippet: { ...typography.caption, marginTop: spacing.xs },
});
