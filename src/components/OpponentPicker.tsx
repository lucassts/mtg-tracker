import React from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';

interface Props {
  valueId?: string;
  valueName?: string;
  onChange: (id: string | undefined, name: string | undefined) => void;
}

/**
 * Escolhe contra quem foi a partida.
 *
 * Aceita criar na hora, porque anotar o oponente não pode custar uma viagem
 * a outra tela no meio de um torneio. O vínculo com a conta dele, quando
 * existir, se faz em Configurações → Oponentes.
 */
export function OpponentPicker({ valueId, valueName, onChange }: Props) {
  const t = useT();
  const op = t.opponentPicker;

  const opponents = useStore(s => s.opponents);
  const matches = useStore(s => s.matches);
  const addOpponent = useStore(s => s.addOpponent);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  /** Ordena por quem você mais enfrenta — é quem você vai escolher de novo. */
  const ordered = React.useMemo(() => {
    const counts = new Map<string, number>();
    matches.forEach(m => {
      if (m.opponentId) counts.set(m.opponentId, (counts.get(m.opponentId) ?? 0) + 1);
    });
    return [...opponents].sort(
      (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)
        || a.nickname.localeCompare(b.nickname)
    );
  }, [opponents, matches]);

  const filtered = query.trim()
    ? ordered.filter(o => o.nickname.toLowerCase().includes(query.trim().toLowerCase()))
    : ordered.slice(0, 8);

  const pick = (id: string, name: string) => {
    onChange(id, name);
    setOpen(false);
    setQuery('');
  };

  const createAndPick = () => {
    const created = addOpponent(query);
    if (created) pick(created.id, created.nickname);
  };

  if (!open) {
    return (
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Icon name="users" size={16} stroke={valueName ? colors.ink : colors.ink4} />
        <Text style={[styles.triggerText, !valueName && styles.triggerEmpty]}>
          {valueName || op.placeholder}
        </Text>
        {valueName ? (
          <Pressable onPress={() => onChange(undefined, undefined)} hitSlop={10}>
            <Icon name="x" size={15} stroke={colors.ink4} />
          </Pressable>
        ) : (
          <Icon name="chev" size={14} stroke={colors.ink4} />
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.panel}>
      <TextInput
        autoFocus
        value={query}
        onChangeText={setQuery}
        placeholder={op.searchPlaceholder}
        placeholderTextColor={colors.ink4}
        style={styles.input}
        onSubmitEditing={() => { if (query.trim()) createAndPick(); }}
        returnKeyType="done"
      />

      <ScrollView style={styles.list} keyboardShouldPersistTaps="always" nestedScrollEnabled>
        {filtered.map(o => (
          <Pressable key={o.id} style={styles.item} onPress={() => pick(o.id, o.nickname)}>
            <Text style={styles.itemName}>{o.nickname}</Text>
            {o.linkState === 'linked' && (
              <View style={styles.linkedTag}>
                <Text style={styles.linkedTagText}>{op.linked}</Text>
              </View>
            )}
          </Pressable>
        ))}
        {filtered.length === 0 && !query.trim() && (
          <Text style={styles.empty}>{op.empty}</Text>
        )}
      </ScrollView>

      {!!query.trim() && !ordered.some(
        o => o.nickname.toLowerCase() === query.trim().toLowerCase()
      ) && (
        <Pressable style={styles.createBtn} onPress={createAndPick}>
          <Icon name="plus" size={14} stroke="#fff" />
          <Text style={styles.createBtnText}>{op.create(query.trim())}</Text>
        </Pressable>
      )}

      <Pressable style={styles.cancel} onPress={() => { setOpen(false); setQuery(''); }}>
        <Text style={styles.cancelText}>{op.cancel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.line, borderRadius: 8,
    backgroundColor: colors.surface,
  },
  triggerText: { flex: 1, fontSize: 13, fontFamily: 'Inter', color: colors.ink },
  triggerEmpty: { color: colors.ink4 },

  panel: {
    borderWidth: 1, borderColor: colors.line, borderRadius: 10,
    backgroundColor: colors.surface, padding: 12, gap: 8,
  },
  input: {
    fontSize: 13, fontFamily: 'Inter', color: colors.ink,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: colors.line, borderRadius: 8,
    backgroundColor: colors.bg,
  },
  list: { maxHeight: 170 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 9, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
  itemName: { flex: 1, fontSize: 13, fontFamily: 'Inter', color: colors.ink },
  linkedTag: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 999, backgroundColor: colors.goodSoft,
  },
  linkedTagText: {
    fontSize: 9, fontFamily: 'JetBrainsMono', letterSpacing: 0.5,
    textTransform: 'uppercase', color: colors.good,
  },
  empty: { fontSize: 12, fontFamily: 'Inter', color: colors.ink4, paddingVertical: 10 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 10,
  },
  createBtnText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '600', color: '#fff' },
  cancel: { alignItems: 'center', paddingVertical: 4 },
  cancelText: { fontSize: 12, fontFamily: 'Inter', color: colors.ink3 },
});
