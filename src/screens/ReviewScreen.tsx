import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Badge } from '../components/Badge';
import { Icon } from '../components/Icon';
import { MatchForm } from '../components/MatchForm';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';

export function ReviewScreen() {
  const navigation = useNavigation<any>();
  const t = useT();
  const r = t.review;
  const settings = useStore(s => s.settings);
  const recentDecks = useStore(s => s.getRecentDecks());
  const addMatch = useStore(s => s.addMatch);
  const pendingReview = useStore(s => s.pendingReview);
  const setPendingReview = useStore(s => s.setPendingReview);

  const handleSave = (match: any) => {
    addMatch({
      format: settings.defaultFormat,
      myDeck: '',
      oppDeck: '',
      archetype: 'Midrange',
      onPlay: false,
      won: true,
      notes: '',
      ...match,
    });
    setPendingReview(null);
    navigation.navigate('History');
  };

  const handleCancel = () => {
    setPendingReview(null);
    navigation.goBack();
  };

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleCancel}>
          <Icon name="back" size={16} stroke={colors.ink} />
          <Text style={styles.backText}>{r.reRecord}</Text>
        </Pressable>
        <Badge label={r.extractedLocally} />
      </View>

      {/* Transcript */}
      {pendingReview && (
        <View style={styles.transcriptWrap}>
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptLabel}>
              {r.transcript} · {fmtDuration(pendingReview.duration)}
            </Text>
            <Text style={styles.transcriptText}>
              "{pendingReview.transcript}"
            </Text>
          </View>
        </View>
      )}

      {/* Form */}
      <View style={styles.formWrap}>
        <MatchForm
          initial={pendingReview?.extracted}
          settings={settings}
          recentDecks={recentDecks}
          conf={pendingReview?.confidence}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: {
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
  backText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: colors.ink,
  },
  transcriptWrap: { paddingHorizontal: 20, paddingTop: 10 },
  transcriptCard: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  transcriptLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ink3,
    marginBottom: 5,
  },
  transcriptText: {
    fontSize: 11,
    color: colors.ink2,
    lineHeight: 16,
    fontStyle: 'italic',
    fontFamily: 'Inter',
  },
  formWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 10, minHeight: 0 },
});
