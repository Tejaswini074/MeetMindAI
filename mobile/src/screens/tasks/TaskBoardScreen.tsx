import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Badge, Button, Card, Input, LoadingSpinner, ScreenContainer, SelectModal } from '../../components';
import type { SelectOption } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { useCreateTaskMutation, useGetBoardQuery, useMoveTaskMutation } from '../../api/tasksApi';
import { useListTeamMembersQuery } from '../../api/teamsApi';
import { useTaskBoardSocket } from '../../hooks/useTaskBoardSocket';
import { priorityColor, priorityLabels, taskStatusColor, taskStatusLabels, taskStatusOrder } from '../../utils/statusMaps';
import type { TasksStackParamList } from '../../navigation/types';
import type { Task, TaskPriority, TaskStatus } from '../../types/api';

type Props = NativeStackScreenProps<TasksStackParamList, 'TaskBoard'>;

export function TaskBoardScreen({ route, navigation }: Props) {
  const { teamId, teamName } = route.params;
  const { data: tasks, isLoading } = useGetBoardQuery(teamId);
  const [moveTask] = useMoveTaskMutation();
  const [movingTask, setMovingTask] = useState<Task | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  useTaskBoardSocket(teamId);

  useEffect(() => {
    navigation.setOptions({ title: teamName });
  }, [navigation, teamName]);

  if (isLoading) return <LoadingSpinner />;

  const columns = taskStatusOrder.map((status) => ({
    status,
    tasks: (tasks ?? []).filter((t) => t.status === status),
  }));

  const moveOptions: SelectOption<TaskStatus>[] = taskStatusOrder.map((s) => ({
    value: s,
    label: taskStatusLabels[s],
    color: taskStatusColor(s),
  }));

  return (
    <ScreenContainer padded={false}>
      <ScrollView horizontal contentContainerStyle={styles.board} showsHorizontalScrollIndicator={false}>
        {columns.map((col) => (
          <View key={col.status} style={styles.column}>
            <View style={styles.columnHeader}>
              <Badge label={taskStatusLabels[col.status]} color={taskStatusColor(col.status)} />
              <Text style={typography.caption}>{col.tasks.length}</Text>
            </View>
            <ScrollView>
              {col.tasks.map((task) => (
                <Pressable
                  key={task.id}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                  onLongPress={() => setMovingTask(task)}
                >
                  <Card style={styles.taskCard}>
                    <Text style={typography.bodyBold} numberOfLines={2}>{task.title}</Text>
                    <View style={styles.taskMetaRow}>
                      <Badge label={priorityLabels[task.priority]} color={priorityColor(task.priority)} />
                    </View>
                    {task.assignee && <Text style={typography.small}>{task.assignee.name}</Text>}
                    <Pressable onPress={() => setMovingTask(task)} style={styles.moveLink}>
                      <Text style={styles.moveLinkText}>Move →</Text>
                    </Pressable>
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setCreateModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      <SelectModal
        visible={!!movingTask}
        title="Move task to…"
        options={moveOptions}
        selectedValue={movingTask?.status}
        onSelect={(status) => {
          if (movingTask) moveTask({ id: movingTask.id, teamId, status });
        }}
        onClose={() => setMovingTask(null)}
      />

      <CreateTaskModal
        visible={createModalVisible}
        teamId={teamId}
        onClose={() => setCreateModalVisible(false)}
      />
    </ScreenContainer>
  );
}

function CreateTaskModal({ visible, teamId, onClose }: { visible: boolean; teamId: string; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [priorityModalVisible, setPriorityModalVisible] = useState(false);
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const { data: members } = useListTeamMembersQuery(teamId, { skip: !visible });

  const priorityOptions: SelectOption<TaskPriority>[] = (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map(
    (p) => ({ value: p, label: priorityLabels[p], color: priorityColor(p) }),
  );

  const handleCreate = async () => {
    try {
      await createTask({ teamId, title: title.trim(), priority }).unwrap();
      setTitle('');
      setPriority('MEDIUM');
      onClose();
    } catch {
      // keep modal open so the user can retry
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <Text style={typography.h2}>New task</Text>
          <View style={styles.modalSpacing} />
          <Input label="Title" value={title} onChangeText={setTitle} placeholder="Draft the follow-up email" />
          <Text style={styles.label}>Priority</Text>
          <Pressable style={styles.selectField} onPress={() => setPriorityModalVisible(true)}>
            <Text style={typography.body}>{priorityLabels[priority]}</Text>
          </Pressable>
          <Text style={typography.caption}>{members?.length ?? 0} team members available to assign later</Text>
          <Button title="Create task" onPress={handleCreate} loading={isLoading} disabled={!title.trim()} style={styles.spaceTop} />
          <Button title="Cancel" onPress={onClose} variant="ghost" style={styles.spaceTop} />
        </View>
      </View>
      <SelectModal
        visible={priorityModalVisible}
        title="Priority"
        options={priorityOptions}
        selectedValue={priority}
        onSelect={setPriority}
        onClose={() => setPriorityModalVisible(false)}
      />
    </Modal>
  );
}

const COLUMN_WIDTH = 260;

const styles = StyleSheet.create({
  board: { padding: spacing.lg },
  column: { width: COLUMN_WIDTH, marginRight: spacing.md },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  taskCard: { marginBottom: spacing.md },
  taskMetaRow: { marginTop: spacing.sm },
  moveLink: { marginTop: spacing.sm },
  moveLinkText: { ...typography.small, color: colors.primary, fontWeight: '600' },
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
  },
  fabIcon: { color: colors.textInverse, fontSize: 28, lineHeight: 30 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl },
  modalSpacing: { height: spacing.md },
  label: { ...typography.caption, marginBottom: spacing.xs },
  selectField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  spaceTop: { marginTop: spacing.sm },
});
