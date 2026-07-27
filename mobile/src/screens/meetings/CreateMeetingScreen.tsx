import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, ScreenContainer, SelectModal } from '../../components';
import type { SelectOption } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useCreateMeetingMutation } from '../../api/meetingsApi';
import { useListTeamsQuery } from '../../api/teamsApi';
import { formatDateTime } from '../../utils/date';
import type { MeetingsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MeetingsStackParamList, 'CreateMeeting'>;

type RecurrenceOption = 'NONE' | 'FREQ=DAILY' | 'FREQ=WEEKLY' | 'FREQ=MONTHLY';

const RECURRENCE_OPTIONS: SelectOption<RecurrenceOption>[] = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'FREQ=DAILY', label: 'Daily' },
  { value: 'FREQ=WEEKLY', label: 'Weekly' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
];

export function CreateMeetingScreen({ navigation, route }: Props) {
  const { data: teams } = useListTeamsQuery();
  const [teamId, setTeamId] = useState<string | undefined>(route.params?.teamId ?? teams?.[0]?.id);
  const [teamPickerVisible, setTeamPickerVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [showPicker, setShowPicker] = useState<'date' | 'time' | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceOption>('NONE');
  const [recurrenceModalVisible, setRecurrenceModalVisible] = useState(false);

  const [createMeeting, { isLoading, error }] = useCreateMeetingMutation();

  const teamOptions: SelectOption<string>[] = (teams ?? []).map((t) => ({ value: t.id, label: t.name }));
  const selectedTeam = teams?.find((t) => t.id === teamId);

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(null);
    if (event.type === 'dismissed' || !date) return;
    setScheduledAt(date);
  };

  const handleSubmit = async () => {
    if (!teamId) return;
    try {
      const meeting = await createMeeting({
        teamId,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: Number(durationMinutes) || 30,
        recurrenceRule: recurrence === 'NONE' ? undefined : recurrence,
      }).unwrap();
      navigation.replace('MeetingDetail', { meetingId: meeting.id });
    } catch {
      // surfaced via `error`
    }
  };

  return (
    <ScreenContainer scroll>
      <Text style={[typography.h1, styles.title]}>New meeting</Text>

      <Text style={styles.label}>Team</Text>
      <Pressable style={styles.selectField} onPress={() => setTeamPickerVisible(true)}>
        <Text style={typography.body}>{selectedTeam?.name ?? 'Select a team'}</Text>
      </Pressable>
      <SelectModal
        visible={teamPickerVisible}
        title="Select a team"
        options={teamOptions}
        selectedValue={teamId}
        onSelect={setTeamId}
        onClose={() => setTeamPickerVisible(false)}
      />

      <Input label="Title" value={title} onChangeText={setTitle} placeholder="Sprint planning" />
      <Input
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="What's this meeting about?"
        multiline
      />

      <Text style={styles.label}>When</Text>
      <View style={styles.row}>
        <Pressable style={[styles.selectField, styles.rowItem]} onPress={() => setShowPicker('date')}>
          <Text style={typography.body}>{formatDateTime(scheduledAt.toISOString()).split(' · ')[0]}</Text>
        </Pressable>
        <Pressable style={[styles.selectField, styles.rowItem]} onPress={() => setShowPicker('time')}>
          <Text style={typography.body}>{formatDateTime(scheduledAt.toISOString()).split(' · ')[1]}</Text>
        </Pressable>
      </View>
      {showPicker && (
        <DateTimePicker
          value={scheduledAt}
          mode={showPicker}
          is24Hour={false}
          onChange={handlePickerChange}
        />
      )}

      <Input
        label="Duration (minutes)"
        value={durationMinutes}
        onChangeText={setDurationMinutes}
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Repeat</Text>
      <Pressable style={styles.selectField} onPress={() => setRecurrenceModalVisible(true)}>
        <Text style={typography.body}>
          {RECURRENCE_OPTIONS.find((o) => o.value === recurrence)?.label}
        </Text>
      </Pressable>
      <SelectModal
        visible={recurrenceModalVisible}
        title="Repeat"
        options={RECURRENCE_OPTIONS}
        selectedValue={recurrence}
        onSelect={setRecurrence}
        onClose={() => setRecurrenceModalVisible(false)}
      />

      {error && <Text style={styles.error}>Could not create the meeting. Please try again.</Text>}

      <Button
        title="Schedule meeting"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={!teamId || !title.trim()}
        style={styles.submit}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  label: { ...typography.caption, marginBottom: spacing.xs },
  selectField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },
  error: { color: colors.danger, marginBottom: spacing.md },
  submit: { marginTop: spacing.sm },
});
