import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Match, Settings, MatchConfidence, ConfidenceLevel } from '../types';
import { colors } from '../theme/colors';
import { SegmentedControl } from './SegmentedControl';
import { DeckSelector } from './DeckSelector';
import { Icon } from './Icon';
import { DatePickerModal } from './DatePickerModal';
import { useT } from '../i18n/useT';
import { getArchetypeForDeck } from '../data/decks';

interface MatchFormProps {
  initial?: Partial<Match>;
  settings: Settings;
  recentDecks?: string[];
  onSave: (match: Partial<Match>) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  conf?: MatchConfidence;
}

function ConfBadge({ level }: { level?: ConfidenceLevel }) {
  if (!level || level === 'high') return null;
  const map: Record<string, { label: string; color: string; bg: string }> = {
    default: { label: 'DEFAULT', color: colors.ink3, bg: colors.bg2 },
    low: { label: 'LOW CONF', color: '#b45309', bg: '#fef3c7' },
    missing: { label: 'MISSING', color: colors.bad, bg: colors.badSoft },
  };
  const m = map[level];
  if (!m) return null;
  return (
    <View style={[styles.confBadge, { backgroundColor: m.bg }]}>
      <Text style={[styles.confText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

function Field({ label, confKey, conf, children }: {
  label: string; confKey?: keyof MatchConfidence;
  conf?: MatchConfidence; children: React.ReactNode;
}) {
  const level = confKey && conf ? conf[confKey] : undefined;
  const highlight = level === 'low' || level === 'missing';
  return (
    <View style={[styles.field, highlight && styles.fieldHighlight]}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {confKey && <ConfBadge level={level} />}
      </View>
      {children}
    </View>
  );
}


export function MatchForm({
  initial,
  settings,
  recentDecks = [],
  onSave,
  onCancel,
  title,
  subtitle,
  conf = {},
}: MatchFormProps) {
  const t = useT();
  const mf = t.matchForm;
  const resolvedTitle = title ?? mf.defaultTitle;
  const resolvedSubtitle = subtitle ?? mf.defaultSubtitle;
  const [match, setMatch] = React.useState<Partial<Match>>({
    won: true,
    drew: false,
    format: settings.defaultFormat,
    myDeck: settings.defaultDeck || '',
    oppDeck: '',
    archetype: 'Midrange',
    onPlay: false,
    notes: '',
    date: new Date().toISOString(),
    ...initial,
  });

  const [showDatePicker, setShowDatePicker] = React.useState(false);

  const set = (k: keyof Match, v: any) => setMatch(m => ({ ...m, [k]: v }));

  // Auto-preenche arquétipo a partir da database quando oppDeck muda
  React.useEffect(() => {
    if (match.oppDeck) {
      const archetype = getArchetypeForDeck(match.oppDeck);
      if (archetype) setMatch(m => ({ ...m, archetype }));
    }
  }, [match.oppDeck]);

  const currentDate = match.date ? new Date(match.date) : new Date();
  const locale = settings.language === 'ja-JP' ? 'ja-JP' : settings.language === 'en-US' ? 'en-US' : 'pt-BR';
  const formattedDate = currentDate.toLocaleDateString(locale, {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const lowCount = Object.values(conf).filter(c => c === 'low' || c === 'missing').length;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{resolvedTitle}</Text>
          <Text style={styles.subtitle}>
            {lowCount > 0
              ? `${mf.needsAttention(lowCount)}${resolvedSubtitle}`
              : resolvedSubtitle}
          </Text>
        </View>

        {/* Date */}
        <Field label={mf.date} confKey={undefined} conf={conf}>
          <Pressable onPress={() => setShowDatePicker(true)} style={styles.datePressable}>
            <Icon name="list" size={16} stroke={colors.ink3} />
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Icon name="chev" size={14} stroke={colors.ink4} />
          </Pressable>
          <DatePickerModal
            visible={showDatePicker}
            value={currentDate}
            onChange={(date) => set('date', date.toISOString())}
            onClose={() => setShowDatePicker(false)}
          />
        </Field>

        {/* Result */}
        <Field label={mf.result} confKey="won" conf={conf}>
          <SegmentedControl
            options={[
              { label: mf.win, value: 'win' },
              { label: mf.drew, value: 'draw' },
              { label: mf.loss, value: 'loss' },
            ]}
            value={match.drew ? 'draw' : match.won ? 'win' : 'loss'}
            onChange={v => {
              if (v === 'win') setMatch(m => ({ ...m, won: true, drew: false }));
              else if (v === 'draw') setMatch(m => ({ ...m, won: false, drew: true }));
              else setMatch(m => ({ ...m, won: false, drew: false }));
            }}
          />
        </Field>

        {/* Format */}
        <Field label={mf.format} confKey="format" conf={conf}>
          <SegmentedControl
            options={['Commander', 'Modern', 'Standard', 'Pioneer', 'Legacy', 'Other']}
            value={match.format || 'Commander'}
            onChange={v => set('format', v as any)}
            fontSize={10}
          />
        </Field>

        {/* My deck */}
        <Field label={mf.myDeck} confKey="myDeck" conf={conf}>
          <DeckSelector
            value={match.myDeck || ''}
            onChange={v => set('myDeck', v)}
            format={match.format as any}
            recentDecks={recentDecks}
          />
        </Field>

        {/* Opponent deck */}
        <Field label={mf.oppDeck} confKey="oppDeck" conf={conf}>
          <DeckSelector
            value={match.oppDeck || ''}
            onChange={v => set('oppDeck', v)}
            format={match.format as any}
            recentDecks={recentDecks}
            placeholder={mf.oppDeckPlaceholder}
          />
        </Field>

        {/* Play / Draw */}
        <Field label={mf.playDraw} confKey="onPlay" conf={conf}>
          <SegmentedControl
            options={[{ label: mf.play, value: 'true' }, { label: mf.draw, value: 'false' }]}
            value={String(match.onPlay)}
            onChange={v => set('onPlay', v === 'true')}
          />
        </Field>

        {/* Notes */}
        <Field label={mf.notes} conf={conf}>
          <TextInput
            value={match.notes || ''}
            onChangeText={v => set('notes', v)}
            placeholder={mf.notesPlaceholder}
            placeholderTextColor={colors.ink4}
            multiline
            style={styles.textarea}
          />
        </Field>

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={styles.btnCancel} onPress={onCancel}>
          <Text style={styles.btnCancelText}>{mf.cancel}</Text>
        </Pressable>
        <Pressable style={styles.btnSave} onPress={() => onSave(match)}>
          <Icon name="check" size={16} stroke="#fff" />
          <Text style={styles.btnSaveText}>{mf.save}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  header: { marginBottom: 14 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.ink3,
    marginTop: 4,
    fontFamily: 'Inter',
  },
  field: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  fieldHighlight: { backgroundColor: '#fffbf0' },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ink3,
  },
  confBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  confText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.5,
  },
  datePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  dateText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: colors.ink,
  },
  textarea: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontFamily: 'Inter',
    color: colors.ink,
    height: 64,
    lineHeight: 18,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: colors.ink2,
  },
  btnSave: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnSaveText: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#fff',
  },
});
