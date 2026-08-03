import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar, Badge, Button, Input, LoadingSpinner, ScreenContainer } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useGetTeamQuery, useInviteTeamMemberMutation, useListTeamMembersQuery } from '../../api/teamsApi';
import type { TeamsStackParamList } from '../../navigation/types';
import type { TeamMember } from '../../types/api';

type Props = NativeStackScreenProps<TeamsStackParamList, 'TeamDetail'>;

export function TeamDetailScreen({ route, navigation }: Props) {
  const { teamId } = route.params;
  const { data: team, isLoading: teamLoading } = useGetTeamQuery(teamId);
  const { data: members, isLoading: membersLoading } = useListTeamMembersQuery(teamId);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTeamMember, { isLoading: inviting, isSuccess, error }] = useInviteTeamMemberMutation();

  if (teamLoading || membersLoading) return <LoadingSpinner />;

  const handleInvite = async () => {
    try {
      await inviteTeamMember({ teamId, email: inviteEmail.trim().toLowerCase() }).unwrap();
      setInviteEmail('');
    } catch {
      // surfaced via `error`
    }
  };

  return (
    <ScreenContainer scroll>
      <Text style={typography.h1}>{team?.name}</Text>
      {team?.description ? <Text style={styles.description}>{team.description}</Text> : null}

      <Text style={[typography.h3, styles.sectionTitle]}>Members ({members?.length ?? 0})</Text>
      <FlatList
        data={members ?? []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => <MemberRow member={item} />}
      />

      <Text style={[typography.h3, styles.sectionTitle]}>Invite a member</Text>
      <Input
        label="Email address"
        autoCapitalize="none"
        keyboardType="email-address"
        value={inviteEmail}
        onChangeText={setInviteEmail}
        placeholder="teammate@company.com"
      />
      {error && <Text style={styles.error}>Could not send invitation. Check the email and try again.</Text>}
      {isSuccess && <Text style={styles.success}>Invitation sent!</Text>}
      <Button title="Send invite" onPress={handleInvite} loading={inviting} disabled={!inviteEmail.trim()} />

      <Button
        title="View analytics"
        variant="ghost"
        onPress={() => navigation.navigate('AnalyticsDashboard', { teamId, teamName: team?.name })}
        style={styles.analyticsButton}
      />
    </ScreenContainer>
  );
}

function MemberRow({ member }: { member: TeamMember }) {
  return (
    <View style={styles.memberRow}>
      <Avatar name={member.user.name} avatarUrl={member.user.avatarUrl} />
      <View style={styles.memberInfo}>
        <Text style={typography.bodyBold}>{member.user.name}</Text>
        <Text style={typography.caption}>{member.user.email}</Text>
      </View>
      <Badge
        label={member.role}
        color={member.role === 'LEAD' ? colors.primary : colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  description: { ...typography.caption, marginTop: spacing.sm },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  memberInfo: { flex: 1, marginLeft: spacing.md },
  analyticsButton: { marginTop: spacing.xl },
  error: { color: colors.danger, marginBottom: spacing.sm },
  success: { color: colors.success, marginBottom: spacing.sm },
});
