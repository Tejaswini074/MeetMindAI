import React, { useState } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, Input, Button } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useRegisterMutation } from '../../api/authApi';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, { isLoading, error }] = useRegisterMutation();

  const handleSubmit = async () => {
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password }).unwrap();
    } catch {
      // error surfaced via `error` below
    }
  };

  return (
    <ScreenContainer scroll>
      <Text style={[typography.h1, styles.title]}>Create your account</Text>
      <Text style={[typography.caption, styles.subtitle]}>
        Join MeetMind to start capturing your meetings
      </Text>

      <Input label="Full name" value={name} onChangeText={setName} placeholder="Ada Lovelace" />
      <Input
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
      />
      <Input
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
      />

      {error && (
        <Text style={styles.error}>
          {'status' in error && error.status === 409
            ? 'An account with this email already exists.'
            : 'Something went wrong. Please try again.'}
        </Text>
      )}

      <Button
        title="Sign up"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={!name || !email || password.length < 8}
        style={styles.button}
      />

      <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
        <Text style={typography.caption}>
          Already have an account? <Text style={styles.link}>Log in</Text>
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xxl },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.xl },
  button: { marginTop: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.md },
  linkWrap: { marginTop: spacing.lg, alignItems: 'center' },
  link: { color: colors.primary, fontWeight: '600' },
});
