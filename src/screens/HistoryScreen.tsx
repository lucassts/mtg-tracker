import React from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Match } from '../types';
import { Icon } from '../components/Icon';
import { MatchForm } from '../components/MatchForm';
import { useStore } from '../store/useStore';
import { useRecentDecks } from '../store/selectors';
import { useT } from '../i18n/useT';
import { useTabReset } from '../hooks/useTabReset';

function groupByDate(matches: Match[], locale: string) {
  const g: Record<string, Match[]> = {};
  matches.forEach(m => {
    const d = new Date(m.date);
    const key = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    if (!g[key]) g[key] = [];
    g[key].push(m);
  });
  return g;
}

export function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const h = t.history;
  const matches = useStore(s => s.matches);
  const settings = useStore(s => s.settings);
  const recentDecks = useRecentDecks();
  const updateMatch = useStore(s => s.updateMatch);
  const [editMatch, setEditMatch] = React.useState<Match | null>(null);

  // Tocar em "Partidas" fecha a edição aberta e volta para a lista.
  useTabReset(React.useCallback(() => setEditMatch(null), []));

  const locale = settings.language === 'ja-JP' ? 'ja-JP' : settings.language === 'en-US' ? 'en-US' : 'pt-BR';
  const grouped = React.useMemo(() => groupByDate(matches, locale), [matches, locale]);

  if (editMatch) {
    return (
      <View style={[styles.page, { paddingTop: insets.top }]}>
        <View style={styles.editHeader}>
          <Pressable style={styles.backBtn} onPress={() => setEditMatch(null)}>
            <Icon name="back" size={16} stroke={colors.ink} />
            <Text style={styles.backText}>{h.back}</Text>
          </Pressable>
          <Text style={styles.editDate}>
            {new Date(editMatch.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.formWrap}>
          <MatchForm
            initial={editMatch}
            settings={settings}
            recentDecks={recentDecks}
            onSave={(updated) => {
              updateMatch({ ...editMatch, ...updated } as Match);
              setEditMatch(null);
            }}
            onCancel={() => setEditMatch(null)}
            title={h.editTitle}
            subtitle={h.editSubtitle}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
      <View>
        <Text style={styles.pageTitle}>{h.title}</Text>
        <Text style={styles.subtitle}>{h.total(matches.length)}</Text>
      </View>

      {Object.entries(grouped).map(([day, ms]) => (
        <View key={day}>
          <Text style={styles.dateLabel}>{day}</Text>
          <View style={styles.card}>
            {ms.map((m, i) => (
              <Pressable
                key={m.id}
                onPress={() => setEditMatch(m)}
                style={[
                  styles.row,
                  i < ms.length - 1 && styles.rowBorder,
                ]}
              >
                <View style={[
                  styles.badge,
                  { backgroundColor: m.drew ? colors.line : m.won ? colors.goodSoft : colors.badSoft },
                ]}>
                  <Text style={[
                    styles.badgeText,
                    { color: m.drew ? colors.ink3 : m.won ? colors.good : colors.bad },
                  ]}>
                    {m.drew ? t.stats.drawn : m.won ? t.stats.wins : t.stats.losses}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{h.vs} {m.oppDeck || '—'}</Text>
                  <Text style={styles.rowSub}>
                    {m.myDeck} · {m.format} · {m.onPlay ? h.play : h.draw}
                  </Text>
                </View>
                <Icon name="edit" size={14} stroke={colors.ink4} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {matches.length === 0 && (
        <View style={[styles.card, { padding: 24, alignItems: 'center' }]}>
          <Text style={styles.emptyTitle}>{h.empty}</Text>
          <Text style={styles.emptySub}>{h.emptySub}</Text>
        </View>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14 },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink3,
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink3,
    marginBottom: 6,
    paddingLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter' },
  rowTitle: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter', color: colors.ink },
  rowSub: { fontSize: 11, fontFamily: 'Inter', color: colors.ink3, marginTop: 2 },
  editHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  backText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '500', color: colors.ink },
  editDate: { fontSize: 9.5, fontFamily: 'JetBrainsMono', color: colors.ink3 },
  formWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter', color: colors.ink },
  emptySub: { fontSize: 12, fontFamily: 'Inter', color: colors.ink3, marginTop: 4, textAlign: 'center' },
});
