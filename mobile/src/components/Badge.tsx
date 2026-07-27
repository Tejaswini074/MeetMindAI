import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../theme';

interface BadgeProps {
  label: string;
  color: string;
  backgroundColor?: string;
}

export function Badge({ label, color, backgroundColor }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: backgroundColor ?? `${color}22` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});
