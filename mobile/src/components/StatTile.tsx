import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface StatTileProps {
  label: string;
  value: string | number;
  accent?: string;
}

/** A single headline number + label — the "stat tile" form for a KPI row. */
export function StatTile({ label, value, accent = colors.textPrimary }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  value: { fontSize: 28, fontWeight: '700' },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
});
