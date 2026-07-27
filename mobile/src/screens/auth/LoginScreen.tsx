import React, { useState } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, Input, Button } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useLoginMutation } from '../../api/authApi';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, { isLoading, error }] = useLoginMutation();

  const handleSubmit = async () => {
    try {
      await login({ email: email.trim().toLowerCase(), password }).unwrap();
    } catch {
      // error surfaced via `error` below
    }
  };

  return (
    <ScreenContainer scroll>
      <Text style={[typography.h1, styles.title]}>Welcome back</Text>
      <Text style={[typography.caption, styles.subtitle]}>Log in to MeetMind</Text>

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
        placeholder="••••••••"
      />

      {error && <Text style={styles.error}>Invalid email or password.</Text>}

      <Button
        title="Log in"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={!email || !password}
        style={styles.button}
      />

      <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkWrap}>
        <Text style={typography.caption}>
          Don&apos;t have an account? <Text style={styles.link}>Sign up</Text>
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
