import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface DeckRow {
  l: string;
  wins: number;
  losses: number;
  wr: number;
}

export function DeckList({ rows }: { rows: DeckRow[] }) {
  if (!rows || !rows.length) {
    return (
      <Text style={styles.empty}>Nenhuma partida com esses filtros.</Text>
    );
  }
  return (
    <View style={styles.container}>
      {rows.map((r, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{r.l}</Text>
          <Text style={styles.record}>{r.wins}V · {r.losses}D</Text>
          <Text style={[styles.wr, { color: r.wr >= 50 ? colors.good : colors.bad }]}>
            {r.wr}%
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1, fontSize: 12, fontWeight: '500', fontFamily: 'Inter', color: colors.ink },
  record: { fontFamily: 'JetBrainsMono', fontSize: 10, color: colors.ink3 },
  wr: { width: 48, textAlign: 'right', fontFamily: 'Inter', fontSize: 13, fontWeight: '700' },
  empty: { fontSize: 11, color: colors.ink4, padding: 8, fontFamily: 'Inter' },
});
