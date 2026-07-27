import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar, Badge, Button, Card, Input, LoadingSpinner, ScreenContainer } from '../../components';
import { colors, spacing, typography } from '../../theme';
import {
  useAddTaskAttachmentMutation,
  useAddTaskCommentMutation,
  useDeleteTaskMutation,
  useGetTaskQuery,
} from '../../api/tasksApi';
import { formatDateTime, formatRelative } from '../../utils/date';
import { priorityColor, priorityLabels, taskStatusColor, taskStatusLabels } from '../../utils/statusMaps';
import type { TasksStackParamList } from '../../navigation/types';
import type { TaskComment } from '../../types/api';

type Props = NativeStackScreenProps<TasksStackParamList, 'TaskDetail'>;

export function TaskDetailScreen({ route, navigation }: Props) {
  const { taskId } = route.params;
  const { data: task, isLoading } = useGetTaskQuery(taskId);
  const [comment, setComment] = useState('');
  const [addComment, { isLoading: commenting }] = useAddTaskCommentMutation();
  const [addAttachment, { isLoading: attaching }] = useAddTaskAttachmentMutation();
  const [deleteTask, { isLoading: deleting }] = useDeleteTaskMutation();

  if (isLoading || !task) return <LoadingSpinner />;

  const handleComment = async () => {
    if (!comment.trim()) return;
    await addComment({ taskId, content: comment.trim() });
    setComment('');
  };

  const handleAttach = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await addAttachment({
      taskId,
      file: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' },
    });
  };

  const handleDelete = async () => {
    await deleteTask({ id: taskId, teamId: task.teamId }).unwrap();
    navigation.goBack();
  };

  return (
    <ScreenContainer scroll>
      <Text style={typography.h1}>{task.title}</Text>
      <View style={styles.badgeRow}>
        <Badge label={taskStatusLabels[task.status]} color={taskStatusColor(task.status)} />
        <Badge label={priorityLabels[task.priority]} color={priorityColor(task.priority)} />
      </View>
      {task.description ? <Text style={styles.description}>{task.description}</Text> : null}

      <View style={styles.infoRow}>
        <Text style={typography.caption}>Assignee: {task.assignee?.name ?? 'Unassigned'}</Text>
        <Text style={typography.caption}>Due: {task.dueDate ? formatDateTime(task.dueDate) : 'No due date'}</Text>
      </View>

      <Card style={styles.section}>
        <Text style={typography.h3}>Attachments ({task.attachments?.length ?? 0})</Text>
        {task.attachments?.map((a) => (
          <Text key={a.id} style={styles.attachmentLine}>
            📎 {a.originalName}
          </Text>
        ))}
        <Button title="Add attachment" variant="ghost" onPress={handleAttach} loading={attaching} style={styles.spaceTop} />
      </Card>

      <Card style={styles.section}>
        <Text style={typography.h3}>Comments ({task.comments?.length ?? 0})</Text>
        <FlatList
          data={task.comments ?? []}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => <CommentRow comment={item} />}
        />
        <Input value={comment} onChangeText={setComment} placeholder="Add a comment…" style={styles.spaceTop} />
        <Button title="Post comment" onPress={handleComment} loading={commenting} disabled={!comment.trim()} />
      </Card>

      <Pressable onPress={handleDelete} style={styles.deleteLink}>
        <Text style={styles.deleteLinkText}>{deleting ? 'Deleting…' : 'Delete task'}</Text>
      </Pressable>
    </ScreenContainer>
  );
}

function CommentRow({ comment }: { comment: TaskComment }) {
  return (
    <View style={styles.commentRow}>
      <Avatar name={comment.user.name} avatarUrl={comment.user.avatarUrl} size={28} />
      <View style={styles.commentBody}>
        <Text style={typography.bodyBold}>{comment.user.name}</Text>
        <Text style={typography.body}>{comment.content}</Text>
        <Text style={typography.small}>{formatRelative(comment.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  description: { ...typography.body, marginTop: spacing.md },
  infoRow: { marginTop: spacing.md, gap: spacing.xs },
  section: { marginTop: spacing.lg },
  attachmentLine: { ...typography.body, marginTop: spacing.xs },
  spaceTop: { marginTop: spacing.md },
  commentRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  commentBody: { flex: 1 },
  deleteLink: { marginTop: spacing.xl, marginBottom: spacing.xl, alignItems: 'center' },
  deleteLinkText: { color: colors.danger, fontWeight: '600' },
});
