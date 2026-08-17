import React from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Icon } from '../components/Icon';
import { Toggle } from '../components/Toggle';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { useKeyboardAware } from '../hooks/useKeyboardAware';

/** Limite de contadores próprios. Além disso a lista deixa de ser usável em mesa. */
const MAX_CUSTOM = 8;

export function CountersSettingsScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const cs = t.counterSettings;
  const { scrollProps, subirCampo, folga } = useKeyboardAware();

  const prefs = useStore(s => s.settings.counterPrefs);
  const setCounterPref = useStore(s => s.setCounterPref);
  const addCustomCounter = useStore(s => s.addCustomCounter);
  const updateCustomCounter = useStore(s => s.updateCustomCounter);
  const deleteCustomCounter = useStore(s => s.deleteCustomCounter);

  const [newName, setNewName] = React.useState('');

  const submit = () => {
    if (!newName.trim() || prefs.custom.length >= MAX_CUSTOM) return;
    addCustomCounter(newName);
    setNewName('');
  };

  const builtIn = [
    { key: 'poison' as const, label: cs.poison, sub: cs.poisonSub },
    { key: 'energy' as const, label: cs.energy, sub: cs.energySub },
    { key: 'experience' as const, label: cs.experience, sub: cs.experienceSub },
    { key: 'commanderDamage' as const, label: cs.commanderDamage, sub: cs.commanderDamageSub },
  ];

  return (
    <ScrollView
      {...scrollProps}
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable style={styles.backBtn} onPress={onBack}>
        <Icon name="back" size={16} stroke={colors.ink} />
        <Text style={styles.backText}>{cs.back}</Text>
      </Pressable>

      <Text style={styles.pageTitle}>{cs.title}</Text>
      <Text style={styles.intro}>{cs.intro}</Text>

      {/* Sempre visíveis */}
      <View>
        <Text style={styles.sectionLabel}>{cs.alwaysOnLabel}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{cs.mana}</Text>
              <Text style={styles.rowSub}>{cs.manaSub}</Text>
            </View>
            <Text style={styles.fixedTag}>{cs.fixed}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{cs.storm}</Text>
              <Text style={styles.rowSub}>{cs.stormSub}</Text>
            </View>
            <Text style={styles.fixedTag}>{cs.fixed}</Text>
          </View>
        </View>
      </View>

      {/* Opcionais */}
      <View>
        <Text style={styles.sectionLabel}>{cs.optionalLabel}</Text>
        <View style={styles.card}>
          {builtIn.map((item, i) => (
            <View key={item.key}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  <Text style={styles.rowSub}>{item.sub}</Text>
                </View>
                <Toggle
                  value={prefs[item.key]}
                  onValueChange={v => setCounterPref(item.key, v)}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Contadores próprios */}
      <View>
        <Text style={styles.sectionLabel}>{cs.customLabel}</Text>
        <View style={styles.card}>
          {prefs.custom.length === 0 && (
            <View style={[styles.row, { paddingVertical: 16 }]}>
              <Text style={styles.emptyText}>{cs.customEmpty}</Text>
            </View>
          )}

          {prefs.custom.map((cc, i) => (
            <View key={cc.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <TextInput
                  value={cc.name}
                  onChangeText={v => updateCustomCounter(cc.id, { name: v })}
                  style={styles.customInput}
                  maxLength={24}
                  onFocus={subirCampo}
                />
                <Pressable onPress={() => deleteCustomCounter(cc.id)} hitSlop={8}>
                  <Icon name="trash" size={16} stroke={colors.bad} />
                </Pressable>
                <Toggle
                  value={cc.enabled}
                  onValueChange={v => updateCustomCounter(cc.id, { enabled: v })}
                />
              </View>
            </View>
          ))}

          {prefs.custom.length < MAX_CUSTOM && (
            <>
              {prefs.custom.length > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={cs.customPlaceholder}
                  placeholderTextColor={colors.ink4}
                  style={styles.customInput}
                  maxLength={24}
                  onFocus={subirCampo}
                  onSubmitEditing={submit}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={submit}
                  disabled={!newName.trim()}
                  style={[styles.addBtn, !newName.trim() && styles.addBtnOff]}
                >
                  <Icon name="plus" size={14} stroke="#fff" />
                  <Text style={styles.addBtnText}>{cs.add}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
        <Text style={styles.footnote}>{cs.customFootnote}</Text>
      </View>

      <View style={{ height: 28 }} />
      <View style={{ height: folga }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
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
  emptyText: { fontSize: 12, fontFamily: 'Inter', color: colors.ink4 },
  customInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter',
    color: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.bg,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  addBtnOff: { opacity: 0.4 },
  addBtnText: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter', color: '#fff' },
  footnote: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: colors.ink4,
    lineHeight: 16,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
});
