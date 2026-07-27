import React from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, EmptyState, LoadingSpinner, ScreenContainer } from '../../components';
import { spacing, typography } from '../../theme';
import { useListTeamsQuery } from '../../api/teamsApi';
import type { TasksStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TasksStackParamList, 'TeamPicker'>;

export function TeamPickerScreen({ navigation }: Props) {
  const { data: teams, isLoading } = useListTeamsQuery();

  if (isLoading) return <LoadingSpinner />;

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={teams ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={[typography.h1, styles.header]}>Boards</Text>}
        ListEmptyComponent={<EmptyState title="No teams yet" subtitle="Join or create a team to see its board." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('TaskBoard', { teamId: item.id, teamName: item.name })}>
            <Card style={styles.card}>
              <Text style={typography.h3}>{item.name}</Text>
              <Text style={typography.caption}>View Kanban board</Text>
            </Card>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, flexGrow: 1 },
  header: { marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
});
