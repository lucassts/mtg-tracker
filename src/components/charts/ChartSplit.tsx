import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface ChartSplitProps {
  left: number;
  right: number;
  leftLabel?: string;
  rightLabel?: string;
  w?: number;
}

/** Uma linha de barra horizontal com label, barra proporcional (0-100%) e valor */
function WrBarRow({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const isGood = pct >= 50;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { flex: pct, backgroundColor: isGood ? colors.good : colors.bad },
          ]}
        />
        {/* Espaço vazio restante */}
        <View style={{ flex: 100 - pct }} />
      </View>
      <Text style={[styles.pct, { color: isGood ? colors.good : colors.bad }]}>
        {pct}%
      </Text>
    </View>
  );
}

export function ChartSplit({
  left,
  right,
  leftLabel = 'Começa',
  rightLabel = 'Saca',
}: ChartSplitProps) {
  return (
    <View style={styles.wrap}>
      <WrBarRow label={leftLabel} value={left} />
      <WrBarRow label={rightLabel} value={right} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    width: 68,
    fontSize: 10,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.ink3,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.line,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 5,
  },
  pct: {
    width: 36,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});
