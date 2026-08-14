import React from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, Keyboard,
} from 'react-native';
import { colors } from '../theme/colors';
import { Format } from '../types';
import { getDeckSuggestions } from '../data/decks';
import { Icon } from './Icon';
import { useT } from '../i18n/useT';
import { useStore } from '../store/useStore';

interface DeckSelectorProps {
  value: string;
  onChange: (v: string) => void;
  format?: Format;
  recentDecks?: string[];
  placeholder?: string;
}

export function DeckSelector({
  value,
  onChange,
  format = 'Commander',
  recentDecks = [],
  placeholder,
}: DeckSelectorProps) {
  const t = useT();
  const ds = t.deckSelector;

  const [query, setQuery] = React.useState(value || '');
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => { setQuery(value || ''); }, [value]);

  const allSuggestions = getDeckSuggestions(format, recentDecks);
  const last5 = recentDecks.slice(0, 5);

  // Decks que a pessoa cadastrou, para separá-los da base de arquétipos
  // conhecidos — sem isso "Atraxa" seu e "Atraxa" do banco ficam idênticos.
  const myDecks = useStore(s => s.decks);
  const mine = React.useMemo(
    () => new Set(myDecks.filter(d => !d.archived).map(d => d.name.toLowerCase())),
    [myDecks]
  );

  const DeckRow = ({ deck }: { deck: string }) => (
    <Pressable onPress={() => select(deck)} style={styles.item}>
      <Text style={styles.itemText} numberOfLines={1}>{deck}</Text>
      {mine.has(deck.toLowerCase()) && (
        <View style={styles.mineTag}>
          <Text style={styles.mineTagText}>{ds.mine}</Text>
        </View>
      )}
    </Pressable>
  );

  const filtered = query.trim()
    ? allSuggestions.filter(d => d.toLowerCase().includes(query.toLowerCase()))
    : allSuggestions.slice(0, 12);

  const select = (deck: string) => {
    onChange(deck);
    setQuery(deck);
    setOpen(false);
    Keyboard.dismiss();
  };

  const createNew = () => {
    const val = query.trim() || ds.createFallback;
    onChange(val);
    setQuery(val);
    setOpen(false);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        placeholder={placeholder || 'Search or create deck…'}
        placeholderTextColor={colors.ink4}
        onFocus={() => setOpen(true)}
        onChangeText={text => { setQuery(text); onChange(text); setOpen(true); }}
        style={[styles.input, open && styles.inputOpen]}
        returnKeyType="done"
        onSubmitEditing={() => { if (query.trim()) select(query.trim()); }}
      />

      {/* Dropdown inline — sem position:absolute, sem Modal.
          Fica no fluxo do layout; a ScrollView pai acomoda naturalmente. */}
      {open && (
        <View style={styles.dropdown}>
          {/* Criar novo — sempre no topo */}
          <Pressable onPress={createNew} style={styles.createRow}>
            <Icon name="plus" size={14} stroke={colors.accent} />
            <Text style={styles.createText}>
              {ds.createLabel(query.trim() || ds.createFallback)}
            </Text>
          </Pressable>

          <ScrollView
            style={{ maxHeight: 200 }}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          >
            {!query.trim() && last5.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{ds.recent}</Text>
                {last5.map(d => <DeckRow key={d} deck={d} />)}
                <Text style={styles.sectionLabel}>{ds.allDecks}</Text>
              </>
            )}
            {filtered
              .filter(d => !last5.includes(d) || query.trim())
              .map(d => <DeckRow key={d} deck={d} />)}
            {filtered.length === 0 && (
              <Text style={styles.empty}>{ds.noResults}</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  input: {
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontFamily: 'Inter',
    color: colors.ink,
  },
  inputOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: colors.line2,
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.line,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  createText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    fontFamily: 'Inter',
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.ink3,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  mineTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  mineTagText: {
    fontSize: 8.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.5,
    paddingRight: 1,
    color: colors.accent,
  },
  itemText: {
    flex: 1,
    fontSize: 12,
    color: colors.ink,
    fontFamily: 'Inter',
  },
  empty: {
    padding: 12,
    fontSize: 12,
    color: colors.ink4,
    fontFamily: 'Inter',
  },
});
