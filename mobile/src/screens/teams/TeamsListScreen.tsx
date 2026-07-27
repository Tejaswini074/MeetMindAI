import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, EmptyState, Input, LoadingSpinner, ScreenContainer } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { useAcceptInvitationMutation, useCreateTeamMutation, useListTeamsQuery } from '../../api/teamsApi';
import type { TeamsStackParamList } from '../../navigation/types';
import type { Team } from '../../types/api';

type Props = NativeStackScreenProps<TeamsStackParamList, 'TeamsList'>;

export function TeamsListScreen({ navigation }: Props) {
  const { data: teams, isLoading, refetch, isFetching } = useListTeamsQuery();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  if (isLoading) return <LoadingSpinner />;

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={teams ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isFetching}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={typography.h1}>Teams</Text>
            <Pressable onPress={() => setJoinModalVisible(true)}>
              <Text style={styles.joinLink}>Have an invite?</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No teams yet" subtitle="Create a team to start scheduling meetings." />
        }
        renderItem={({ item }) => (
          <TeamRow team={item} onPress={() => navigation.navigate('TeamDetail', { teamId: item.id })} />
        )}
      />

      <Pressable style={styles.fab} onPress={() => setCreateModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      <CreateTeamModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} />
      <JoinTeamModal visible={joinModalVisible} onClose={() => setJoinModalVisible(false)} />
    </ScreenContainer>
  );
}

function TeamRow({ team, onPress }: { team: Team; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <Text style={typography.h3}>{team.name}</Text>
        {team.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {team.description}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

function CreateTeamModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createTeam, { isLoading }] = useCreateTeamMutation();

  const handleCreate = async () => {
    try {
      await createTeam({ name: name.trim(), description: description.trim() || undefined }).unwrap();
      setName('');
      setDescription('');
      onClose();
    } catch {
      // RTK Query error state not surfaced here; keep the modal open so the user can retry.
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <Text style={typography.h2}>New team</Text>
          <View style={styles.modalSpacing} />
          <Input label="Team name" value={name} onChangeText={setName} placeholder="Engineering" />
          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="What is this team working on?"
            multiline
          />
          <Button title="Create team" onPress={handleCreate} loading={isLoading} disabled={!name.trim()} />
          <Button title="Cancel" onPress={onClose} variant="ghost" style={styles.cancelButton} />
        </View>
      </View>
    </Modal>
  );
}

function JoinTeamModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [token, setToken] = useState('');
  const [acceptInvitation, { isLoading, error }] = useAcceptInvitationMutation();

  const handleJoin = async () => {
    // Accept either a bare token or a full "https://.../invitations/<token>" link.
    const extracted = token.trim().split('/').pop() ?? token.trim();
    try {
      await acceptInvitation(extracted).unwrap();
      setToken('');
      onClose();
    } catch {
      // surfaced via `error`
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <Text style={typography.h2}>Join a team</Text>
          <View style={styles.modalSpacing} />
          <Input
            label="Invitation link or code"
            value={token}
            onChangeText={setToken}
            placeholder="Paste the invite link you received by email"
            autoCapitalize="none"
          />
          {error && <Text style={styles.error}>That invitation is invalid or has expired.</Text>}
          <Button title="Join team" onPress={handleJoin} loading={isLoading} disabled={!token.trim()} />
          <Button title="Cancel" onPress={onClose} variant="ghost" style={styles.cancelButton} />
        </View>
      </View>
    </Modal>
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
  joinLink: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.sm },
  card: { marginBottom: spacing.md },
  description: { ...typography.caption, marginTop: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabIcon: { color: colors.textInverse, fontSize: 28, lineHeight: 30 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
  },
  modalSpacing: { height: spacing.md },
  cancelButton: { marginTop: spacing.sm },
});
