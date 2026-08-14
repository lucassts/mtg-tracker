import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface BadgeProps {
  label: string;
  dot?: boolean;
  dotColor?: string;
  style?: object;
}

export function Badge({ label, dot = true, dotColor = colors.good, style }: BadgeProps) {
  return (
    <View style={[styles.badge, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  label: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ink2,
  },
});
