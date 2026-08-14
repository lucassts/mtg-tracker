import React from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { DeckSelector } from '../components/DeckSelector';
import { Toggle } from '../components/Toggle';
import { Badge } from '../components/Badge';
import { Format } from '../types';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';

const FORMATS = [
  { l: 'Commander', s: 'EDH · 4p' },
  { l: 'Modern', s: '1v1' },
  { l: 'Standard', s: '1v1' },
  { l: 'Pioneer', s: '1v1' },
  { l: 'Legacy', s: '1v1' },
  { l: 'Pauper', s: '1v1' },
  { l: 'Draft', s: 'Limited' },
  { l: 'Other', s: '—' },
];

function Dots({ step }: { step: number }) {
  return (
    <View style={styles.dots}>
      {[1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={[
            styles.dot,
            i === step ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const o = t.onboarding;
  const [step, setStep] = React.useState(1);
  const [fmt, setFmt] = React.useState<Format>('Commander');
  const [deck, setDeck] = React.useState('');
  const [share, setShare] = React.useState(true);
  const updateSettings = useStore(s => s.updateSettings);

  const next = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      updateSettings({
        defaultFormat: fmt,
        defaultDeck: deck,
        shareAnon: share,
        onboarded: true,
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <>
            <Badge label={o.badge} />
            <Text style={styles.h1}>{o.step1Title}</Text>
            <Text style={styles.body}>{o.step1Body}</Text>
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{o.step1HowLabel}</Text>
              <Text style={styles.cardBody}>{o.step1How}</Text>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepLabel}>{o.step2Label}</Text>
            <Text style={styles.h2}>{o.step2Title}</Text>
            <Text style={styles.body2}>{o.step2Body}</Text>
            <View style={styles.formatGrid}>
              {FORMATS.map(f => (
                <Pressable
                  key={f.l}
                  onPress={() => setFmt(f.l as Format)}
                  style={[
                    styles.formatBtn,
                    fmt === f.l && styles.formatBtnActive,
                  ]}
                >
                  <Text style={[styles.formatLabel, fmt === f.l && styles.formatLabelActive]}>
                    {f.l}
                  </Text>
                  <Text style={styles.formatSub}>{f.s}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.stepLabel}>{o.step3Label}</Text>
            <Text style={styles.h2}>{o.step3Title}</Text>
            <Text style={styles.body2}>{o.step3Body}</Text>
            <DeckSelector
              value={deck}
              onChange={setDeck}
              format={fmt}
              recentDecks={[]}
              placeholder={t.settings.defaultDeckPlaceholder}
            />
            <View style={[styles.card, { backgroundColor: colors.surface2 }]}>
              <Text style={styles.cardBody}>
                <Text style={{ fontWeight: '700' }}>Dica — </Text>
                {o.step3Tip}
              </Text>
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.stepLabel}>{o.step4Label}</Text>
            <Text style={styles.h2}>{o.step4Title}</Text>
            <Text style={styles.body2}>{o.step4Body}</Text>
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>{o.step4ToggleTitle}</Text>
                  <Text style={[styles.body2, { marginTop: 4 }]}>{o.step4ToggleBody}</Text>
                </View>
                <Toggle value={share} onValueChange={setShare} />
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface2 }]}>
              <Text style={styles.sectionLabel}>{o.step4WhatLabel}</Text>
              <Text style={styles.monoText}>{o.step4What}</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/*
        O app desenha por baixo das barras do sistema (edge-to-edge, padrão da
        SDK 54). Sem a folga de baixo, o botão fica atrás dos botões do Android.
      */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Dots step={step} />
        <Pressable style={styles.cta} onPress={next}>
          <Text style={styles.ctaText}>
            {step === 4 ? o.start : o.continue}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    paddingTop: 28,
    gap: 16,
  },
  h1: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
    lineHeight: 34,
    color: colors.ink,
    marginVertical: 4,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
    lineHeight: 28,
    color: colors.ink,
  },
  body: {
    fontSize: 14,
    color: colors.ink2,
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  body2: {
    fontSize: 12,
    color: colors.ink3,
    lineHeight: 18,
    fontFamily: 'Inter',
  },
  stepLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ink3,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: 8,
  },
  cardBody: {
    fontSize: 12,
    color: colors.ink2,
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  sectionLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ink3,
  },
  monoText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    color: colors.ink2,
    lineHeight: 18,
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatBtn: {
    width: '47%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  formatBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
    color: colors.ink,
  },
  formatLabelActive: { fontWeight: '600' },
  formatSub: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink3,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: colors.ink,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  dotActive: { width: 20, backgroundColor: colors.ink },
  dotInactive: { width: 6, backgroundColor: colors.ink5 },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  cta: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: '#fff',
  },
});
