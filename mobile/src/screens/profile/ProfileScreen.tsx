import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Card, Input, LoadingSpinner, ScreenContainer } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useAppSelector } from '../../store/hooks';
import { useGetMeQuery, useRegisterDeviceTokenMutation, useUpdateProfileMutation } from '../../api/usersApi';
import { useLogoutMutation } from '../../api/authApi';
import { registerForPushNotifications } from '../../services/pushNotifications';

export function ProfileScreen() {
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);
  const { data: user, isLoading } = useGetMeQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation();
  const [registerDeviceToken, { isLoading: registeringPush }] = useRegisterDeviceTokenMutation();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [pushStatus, setPushStatus] = useState<'idle' | 'enabled' | 'unavailable'>('idle');

  if (isLoading || !user) return <LoadingSpinner />;

  const handleSave = async () => {
    await updateProfile({ name: name.trim() || user.name });
    setEditing(false);
  };

  const handleEnablePush = async () => {
    const result = await registerForPushNotifications();
    if (!result) {
      setPushStatus('unavailable');
      return;
    }
    await registerDeviceToken({ fcmToken: result.token, platform: result.platform });
    setPushStatus('enabled');
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size={72} />
        <Text style={[typography.h1, styles.name]}>{user.name}</Text>
        <Text style={typography.caption}>{user.email}</Text>
        <Text style={styles.role}>{user.role.replace('_', ' ')}</Text>
      </View>

      <Card style={styles.section}>
        <Text style={typography.h3}>Profile</Text>
        {editing ? (
          <>
            <Input label="Name" value={name} onChangeText={setName} placeholder={user.name} />
            <Button title="Save" onPress={handleSave} loading={saving} />
            <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} style={styles.spaceTop} />
          </>
        ) : (
          <Button
            title="Edit name"
            variant="ghost"
            onPress={() => {
              setName(user.name);
              setEditing(true);
            }}
          />
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={typography.h3}>Push notifications</Text>
        <Text style={typography.caption}>
          Register this device to receive push notifications for task assignments and meeting reminders.
        </Text>
        <Button
          title={pushStatus === 'enabled' ? 'Push notifications enabled' : 'Enable push notifications'}
          variant="ghost"
          onPress={handleEnablePush}
          loading={registeringPush}
          disabled={pushStatus === 'enabled'}
          style={styles.spaceTop}
        />
        {pushStatus === 'unavailable' && (
          <Text style={styles.error}>Push notifications require a physical device and granted permission.</Text>
        )}
      </Card>

      <Button
        title="Log out"
        variant="danger"
        onPress={() => refreshToken && logout({ refreshToken })}
        loading={loggingOut}
        style={styles.logout}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.xl },
  name: { marginTop: spacing.md },
  role: { ...typography.small, marginTop: spacing.xs, color: colors.primary, fontWeight: '700' },
  section: { marginBottom: spacing.lg },
  spaceTop: { marginTop: spacing.sm },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  logout: { marginTop: spacing.md },
});
