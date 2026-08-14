import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Icon } from '../components/Icon';
import { Toggle } from '../components/Toggle';
import { useStore } from '../store/useStore';
import { SharePrefs } from '../types';
import { useT } from '../i18n/useT';

/**
 * O que entra na imagem gerada em Estatísticas → compartilhar.
 *
 * Mesma ideia da tela de contadores: o app não decide por você o que vira
 * público. Aqui a diferença é que dois blocos carregam nome de terceiro —
 * oponente e local — então eles ficam marcados como tal.
 */
export function ShareSettingsScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const ss = t.shareSettings;

  const prefs = useStore(s => s.settings.sharePrefs);
  const setSharePref = useStore(s => s.setSharePref);

  const rows: { key: keyof SharePrefs; label: string; sub: string; thirdParty?: boolean }[] = [
    { key: 'context', label: ss.context, sub: ss.contextSub },
    { key: 'record', label: ss.record, sub: ss.recordSub },
    { key: 'streak', label: ss.streak, sub: ss.streakSub },
    { key: 'playDraw', label: ss.playDraw, sub: ss.playDrawSub },
    { key: 'decks', label: ss.decks, sub: ss.decksSub },
    { key: 'oppDecks', label: ss.oppDecks, sub: ss.oppDecksSub },
    { key: 'oppPlayers', label: ss.oppPlayers, sub: ss.oppPlayersSub, thirdParty: true },
    { key: 'venues', label: ss.venues, sub: ss.venuesSub, thirdParty: true },
  ];

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable style={styles.backBtn} onPress={onBack}>
        <Icon name="back" size={16} stroke={colors.ink} />
        <Text style={styles.backText}>{ss.back}</Text>
      </Pressable>

      <Text style={styles.pageTitle}>{ss.title}</Text>
      <Text style={styles.intro}>{ss.intro}</Text>

      <View>
        <Text style={styles.sectionLabel}>{ss.alwaysOnLabel}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{ss.winRate}</Text>
              <Text style={styles.rowSub}>{ss.winRateSub}</Text>
            </View>
            <Text style={styles.fixedTag}>{ss.fixed}</Text>
          </View>
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>{ss.optionalLabel}</Text>
        <View style={styles.card}>
          {rows.map((item, i) => (
            <View key={item.key}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.rowTitle}>{item.label}</Text>
                    {item.thirdParty && (
                      <View style={styles.warnTag}>
                        <Text style={styles.warnTagText}>{ss.thirdParty}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.rowSub}>{item.sub}</Text>
                </View>
                <Toggle
                  value={prefs[item.key]}
                  onValueChange={v => setSharePref(item.key, v)}
                />
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.footnote}>{ss.footnote}</Text>
      </View>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '500', color: colors.ink },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  intro: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: colors.ink3,
    lineHeight: 18,
    marginTop: -6,
  },
  sectionLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink3,
    paddingHorizontal: 8,
    paddingBottom: 6,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: 1, backgroundColor: colors.line2 },
  rowTitle: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter', color: colors.ink },
  rowSub: { fontSize: 11, fontFamily: 'Inter', color: colors.ink3, marginTop: 2 },
  fixedTag: {
    fontSize: 9,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink4,
  },
  warnTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.badSoft,
  },
  warnTagText: {
    fontSize: 8.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.5,
    paddingRight: 1,
    color: colors.bad,
  },
  footnote: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: colors.ink4,
    lineHeight: 16,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
});
